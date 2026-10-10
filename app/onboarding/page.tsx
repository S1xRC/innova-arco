import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { OnboardingCompanyForm } from "@/components/onboarding-company-form";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionProfile } from "@/lib/auth";
import { APP_NAME, roleHomePath } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Selecciona tu empresa" };

export default async function OnboardingPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "DRIVER") {
    redirect(roleHomePath(profile.role));
  }

  if (profile.companyId) {
    redirect("/driver");
  }

  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("type", "MINING")
    .order("name", { ascending: true });

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="text-primary size-5" />
          {APP_NAME}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">¿Para qué minera trabajas?</CardTitle>
            <CardDescription>
              Hola {profile.fullName ?? profile.email}. Antes de continuar,
              declara la empresa minera a la que perteneces. Esta información se
              usa para que la minera pueda auditar el tratamiento de tus datos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companies && companies.length > 0 ? (
              <OnboardingCompanyForm companies={companies} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Aún no hay empresas mineras registradas en la plataforma.
                Contacta al administrador.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
