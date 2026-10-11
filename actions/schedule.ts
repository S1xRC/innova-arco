"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createShiftTemplateSchema,
  shiftTemplateIdSchema,
  updateShiftTemplateSchema,
  zodFieldErrors,
} from "@/lib/validation";
import type { ActionState } from "@/types/actions";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

const UNIQUE_VIOLATION = "23505";

function revalidateSchedule() {
  revalidatePath("/mining/schedule");
  revalidatePath("/mining/shifts");
  revalidatePath("/mining/videos");
  revalidatePath("/mining");
}

/**
 * Removes the occurrences of a schedule entry that are **future and free**
 * (no recording assigned). Occurrences holding a recording — or already marked
 * as deleted — are never touched, so changing a schedule can never leak or lose
 * a recording.
 */
async function clearFutureFreeOccurrences(
  supabase: Client,
  templateId: string,
): Promise<void> {
  await supabase
    .from("shifts")
    .delete()
    .eq("template_id", templateId)
    .is("matched_video_id", null)
    .is("video_deleted_at", null)
    .gte("starts_at", new Date().toISOString());
}

/** How many occurrences of this schedule entry already hold a recording. */
async function countRecordedOccurrences(
  supabase: Client,
  templateId: string,
): Promise<number> {
  const { count } = await supabase
    .from("shifts")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId)
    .not("matched_video_id", "is", null);

  return count ?? 0;
}

function parseTemplateForm(formData: FormData) {
  return {
    driverUserId: String(formData.get("driverUserId") ?? ""),
    licensePlate: String(formData.get("licensePlate") ?? ""),
    weekday: String(formData.get("weekday") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

/** Mining company adds an entry to the weekly schedule. */
export async function createShiftTemplateAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireCompany("MINING");

  const parsed = createShiftTemplateSchema.safeParse(parseTemplateForm(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del horario.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("company_id", profile.companyId)
    .eq("user_id", parsed.data.driverUserId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!membership) {
    return {
      status: "error",
      message: "Ese conductor no pertenece a tu empresa.",
    };
  }

  const { error } = await supabase.from("shift_templates").insert({
    mining_id: profile.companyId,
    driver_user_id: parsed.data.driverUserId,
    license_plate: parsed.data.licensePlate,
    weekday: parsed.data.weekday,
    start_time: parsed.data.startTime,
    notes: parsed.data.notes || null,
    created_by: profile.id,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message:
          "Ya existe un horario igual para ese conductor (mismo día, hora y patente).",
      };
    }

    console.error("[ARCO] createShiftTemplateAction:", error.message);
    return { status: "error", message: "No fue posible guardar el horario." };
  }

  await supabase.rpc("generate_shift_occurrences", {
    p_mining_id: profile.companyId,
  });

  revalidateSchedule();

  return { status: "success", message: "Horario agregado." };
}

/** Mining company edits an existing schedule entry. */
export async function updateShiftTemplateAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireCompany("MINING");

  const parsed = updateShiftTemplateSchema.safeParse({
    ...parseTemplateForm(formData),
    templateId: String(formData.get("templateId") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del horario.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { data: template } = await supabase
    .from("shift_templates")
    .select("id, mining_id")
    .eq("id", parsed.data.templateId)
    .maybeSingle();

  if (!template || template.mining_id !== profile.companyId) {
    return { status: "error", message: "El horario no es válido." };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("company_id", profile.companyId)
    .eq("user_id", parsed.data.driverUserId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!membership) {
    return {
      status: "error",
      message: "Ese conductor no pertenece a tu empresa.",
    };
  }

  // Occurrences that already hold a recording are preserved untouched.
  const kept = await countRecordedOccurrences(supabase, template.id);
  await clearFutureFreeOccurrences(supabase, template.id);

  const { error } = await supabase
    .from("shift_templates")
    .update({
      driver_user_id: parsed.data.driverUserId,
      license_plate: parsed.data.licensePlate,
      weekday: parsed.data.weekday,
      start_time: parsed.data.startTime,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", template.id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message:
          "Ya existe un horario igual para ese conductor (mismo día, hora y patente).",
      };
    }

    console.error("[ARCO] updateShiftTemplateAction:", error.message);
    return { status: "error", message: "No fue posible guardar el horario." };
  }

  await supabase.rpc("generate_shift_occurrences", {
    p_mining_id: profile.companyId,
  });

  revalidateSchedule();

  return {
    status: "success",
    message:
      kept > 0
        ? `Horario actualizado. Se conservaron ${kept} turno(s) con grabación asignada.`
        : "Horario actualizado.",
  };
}

/** Pauses / resumes a schedule entry without losing its history. */
export async function toggleShiftTemplateAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireCompany("MINING");

  const parsed = shiftTemplateIdSchema.safeParse({
    templateId: String(formData.get("templateId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "El horario no es válido." };
  }

  const supabase = await createClient();

  const { data: template } = await supabase
    .from("shift_templates")
    .select("id, mining_id, active")
    .eq("id", parsed.data.templateId)
    .maybeSingle();

  if (!template || template.mining_id !== profile.companyId) {
    return { status: "error", message: "El horario no es válido." };
  }

  const nextActive = !template.active;

  if (!nextActive) {
    await clearFutureFreeOccurrences(supabase, template.id);
  }

  const { error } = await supabase
    .from("shift_templates")
    .update({ active: nextActive, updated_at: new Date().toISOString() })
    .eq("id", template.id);

  if (error) {
    return { status: "error", message: "No fue posible actualizar el horario." };
  }

  if (nextActive) {
    await supabase.rpc("generate_shift_occurrences", {
      p_mining_id: profile.companyId,
    });
  }

  revalidateSchedule();

  return {
    status: "success",
    message: nextActive
      ? "Horario reactivado."
      : "Horario pausado (los turnos con grabación se conservan).",
  };
}

/** Removes a schedule entry. Recorded occurrences are kept as history. */
export async function deleteShiftTemplateAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireCompany("MINING");

  const parsed = shiftTemplateIdSchema.safeParse({
    templateId: String(formData.get("templateId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "El horario no es válido." };
  }

  const supabase = await createClient();

  const { data: template } = await supabase
    .from("shift_templates")
    .select("id, mining_id")
    .eq("id", parsed.data.templateId)
    .maybeSingle();

  if (!template || template.mining_id !== profile.companyId) {
    return { status: "error", message: "El horario no es válido." };
  }

  const kept = await countRecordedOccurrences(supabase, template.id);
  await clearFutureFreeOccurrences(supabase, template.id);

  const { error } = await supabase
    .from("shift_templates")
    .delete()
    .eq("id", template.id);

  if (error) {
    console.error("[ARCO] deleteShiftTemplateAction:", error.message);
    return { status: "error", message: "No fue posible eliminar el horario." };
  }

  revalidateSchedule();

  return {
    status: "success",
    message:
      kept > 0
        ? `Horario eliminado. Se conservaron ${kept} turno(s) con grabación asignada.`
        : "Horario eliminado.",
  };
}

/** Generates the dated occurrences for the rolling window. */
export async function generateOccurrencesAction(
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;

  const profile = await requireCompany("MINING");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("generate_shift_occurrences", {
    p_mining_id: profile.companyId,
  });

  if (error) {
    console.error("[ARCO] generateOccurrencesAction:", error.message);
    return { status: "error", message: "No fue posible generar los turnos." };
  }

  revalidateSchedule();

  const created = typeof data === "number" ? data : 0;

  return {
    status: "success",
    message:
      created > 0
        ? `Se generaron ${created} turno(s).`
        : "No había turnos nuevos por generar.",
  };
}
