import { NextResponse, type NextRequest } from "next/server";

import { roleHomePath } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback: exchanges the `code` for a session, provisions/loads the
 * user profile and forwards the user to the dashboard that matches their role.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const oauthError = searchParams.get("error_description");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  const base = isLocal
    ? origin
    : forwardedHost
      ? `https://${forwardedHost}`
      : origin;

  const failure = (message: string) =>
    NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(message)}`,
    );

  if (oauthError) {
    return failure(oauthError);
  }

  if (!code) {
    return failure("No se recibió el código de autorización de Google.");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return failure(error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure("No se pudo recuperar tu sesión. Intenta nuevamente.");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return failure(
      "No se encontró tu perfil en la plataforma. Contacta al administrador.",
    );
  }

  if (next && next.startsWith("/")) {
    return NextResponse.redirect(`${base}${next}`);
  }

  if (profile.role === "DRIVER" && !profile.company_id) {
    return NextResponse.redirect(`${base}/onboarding`);
  }

  return NextResponse.redirect(`${base}${roleHomePath(profile.role)}`);
}
