"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { combineDateTime } from "@/lib/format";
import { purgeRecording } from "@/lib/recordings";
import { buildRecordingPath, createUploadTarget } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  createVideoMetadataSchema,
  videoIdSchema,
  zodFieldErrors,
} from "@/lib/validation";
import type { ActionState } from "@/types/actions";
import type { Json } from "@/types/database";

/**
 * Creates a signed upload URL so the browser uploads the file straight to
 * Supabase Storage (avoids the serverless body-size limit).
 */
export async function createUploadUrlAction(
  externalId: string,
  fileName: string,
): Promise<{
  ok: boolean;
  bucket?: string;
  path?: string;
  token?: string;
  error?: string;
}> {
  const profile = await requireProfile();

  if (!profile.companyId) {
    return { ok: false, error: "No tienes una empresa activa." };
  }

  const clean = (externalId ?? "").trim();

  if (!clean) {
    return { ok: false, error: "Ingresa el identificador del video/cámara." };
  }

  const path = buildRecordingPath(
    profile.companyId,
    clean,
    fileName || "recording.mp4",
  );
  const target = await createUploadTarget(path);

  if (!target) {
    return {
      ok: false,
      error:
        "El almacenamiento no está configurado (falta SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  return { ok: true, bucket: target.bucket, path: target.path, token: target.token };
}

function parseExtraInfo(raw: string | undefined): Json | null {
  const value = (raw ?? "").trim();

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Json;
  } catch {
    return { nota: value };
  }
}

/**
 * Registers a recording uploaded by the mining company. The DB trigger matches
 * it to a shift (plate + start time) automatically.
 */
export async function createVideoMetadataAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId || profile.companyType !== "MINING") {
    return {
      status: "error",
      message: "Solo una empresa minera puede subir grabaciones.",
    };
  }

  const parsed = createVideoMetadataSchema.safeParse({
    externalId: String(formData.get("externalId") ?? ""),
    licensePlate: String(formData.get("licensePlate") ?? ""),
    recordedDate: String(formData.get("recordedDate") ?? ""),
    recordedTime: String(formData.get("recordedTime") ?? ""),
    providerId: String(formData.get("providerId") ?? ""),
    extraInfo: String(formData.get("extraInfo") ?? ""),
    storagePath: String(formData.get("storagePath") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la grabación.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const recordedAt = combineDateTime(
    parsed.data.recordedDate,
    parsed.data.recordedTime,
  );

  if (!recordedAt) {
    return { status: "error", message: "La fecha u hora no son válidas." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("video_metadata").insert({
    mining_id: profile.companyId,
    provider_id: parsed.data.providerId || null,
    external_id: parsed.data.externalId,
    license_plate: parsed.data.licensePlate,
    recorded_at: recordedAt.toISOString(),
    extra_info: parseExtraInfo(parsed.data.extraInfo),
    storage_path: parsed.data.storagePath || null,
    created_by: profile.id,
  });

  if (error) {
    console.error("[ARCO] createVideoMetadataAction:", error.message);
    return {
      status: "error",
      message: "No fue posible guardar la grabación. Intenta nuevamente.",
    };
  }

  revalidatePath("/mining/videos");
  revalidatePath("/mining");

  return {
    status: "success",
    message: `Grabación ${parsed.data.externalId} registrada y vinculada a turnos compatibles.`,
  };
}

/**
 * Mining company deletes a recording immediately (even before its 30-day
 * window). Removes the Storage object, wipes the extra info and flags the shift.
 */
export async function deleteRecordingNowAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId) {
    return { status: "error", message: "No tienes una empresa activa." };
  }

  const parsed = videoIdSchema.safeParse({
    videoId: String(formData.get("videoId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "El registro no es válido." };
  }

  const supabase = await createClient();

  const { data: video } = await supabase
    .from("video_metadata")
    .select("id, mining_id")
    .eq("id", parsed.data.videoId)
    .maybeSingle();

  if (!video || video.mining_id !== profile.companyId) {
    return { status: "error", message: "No encontramos ese registro." };
  }

  const result = await purgeRecording(parsed.data.videoId);

  if (!result.ok) {
    return {
      status: "error",
      message: result.reason ?? "No fue posible eliminar la grabación.",
    };
  }

  revalidatePath("/mining/videos");
  revalidatePath("/mining");
  revalidatePath("/driver");

  return { status: "success", message: "Grabación eliminada de la plataforma." };
}
