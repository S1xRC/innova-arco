"use server";

import { redirect } from "next/navigation";

import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts the Google OAuth (PKCE) flow. The code verifier is stored in a
 * cookie by the Supabase SSR client and consumed by /auth/callback.
 */
export async function signInWithGoogleAction() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
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
