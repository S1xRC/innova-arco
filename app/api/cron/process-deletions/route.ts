import { NextResponse, type NextRequest } from "next/server";

import { processDueDeletions } from "@/lib/recordings";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/process-deletions
 *
 * Processes every overdue ARCO deletion request: removes the Storage objects
 * and purges the sensitive metadata. Meant to be called by Vercel Cron (which
 * sends `Authorization: Bearer <CRON_SECRET>`), or manually with the
 * `x-cron-secret` header. If `CRON_SECRET` is not set the endpoint is open —
 * configure it in production.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();

  if (secret) {
    const authorization = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");

    const authorized =
      authorization === `Bearer ${secret}` || headerSecret === secret;

    if (!authorized) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 401 },
      );
    }
  }

  const result = await processDueDeletions();

  if (result.reason) {
    return NextResponse.json(
      { ok: false, error: result.reason },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, processed: result.processed });
}
