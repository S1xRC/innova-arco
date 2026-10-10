"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { sendDeletionNotification } from "@/lib/email/resend";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requestDeletionSchema, zodFieldErrors } from "@/lib/validation";
import type { ActionState } from "@/types/actions";

const UNIQUE_VIOLATION = "23505";

/**
 * Driver exercises their ARCO right to erasure on one of their video records.
 * Creates the `deletion_request` and notifies the provider by email.
 * The email is best-effort: the request is persisted even if delivery fails.
 */
export async function requestDeletionAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireRole(["DRIVER"]);

  const parsed = requestDeletionSchema.safeParse({
    videoId: String(formData.get("videoId") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "El registro seleccionado no es válido.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { data: video, error: videoError } = await supabase
    .from("video_metadata")
    .select("id, license_plate, recorded_at, provider_id")
    .eq("id", parsed.data.videoId)
    .maybeSingle();

  if (videoError || !video) {
    return {
      status: "error",
      message: "No encontramos ese registro entre tus videos.",
    };
  }

  const { data: request, error: insertError } = await supabase
    .from("deletion_requests")
    .insert({
      video_id: video.id,
      driver_id: profile.id,
      status: "PENDING",
    })
    .select("id, created_at")
    .single();

  if (insertError) {
    if (insertError.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "Ya existe una solicitud de borrado para este registro.",
      };
    }

    return {
      status: "error",
      message: "No fue posible registrar la solicitud. Intenta nuevamente.",
    };
  }

  // Notify the provider (best-effort).
  const { data: provider } = await supabase
    .from("companies")
    .select("name, support_email")
    .eq("id", video.provider_id)
    .maybeSingle();

  const notified = await maybeNotifyProvider({
    requestId: request.id,
    requestedAt: request.created_at,
    providerName: provider?.name ?? "Proveedor",
    providerEmail: provider?.support_email ?? "",
    driverEmail: profile.email,
    licensePlate: video.license_plate,
    recordedAt: video.recorded_at,
  });

  revalidatePath("/driver");
  revalidatePath("/provider");
  revalidatePath("/provider/claims");
  revalidatePath("/mining");

  return {
    status: "success",
    message: notified
      ? "Solicitud enviada. El proveedor fue notificado por correo."
      : "Solicitud enviada. El proveedor quedó registrado en su bandeja de reclamos.",
  };
}

async function maybeNotifyProvider(input: {
  requestId: string;
  requestedAt: string;
  providerName: string;
  providerEmail: string;
  driverEmail: string;
  licensePlate: string;
  recordedAt: string;
}): Promise<boolean> {
  const result = await sendDeletionNotification(
    {
      requestId: input.requestId,
      providerName: input.providerName,
      driverEmail: input.driverEmail,
      licensePlate: input.licensePlate,
      recordedAt: input.recordedAt,
      requestedAt: input.requestedAt,
      reviewUrl: `${siteUrl}/provider/claims`,
    },
    input.providerEmail,
  );

  if (!result.sent) {
    console.error(
      `[ARCO] No se pudo notificar al proveedor ${input.providerEmail}: ${result.reason}`,
    );
  }

  return result.sent;
}
