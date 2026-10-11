"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { combineDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { createShiftSchema, shiftIdSchema, zodFieldErrors } from "@/lib/validation";
import type { ActionState } from "@/types/actions";

const UNIQUE_VIOLATION = "23505";

/** Mining company schedules a shift for one of its drivers. */
export async function createShiftAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId || profile.companyType !== "MINING") {
    return {
      status: "error",
      message: "Solo una empresa minera puede definir turnos.",
    };
  }

  const parsed = createShiftSchema.safeParse({
    driverUserId: String(formData.get("driverUserId") ?? ""),
    licensePlate: String(formData.get("licensePlate") ?? ""),
    shiftDate: String(formData.get("shiftDate") ?? ""),
    shiftTime: String(formData.get("shiftTime") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del turno.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const startsAt = combineDateTime(parsed.data.shiftDate, parsed.data.shiftTime);

  if (!startsAt) {
    return {
      status: "error",
      message: "La fecha u hora del turno no son válidas.",
    };
  }

  const supabase = await createClient();

  // The driver must be an active member of this mining company.
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

  const { error } = await supabase.from("shifts").insert({
    mining_id: profile.companyId,
    driver_user_id: parsed.data.driverUserId,
    license_plate: parsed.data.licensePlate,
    starts_at: startsAt.toISOString(),
    notes: parsed.data.notes || null,
    created_by: profile.id,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "Ya existe un turno para ese conductor, patente y hora.",
      };
    }

    console.error("[ARCO] createShiftAction:", error.message);
    return { status: "error", message: "No fue posible crear el turno." };
  }

  revalidatePath("/mining/shifts");
  revalidatePath("/mining");

  return {
    status: "success",
    message: `Turno creado para la patente ${parsed.data.licensePlate}.`,
  };
}

/** Mining company removes a shift. */
export async function deleteShiftAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId || profile.companyType !== "MINING") {
    return { status: "error", message: "No autorizado." };
  }

  const parsed = shiftIdSchema.safeParse({
    shiftId: String(formData.get("shiftId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "El turno no es válido." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", parsed.data.shiftId)
    .eq("mining_id", profile.companyId);

  if (error) {
    return { status: "error", message: "No fue posible eliminar el turno." };
  }

  revalidatePath("/mining/shifts");
  revalidatePath("/mining");

  return { status: "success", message: "Turno eliminado." };
}
