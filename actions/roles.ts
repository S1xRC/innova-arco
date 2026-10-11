"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  adminSetRoleSchema,
  setActiveCompanySchema,
  updateUserRoleSchema,
  zodFieldErrors,
} from "@/lib/validation";
import type { ActionState } from "@/types/actions";

/** Switches the caller's active company (must be one of their memberships). */
export async function setActiveCompanyAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  const parsed = setActiveCompanySchema.safeParse({
    companyId: String(formData.get("companyId") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Empresa inválida.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const membership = profile.memberships.find(
    (item) => item.companyId === parsed.data.companyId && item.status === "ACTIVE",
  );

  if (!membership) {
    return { status: "error", message: "No perteneces a esa empresa." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      active_company_id: membership.companyId,
      role: membership.role,
    })
    .eq("id", profile.id);

  if (error) {
    return { status: "error", message: "No fue posible cambiar de empresa." };
  }

  revalidatePath("/", "layout");

  return { status: "success", message: `Ahora trabajas en ${membership.companyName}.` };
}

/**
 * Free role assignment: the user may adopt any role they hold an active
 * membership for (platform admins may pick any role).
 */
export async function updateUserRoleAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  const parsed = updateUserRoleSchema.safeParse({
    role: String(formData.get("role") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Rol inválido.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const membership = profile.memberships.find(
    (item) => item.role === parsed.data.role && item.status === "ACTIVE",
  );

  if (!membership && !profile.isPlatformAdmin) {
    return {
      status: "error",
      message: "No tienes una membresía activa con ese rol.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      role: parsed.data.role,
      ...(membership ? { active_company_id: membership.companyId } : {}),
    })
    .eq("id", profile.id);

  if (error) {
    return { status: "error", message: "No fue posible cambiar de rol." };
  }

  revalidatePath("/", "layout");

  return { status: "success", message: "Rol actualizado." };
}

/** Platform admins can assign any role to any user. */
export async function adminSetRoleAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.isPlatformAdmin) {
    return { status: "error", message: "Solo un administrador puede hacer esto." };
  }

  const parsed = adminSetRoleSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    role: String(formData.get("role") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Datos inválidos.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);

  if (error) {
    return { status: "error", message: "No fue posible asignar el rol." };
  }

  revalidatePath("/admin");

  return { status: "success", message: "Rol asignado." };
}
