import { cache } from "react";
import { redirect } from "next/navigation";

import { roleHomePath } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { SessionProfile, UserRole } from "@/types";

/**
 * Loads the authenticated user together with their `public.users` profile.
 * Cached per request so multiple components can call it freely.
 *
 * Returns `null` when there is no session or the profile row is missing.
 */
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, role, company_id, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return null;
    }

    let companyName: string | null = null;

    if (profile.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .maybeSingle();

      companyName = company?.name ?? null;
    }

    return {
      id: profile.id,
      email: profile.email || user.email || "",
      role: profile.role,
      companyId: profile.company_id,
      companyName,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
    };
  },
);

/** Requires an authenticated user with a profile, otherwise redirects. */
export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

/**
 * Requires the authenticated user to hold one of the allowed roles.
 * - Wrong role  -> redirected to their own dashboard.
 * - Driver without a mining company -> redirected to onboarding.
 */
export async function requireRole(
  allowed: UserRole[],
): Promise<SessionProfile> {
  const profile = await requireProfile();

  if (!allowed.includes(profile.role)) {
    redirect(roleHomePath(profile.role));
  }

  if (profile.role === "DRIVER" && !profile.companyId) {
    redirect("/onboarding");
  }

  return profile;
}
