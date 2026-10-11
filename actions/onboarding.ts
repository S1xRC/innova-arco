"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createCompanySchema, zodFieldErrors } from "@/lib/validation";
import type { ActionState } from "@/types/actions";

/**
 * Self-service company creation. The caller becomes an ACTIVE member and the
 * new company is set as their active one (via the `create_company` RPC).
 */
export async function createCompanyAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const parsed = createCompanySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "MINING"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la empresa.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("create_company", {
    p_name: parsed.data.name,
    p_type: parsed.data.type,
  });

  if (error) {
    console.error("[ARCO] createCompanyAction:", error.message);
    return {
      status: "error",
      message: "No fue posible crear la empresa. Intenta nuevamente.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
