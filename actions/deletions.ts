"use server";

import { revalidatePath } from "next/cache";

import { requireCompany, requireProfile } from "@/lib/auth";
import { isEmailEnabled, sendProviderTicketEmail } from "@/lib/email/resend";
import { siteUrl } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { processDueDeletions, purgeRecording } from "@/lib/recordings";
import { createClient } from "@/lib/supabase/server";
import {
  declareProviderDeletionSchema,
  requestDeletionSchema,
  requestIdSchema,
  zodFieldErrors,
} from "@/lib/validation";
import type { ActionState } from "@/types/actions";

const UNIQUE_VIOLATION = "23505";

/**
 * Driver exercises their ARCO right to erasure on a recording assigned to them.
 * The retention window (30 days, or instant) is computed by a DB trigger.
 */
export async function requestDeletionAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

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

  const { data: request, error: insertError } = await supabase
    .from("deletion_requests")
    .insert({
      video_id: parsed.data.videoId,
      driver_id: profile.id,
      status: "PENDING",
    })
    .select("id, scheduled_deletion_at")
    .single();

  if (insertError) {
    if (insertError.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "Ya existe una solicitud de borrado para este registro.",
      };
    }

    console.error("[ARCO] requestDeletionAction:", insertError.message);
    return {
      status: "error",
      message: "No fue posible registrar la solicitud. Intenta nuevamente.",
    };
  }

  const { data: video } = await supabase
    .from("video_metadata")
    .select("id, license_plate, recorded_at, provider_id")
    .eq("id", parsed.data.videoId)
    .maybeSingle();

  const scheduled = request.scheduled_deletion_at
    ? new Date(request.scheduled_deletion_at)
    : null;

  // Instant policy (deletion_grace_days = 0): purge right away.
  if (scheduled && scheduled.getTime() <= Date.now()) {
    const result = await purgeRecording(parsed.data.videoId);

    if (!result.ok) {
      console.error("[ARCO] instant purge:", result.reason);
    }

    revalidatePath("/driver");
    revalidatePath("/mining");

    return {
      status: "success",
      message:
        "Solicitud registrada y grabación eliminada de inmediato (política instantánea).",
    };
  }

  // Notify the provider (best-effort, only when email is configured).
  if (isEmailEnabled() && video?.provider_id) {
    const { data: provider } = await supabase
      .from("companies")
      .select("name, support_email")
      .eq("id", video.provider_id)
      .maybeSingle();

    if (provider?.support_email) {
      await sendProviderTicketEmail(provider.support_email, {
        miningName: profile.companyName ?? "La empresa minera",
        licensePlate: video.license_plate,
        recordedAt: video.recorded_at,
        scheduledDeletionAt:
          request.scheduled_deletion_at ?? new Date().toISOString(),
        reviewUrl: `${siteUrl}/provider/deletions`,
      });
    }
  }

  revalidatePath("/driver");
  revalidatePath("/mining");
  revalidatePath("/provider/deletions");

  return {
    status: "success",
    message: request.scheduled_deletion_at
      ? `Solicitud registrada. La grabación se eliminará el ${formatDate(
          request.scheduled_deletion_at,
        )}.`
      : "Solicitud registrada.",
  };
}

/** Driver cancels their own pending deletion request. */
export async function cancelDeletionRequestAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  const parsed = requestIdSchema.safeParse({
    requestId: String(formData.get("requestId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "La solicitud no es válida." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("deletion_requests")
    .delete()
    .eq("id", parsed.data.requestId)
    .eq("driver_id", profile.id)
    .eq("status", "PENDING");

  if (error) {
    return { status: "error", message: "No fue posible cancelar la solicitud." };
  }

  revalidatePath("/driver");

  return { status: "success", message: "Solicitud cancelada." };
}

/** Provider declares it deleted the recording from its own systems. */
export async function declareProviderDeletionAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireCompany("PROVIDER");

  const parsed = declareProviderDeletionSchema.safeParse({
    requestId: String(formData.get("requestId") ?? ""),
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos enviados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("deletion_requests")
    .update({
      provider_declared_at: new Date().toISOString(),
      provider_declared_by: profile.id,
      provider_note: parsed.data.note || null,
    })
    .eq("id", parsed.data.requestId)
    .eq("provider_id", profile.companyId)
    .select("id");

  if (error) {
    return {
      status: "error",
      message: "No fue posible registrar la declaración.",
    };
  }

  if (!updated || updated.length === 0) {
    return {
      status: "error",
      message: "El ticket ya no está disponible o no pertenece a tu empresa.",
    };
  }

  revalidatePath("/provider/deletions");

  return {
    status: "success",
    message: "Declaraste el borrado en tus sistemas.",
  };
}

/** Platform admin (or cron) triggers the overdue deletion processing. */
export async function processDueDeletionsAction(
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;

  const profile = await requireProfile();

  if (!profile.isPlatformAdmin) {
    return {
      status: "error",
      message: "Solo un administrador puede hacer esto.",
    };
  }

  const result = await processDueDeletions();

  revalidatePath("/mining");
  revalidatePath("/driver");
  revalidatePath("/admin");

  return {
    status: result.reason ? "error" : "success",
    message: result.reason ?? `${result.processed} grabación(es) eliminada(s).`,
  };
}
