import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Video storage abstraction.
 *
 * The MVP stores the actual recordings in a private Supabase Storage bucket
 * (`recordings`). Every read/write goes through the server with the
 * service_role key, so no Storage RLS policies are required.
 *
 * The bucket/path helpers are intentionally vendor-neutral: swapping to another
 * S3-compatible provider (Cloudflare R2, ...) only requires re-implementing the
 * functions below.
 */

export const STORAGE_BUCKET = (process.env.STORAGE_BUCKET ?? "recordings").trim();

export function isStorageEnabled(): boolean {
  const driver = (process.env.STORAGE_DRIVER ?? "supabase").trim().toLowerCase();
  return driver === "supabase" && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

/** Deterministic path: `<miningId>/<externalId>/<filename>`. */
export function buildRecordingPath(
  miningId: string,
  externalId: string,
  fileName = "recording.mp4",
): string {
  return `${miningId}/${sanitize(externalId)}/${sanitize(fileName)}`;
}

export interface UploadTarget {
  bucket: string;
  path: string;
  token: string;
}

/** Creates a signed upload target the browser can PUT to directly. */
export async function createUploadTarget(
  path: string,
): Promise<UploadTarget | null> {
  const admin = createAdminClient();

  if (!admin) {
    return null;
  }

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[ARCO] createUploadTarget:", error?.message);
    return null;
  }

  return { bucket: STORAGE_BUCKET, path, token: data.token };
}

/** Removes physical objects. Returns how many were requested for removal. */
export async function removeRecordingObjects(paths: string[]): Promise<void> {
  const admin = createAdminClient();
  const clean = paths.filter(Boolean);

  if (!admin || clean.length === 0) {
    return;
  }

  const { error } = await admin.storage.from(STORAGE_BUCKET).remove(clean);

  if (error) {
    console.error("[ARCO] removeRecordingObjects:", error.message);
  }
}

/** Signed, time-limited download URL for a recording. */
export async function createDownloadUrl(
  path: string,
  expiresIn = 60 * 60,
): Promise<string | null> {
  const admin = createAdminClient();

  if (!admin || !path) {
    return null;
  }

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}
