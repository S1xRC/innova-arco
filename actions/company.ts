"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { companySettingsSchema, dataPolicySchema, zodFieldErrors } from "@/lib/validation";
import type { ActionState } from "@/types/actions";

/** Mining company updates its retention policy and support contact. */
export async function updateCompanySettingsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId) {
    return { status: "error", message: "No tienes una empresa activa." };
  }

  const parsed = companySettingsSchema.safeParse({
    deletionGraceDays: String(formData.get("deletionGraceDays") ?? "30"),
    supportEmail: String(formData.get("supportEmail") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los valores ingresados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("companies")
    .update({
      deletion_grace_days: parsed.data.deletionGraceDays,
      support_email: parsed.data.supportEmail || null,
    })
    .eq("id", profile.companyId);

  if (error) {
    return { status: "error", message: "No fue posible guardar la configuración." };
  }

  revalidatePath("/mining/settings");
  revalidatePath("/mining");

  return {
    status: "success",
    message:
      parsed.data.deletionGraceDays === 0
        ? "Política actualizada: el borrado será instantáneo."
        : `Política actualizada: borrado a los ${parsed.data.deletionGraceDays} días.`,
  };
}

/**
 * Company (mining or provider) publishes/updates its data processing
 * declaration. Only staff members can do it — enforced by RLS too.
 */
export async function updateDataPolicyAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!profile.companyId) {
    return { status: "error", message: "No tienes una empresa activa." };
  }

  const parsed = dataPolicySchema.safeParse({
    content: String(formData.get("content") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa la declaración.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("company_data_policies").upsert(
    {
      company_id: profile.companyId,
      content: parsed.data.content,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );

  if (error) {
    console.error("[ARCO] updateDataPolicyAction:", error.message);
    return {
      status: "error",
      message:
        "No fue posible guardar la declaración. Verifica que tu cuenta tenga permisos de gestión.",
    };
  }

  revalidatePath("/mining/settings");
  revalidatePath("/provider/settings");
  revalidatePath("/driver/policies");

  return {
    status: "success",
    message: "Declaración de uso y tratamiento actualizada.",
  };
}
