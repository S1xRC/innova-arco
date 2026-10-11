"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { isEmailEnabled, sendInvitationEmail } from "@/lib/email/resend";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  inviteDriverSchema,
  inviteProviderSchema,
  respondInvitationSchema,
  zodFieldErrors,
} from "@/lib/validation";
import type { ActionState } from "@/types/actions";

const UNIQUE_VIOLATION = "23505";

/** Mining company invites a driver to its organisation by email. */
export async function inviteDriverAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId || profile.companyType !== "MINING") {
    return {
      status: "error",
      message: "Solo una empresa minera puede invitar conductores.",
    };
  }

  const parsed = inviteDriverSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa el correo ingresado.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("memberships").insert({
    company_id: profile.companyId,
    role: "DRIVER",
    status: "INVITED",
    invited_email: parsed.data.email,
    invited_by: profile.id,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "Ese correo ya tiene una invitación o relación con tu empresa.",
      };
    }

    console.error("[ARCO] inviteDriverAction:", error.message);
    return {
      status: "error",
      message: "No fue posible crear la invitación.",
    };
  }

  if (isEmailEnabled()) {
    await sendInvitationEmail(parsed.data.email, {
      companyName: profile.companyName ?? "la empresa",
      roleLabel: ROLE_LABELS.DRIVER,
      acceptUrl: `${siteUrl}/onboarding`,
      invitedEmail: parsed.data.email,
    });
  }

  revalidatePath("/mining/members");
  revalidatePath("/onboarding");

  return {
    status: "success",
    message: `Invitación registrada para ${parsed.data.email}.`,
  };
}

/** Mining company invites (and optionally creates) the camera provider. */
export async function inviteProviderAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId || profile.companyType !== "MINING") {
    return {
      status: "error",
      message: "Solo una empresa minera puede invitar proveedoras.",
    };
  }

  const parsed = inviteProviderSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la proveedora.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  // 1. Find an existing provider with that name, or create it.
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("type", "PROVIDER")
    .ilike("name", parsed.data.name)
    .maybeSingle();

  let providerId = existing?.id ?? null;

  if (!providerId) {
    const { data: created, error: createError } = await supabase
      .from("companies")
      .insert({
        name: parsed.data.name,
        type: "PROVIDER",
        support_email: parsed.data.email,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (createError || !created) {
      console.error(
        "[ARCO] inviteProviderAction company:",
        createError?.message,
      );
      return {
        status: "error",
        message: "No fue posible registrar la proveedora.",
      };
    }

    providerId = created.id;
  }

  // 2. Relation invitation (mining -> provider).
  const { error: relationError } = await supabase
    .from("company_relations")
    .insert({
      mining_id: profile.companyId,
      provider_id: providerId,
      status: "INVITED",
      invited_by: profile.id,
    });

  if (relationError && relationError.code !== UNIQUE_VIOLATION) {
    console.error("[ARCO] inviteProviderAction relation:", relationError.message);
    return {
      status: "error",
      message: "No fue posible crear la relación con la proveedora.",
    };
  }

  // 3. Membership invitation so the contact signs in as PROVIDER.
  const { error: membershipError } = await supabase
    .from("memberships")
    .insert({
      company_id: providerId,
      role: "PROVIDER",
      status: "INVITED",
      invited_email: parsed.data.email,
      invited_by: profile.id,
    });

  if (membershipError && membershipError.code !== UNIQUE_VIOLATION) {
    console.error(
      "[ARCO] inviteProviderAction membership:",
      membershipError.message,
    );
  }

  if (isEmailEnabled()) {
    await sendInvitationEmail(parsed.data.email, {
      companyName: parsed.data.name,
      roleLabel: ROLE_LABELS.PROVIDER,
      acceptUrl: `${siteUrl}/onboarding`,
      invitedEmail: parsed.data.email,
    });
  }

  revalidatePath("/mining/providers");
  revalidatePath("/provider/relations");

  return {
    status: "success",
    message: `Invitación de relación enviada a ${parsed.data.name}.`,
  };
}

/** The invited user accepts one of their pending memberships. */
export async function acceptInvitationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  const parsed = respondInvitationSchema.safeParse({
    membershipId: String(formData.get("membershipId") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "La invitación no es válida.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, company_id, role, status, invited_email")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();

  if (!membership || membership.status !== "INVITED") {
    return { status: "error", message: "La invitación ya no está disponible." };
  }

  if (membership.invited_email.toLowerCase() !== profile.email.toLowerCase()) {
    return { status: "error", message: "Esta invitación no te pertenece." };
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("memberships")
    .update({ user_id: profile.id, status: "ACTIVE", accepted_at: now })
    .eq("id", membership.id);

  if (error) {
    return { status: "error", message: "No fue posible aceptar la invitación." };
  }

  await supabase
    .from("users")
    .update({ role: membership.role, active_company_id: membership.company_id })
    .eq("id", profile.id);

  revalidatePath("/", "layout");

  return { status: "success", message: "Invitación aceptada." };
}

/** The invited user declines a pending membership. */
export async function declineInvitationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const parsed = respondInvitationSchema.safeParse({
    membershipId: String(formData.get("membershipId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "La invitación no es válida." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("memberships")
    .update({ status: "REVOKED", revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.membershipId);

  if (error) {
    return { status: "error", message: "No fue posible rechazar la invitación." };
  }

  revalidatePath("/onboarding");

  return { status: "success", message: "Invitación rechazada." };
}

/** Mining company revokes a membership of its organisation. */
export async function revokeMembershipAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId) {
    return { status: "error", message: "No tienes una empresa activa." };
  }

  const parsed = respondInvitationSchema.safeParse({
    membershipId: String(formData.get("membershipId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "El miembro no es válido." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("memberships")
    .update({ status: "REVOKED", revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.membershipId)
    .eq("company_id", profile.companyId);

  if (error) {
    return { status: "error", message: "No fue posible revocar el acceso." };
  }

  revalidatePath("/mining/members");

  return { status: "success", message: "Acceso revocado." };
}

/** The provider company accepts a relation invitation from a mining company. */
export async function acceptRelationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId) {
    return { status: "error", message: "No tienes una empresa activa." };
  }

  const parsed = respondInvitationSchema.safeParse({
    membershipId: String(formData.get("membershipId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "La relación no es válida." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("company_relations")
    .update({ status: "ACTIVE", accepted_at: new Date().toISOString() })
    .eq("id", parsed.data.membershipId)
    .eq("provider_id", profile.companyId);

  if (error) {
    return { status: "error", message: "No fue posible aceptar la relación." };
  }

  revalidatePath("/provider/relations");

  return { status: "success", message: "Relación aceptada." };
}
