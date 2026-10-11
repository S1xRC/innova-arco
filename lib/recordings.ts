import { removeRecordingObjects } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PurgeResult {
  ok: boolean;
  reason?: string;
}

/**
 * Hard purge of a single recording: removes the Storage object, wipes the
 * sensitive metadata (`extra_info`, driver email) and flags the shift.
 *
 * Runs with the service_role key (bypasses RLS) so it can be called from the
 * mining company's "delete now" action and from the deletion cron.
 */
export async function purgeRecording(videoId: string): Promise<PurgeResult> {
  const admin = createAdminClient();

  if (!admin) {
    return { ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY no está configurada" };
  }

  const { data: video, error } = await admin
    .from("video_metadata")
    .select("id, storage_path")
    .eq("id", videoId)
    .maybeSingle();

  if (error || !video) {
    return { ok: false, reason: "Registro de video no encontrado" };
  }

  if (video.storage_path) {
    await removeRecordingObjects([video.storage_path]);
  }

  const now = new Date().toISOString();

  await admin
    .from("video_metadata")
    .update({
      extra_info: {},
      driver_email: null,
      storage_path: null,
      storage_size: null,
      storage_mime: null,
      deleted_at: now,
    })
    .eq("id", videoId);

  await admin
    .from("shifts")
    .update({ video_deleted_at: now })
    .eq("matched_video_id", videoId);

  await admin
    .from("deletion_requests")
    .update({ status: "DELETED", resolved_at: now, auto_deleted_at: now })
    .eq("video_id", videoId)
    .eq("status", "PENDING");

  return { ok: true };
}

/**
 * Processes every overdue deletion request: removes the Storage objects first,
 * then delegates the DB-only part to `public.process_due_deletions()`.
 */
export async function processDueDeletions(): Promise<{
  processed: number;
  reason?: string;
}> {
  const admin = createAdminClient();

  if (!admin) {
    return { processed: 0, reason: "SUPABASE_SERVICE_ROLE_KEY no está configurada" };
  }

  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("deletion_requests")
    .select("id, video_id")
    .eq("status", "PENDING")
    .lte("scheduled_deletion_at", nowIso);

  if (error) {
    return { processed: 0, reason: error.message };
  }

  const videoIds = [...new Set((due ?? []).map((row) => row.video_id))];

  if (videoIds.length > 0) {
    const { data: videos } = await admin
      .from("video_metadata")
      .select("id, storage_path")
      .in("id", videoIds);

    const paths = (videos ?? [])
      .map((video) => video.storage_path)
      .filter((path): path is string => Boolean(path));

    await removeRecordingObjects(paths);
  }

  const { data: count, error: rpcError } = await admin.rpc(
    "process_due_deletions",
  );

  if (rpcError) {
    return { processed: 0, reason: rpcError.message };
  }

  return { processed: typeof count === "number" ? count : 0 };
}
