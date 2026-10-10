import { NextResponse, type NextRequest } from "next/server";

import { sendDeletionNotification } from "@/lib/email/resend";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/notify-provider
 *
 * Sends the ARCO deletion-request email to a camera provider.
 *
 * Two ways to trigger it:
 *   1. Directly from the driver's Server Action (default flow).
 *   2. As a Supabase Database Webhook on `deletion_requests` INSERT.
 *      In that case set the header `x-webhook-secret` to NOTIFY_WEBHOOK_SECRET
 *      and post the record: { "requestId": "<uuid>" } or { "record": { "id": "<uuid>" } }.
 *
 * The endpoint never throws on delivery problems: it reports them in the body
 * so the caller (or the webhook log) can retry.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFY_WEBHOOK_SECRET?.trim();

  if (secret) {
    const provided = request.headers.get("x-webhook-secret");
    if (provided !== secret) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 401 },
      );
    }
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 },
    );
  }

  const requestId = extractRequestId(payload);

  if (!requestId) {
    return NextResponse.json(
      { ok: false, error: "Falta el campo requestId" },
      { status: 422 },
    );
  }

  const supabase = await createClient();

  const { data: deletionRequest, error } = await supabase
    .from("deletion_requests")
    .select("id, created_at, driver_id, video_id")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !deletionRequest) {
    return NextResponse.json(
      { ok: false, error: "Solicitud no encontrada" },
      { status: 404 },
    );
  }

  const { data: video } = await supabase
    .from("video_metadata")
    .select("license_plate, recorded_at, provider_id")
    .eq("id", deletionRequest.video_id)
    .maybeSingle();

  const [{ data: provider }, { data: driver }] = await Promise.all([
    video
      ? supabase
          .from("companies")
          .select("name, support_email")
          .eq("id", video.provider_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("users")
      .select("email")
      .eq("id", deletionRequest.driver_id)
      .maybeSingle(),
  ]);

  if (!provider?.support_email) {
    return NextResponse.json(
      {
        ok: false,
        error: "El proveedor no tiene un correo de soporte configurado",
      },
      { status: 422 },
    );
  }

  const result = await sendDeletionNotification(
    {
      requestId: deletionRequest.id,
      providerName: provider.name,
      driverEmail: driver?.email ?? "conductor",
      licensePlate: video?.license_plate ?? "—",
      recordedAt: video?.recorded_at ?? deletionRequest.created_at,
      requestedAt: deletionRequest.created_at,
      reviewUrl: `${siteUrl}/provider/claims`,
    },
    provider.support_email,
  );

  return NextResponse.json(
    { ok: result.sent, id: result.id, error: result.reason },
    { status: result.sent ? 200 : 502 },
  );
}

function extractRequestId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;

  if (typeof body.requestId === "string") {
    return body.requestId;
  }

  const record = body.record;

  if (record && typeof record === "object") {
    const id = (record as Record<string, unknown>).id;
    if (typeof id === "string") {
      return id;
    }
  }

  return null;
}
