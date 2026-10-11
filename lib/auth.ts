import { cache } from "react";
import { redirect } from "next/navigation";

import { roleHomePath } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  CompanyType,
  MembershipSummary,
  SessionProfile,
  UserRole,
} from "@/types";

/**
 * Loads the authenticated user together with their `public.users` profile and
 * their company memberships. Cached per request.
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
      .select(
        "id, email, role, active_company_id, is_platform_admin, full_name, avatar_url",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return null;
    }

    const { data: membershipRows } = await supabase
      .from("memberships")
      .select("id, company_id, role, status")
      .eq("user_id", user.id)
      .neq("status", "REVOKED");

    const companyIds = [
      ...new Set((membershipRows ?? []).map((row) => row.company_id)),
    ];

    const { data: companies } = companyIds.length
      ? await supabase
          .from("companies")
          .select("id, name, type")
          .in("id", companyIds)
      : { data: [] };

    const companiesById = new Map(
      (companies ?? []).map((company) => [company.id, company]),
    );

    const memberships: MembershipSummary[] = (membershipRows ?? []).map(
      (row) => {
        const company = companiesById.get(row.company_id);

        return {
          id: row.id,
          companyId: row.company_id,
          companyName: company?.name ?? "Empresa",
          companyType: company?.type ?? "MINING",
          role: row.role,
          status: row.status,
        };
      },
    );

    const activeCompany = profile.active_company_id
      ? companiesById.get(profile.active_company_id)
      : undefined;

    return {
      id: profile.id,
      email: profile.email || user.email || "",
      role: profile.role,
      companyId: profile.active_company_id,
      companyName: activeCompany?.name ?? null,
      companyType: activeCompany?.type ?? null,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      isPlatformAdmin: profile.is_platform_admin,
      memberships,
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
 * - Wrong role -> redirected to their own dashboard.
 * - Driver without an active company -> redirected to onboarding.
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

/** Requires an active company of the expected type. */
export async function requireCompany(
  type: CompanyType,
): Promise<SessionProfile & { companyId: string; companyType: CompanyType }> {
  const profile = await requireProfile();

  if (!profile.companyId || profile.companyType !== type) {
    redirect("/onboarding");
  }

  return profile as SessionProfile & {
    companyId: string;
    companyType: CompanyType;
  };
}

/** Requires the platform admin flag. */
export async function requirePlatformAdmin(): Promise<SessionProfile> {
  const profile = await requireProfile();

  if (!profile.isPlatformAdmin) {
    redirect(roleHomePath(profile.role));
  }

  return profile;
}
