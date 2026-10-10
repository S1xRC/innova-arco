import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { roleHomePath } from "@/lib/constants";

/** Sends every signed-in user to the dashboard that matches their role. */
export default async function DashboardRouterPage() {
  const profile = await requireProfile();

  if (profile.role === "DRIVER" && !profile.companyId) {
    redirect("/onboarding");
  }

  redirect(roleHomePath(profile.role));
}
