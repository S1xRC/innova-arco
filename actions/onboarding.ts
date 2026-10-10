"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { selectMiningCompanySchema, zodFieldErrors } from "@/lib/validation";
import type { ActionState } from "@/types/actions";

/**
 * Driver onboarding: declare which mining company they work for.
 * Only allowed once — the DB trigger blocks later reassignments.
 */
export async function selectMiningCompanyAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (profile.role !== "DRIVER") {
    return {
      status: "error",
      message: "Este paso es exclusivo del rol conductor.",
    };
  }

  if (profile.companyId) {
    return { status: "error", message: "Tu empresa ya fue asignada." };
  }

  const parsed = selectMiningCompanySchema.safeParse({
    companyId: String(formData.get("companyId") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Debes seleccionar una empresa minera.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  // Ensure the selected company really is a mining company.
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, type")
    .eq("id", parsed.data.companyId)
    .maybeSingle();

  if (companyError || !company || company.type !== "MINING") {
    return {
      status: "error",
      message: "La empresa minera seleccionada no es válida.",
    };
  }

  const { error } = await supabase
    .from("users")
    .update({ company_id: company.id })
    .eq("id", profile.id)
    .is("company_id", null);

  if (error) {
    return {
      status: "error",
      message: "No fue posible guardar tu empresa. Intenta nuevamente.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/driver");
}
