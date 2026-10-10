"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { combineDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  createVideoMetadataSchema,
  resolveDeletionSchema,
  zodFieldErrors,
} from "@/lib/validation";
import type { ActionState } from "@/types/actions";

/**
 * Manual ingestion of video metadata (simulates the future cameras API).
 * Provider-only: the row is always attached to the provider's own company.
 */
export async function createVideoMetadataAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireRole(["PROVIDER"]);

  if (!profile.companyId) {
    return {
      status: "error",
      message: "Tu cuenta de proveedor no tiene una empresa asociada.",
    };
  }

  const parsed = createVideoMetadataSchema.safeParse({
    licensePlate: String(formData.get("licensePlate") ?? ""),
    recordedDate: String(formData.get("recordedDate") ?? ""),
    recordedTime: String(formData.get("recordedTime") ?? ""),
    driverEmail: String(formData.get("driverEmail") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos ingresados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const recordedAt = combineDateTime(
    parsed.data.recordedDate,
    parsed.data.recordedTime,
  );

  if (!recordedAt) {
    return {
      status: "error",
      message: "La fecha o la hora no son válidas.",
      fieldErrors: {
        recordedDate: "Fecha u hora inválida",
      },
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("video_metadata").insert({
    provider_id: profile.companyId,
    driver_email: parsed.data.driverEmail,
    license_plate: parsed.data.licensePlate,
    recorded_at: recordedAt.toISOString(),
  });

  if (error) {
    console.error("[ARCO] Error al insertar video_metadata:", error.message);
    return {
      status: "error",
      message: "No fue posible guardar el registro. Intenta nuevamente.",
    };
  }

  revalidatePath("/provider");
  revalidatePath("/provider/upload");

  return {
    status: "success",
    message: `Registro de la patente ${parsed.data.licensePlate} guardado correctamente.`,
  };
}

/** Provider marks a pending ARCO request as resolved. */
export async function resolveDeletionRequestAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["PROVIDER"]);

  const parsed = resolveDeletionSchema.safeParse({
    requestId: String(formData.get("requestId") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "La solicitud seleccionada no es válida.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("deletion_requests")
    .update({ status: "DELETED" })
    .eq("id", parsed.data.requestId)
    .eq("status", "PENDING")
    .select("id");

  if (error) {
    console.error("[ARCO] Error al resolver solicitud:", error.message);
    return {
      status: "error",
      message: "No fue posible actualizar la solicitud. Intenta nuevamente.",
    };
  }

  if (!updated || updated.length === 0) {
    return {
      status: "error",
      message: "La solicitud ya fue resuelta o no pertenece a tu empresa.",
    };
  }

  revalidatePath("/provider");
  revalidatePath("/provider/claims");
  revalidatePath("/mining");

  return {
    status: "success",
    message: "Solicitud marcada como resuelta correctamente.",
  };
}
