"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Public base URL of the current request.
 *
 * Behind a proxy (Vercel) the real host arrives in `x-forwarded-host`, so the
 * OAuth `redirectTo` always matches the domain actually in use — localhost,
 * `*.vercel.app` or a custom domain — with no rebuild required.
 *
 * Supabase still validates `redirectTo` against its "Redirect URLs" allowlist,
 * so a spoofed host cannot hijack the flow.
 */
async function resolveBaseUrl(): Promise<string> {
  const headerList = await headers();

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto =
    headerList.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  return host ? `${proto}://${host}` : siteUrl;
}

/**
 * Starts the Google OAuth (PKCE) flow. The code verifier is stored in a
 * cookie by the Supabase SSR client and consumed by /auth/callback.
 */
export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const baseUrl = await resolveBaseUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(
        error?.message ?? "No fue posible iniciar el flujo de Google.",
      )}`,
    );
  }

  redirect(data.url);
}

/** Signs the current user out and returns to the login page. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}
