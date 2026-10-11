import { NextResponse, type NextRequest } from "next/server";

import { createDownloadUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/recordings/[id]
 *
 * Streams a recording to the browser without ever exposing the Storage URL:
 *
 *   1. authenticates the caller (session cookies);
 *   2. reads the row with the *user* client, so RLS decides access
 *      (driver assigned through a shift, or the owning mining company);
 *   3. mints a very short-lived signed URL **server-side only**;
 *   4. forwards the upstream stream (Range is passed through for seeking);
 *   5. records the access in `recording_access_log` (deduplicated).
 *
 * Because the browser only ever sees `/api/recordings/<id>` there is no direct
 * download URL to copy. Downloads can still be captured by a determined user
 * (DevTools / screen capture) — this is a friction measure, not DRM.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  // RLS decides whether this user may read the row at all.
  const { data: video } = await supabase
    .from("video_metadata")
    .select("id, storage_path, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!video || video.deleted_at || !video.storage_path) {
    return new NextResponse("No disponible", { status: 404 });
  }

  // Short-lived signed URL, used only server-side to fetch the object.
  const signed = await createDownloadUrl(video.storage_path, 60);

  if (!signed) {
    return new NextResponse("No disponible", { status: 503 });
  }

  const range = request.headers.get("range");
  let upstream: Response;

  try {
    upstream = await fetch(signed, {
      headers: range ? { Range: range } : undefined,
      cache: "no-store",
    });
  } catch (error) {
    console.error("[ARCO] recording proxy:", error);
    return new NextResponse("No disponible", { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse("No disponible", { status: 502 });
  }

  // Only the initial request is logged, so a single playback (which issues
  // several Range requests) produces one row.
  const isInitialRequest = !range || /^bytes=0-/.test(range);

  if (isInitialRequest) {
    const { data: profileRow } = await supabase
      .from("users")
      .select("active_company_id")
      .eq("id", user.id)
      .maybeSingle();

    const { error: logError } = await supabase
      .from("recording_access_log")
      .insert({
        video_id: video.id,
        user_id: user.id,
        company_id: profileRow?.active_company_id ?? null,
        action: "VIEW",
      });

    if (logError) {
      console.error("[ARCO] access log:", logError.message);
    }
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") ?? "video/mp4",
  );
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Disposition", "inline");

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) {
    headers.set("Content-Range", contentRange);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
