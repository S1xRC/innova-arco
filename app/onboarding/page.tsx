import { Inbox, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import {
  acceptInvitationAction,
  declineInvitationAction,
} from "@/actions/invitations";
import { ActionButton } from "@/components/action-button";
import { CreateCompanyForm } from "@/components/create-company-form";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSessionProfile } from "@/lib/auth";
import {
  APP_NAME,
  COMPANY_TYPE_LABELS,
  ROLE_LABELS,
  roleHomePath,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Únete a una empresa" };

export default async function OnboardingPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.companyId) {
    redirect(roleHomePath(profile.role));
  }

  const supabase = await createClient();
  const { data: invitations } = await supabase
    .from("memberships")
    .select("id, company_id, role, created_at")
    .eq("status", "INVITED")
    .ilike("invited_email", profile.email)
    .order("created_at", { ascending: true });

  const companyIds = [
    ...new Set((invitations ?? []).map((item) => item.company_id)),
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

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hola, {profile.fullName ?? profile.email}
          </h1>
          <p className="text-muted-foreground text-sm">
            Acepta una invitación para unirte a una empresa, o registra la tuya.
            Puedes pertenecer a varias empresas.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitaciones pendientes</CardTitle>
            <CardDescription>
              Invitaciones dirigidas a <strong>{profile.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            {invitations && invitations.length > 0 ? (
              <ul className="space-y-3">
                {invitations.map((invitation) => {
                  const company = companiesById.get(invitation.company_id);

                  return (
                    <li
                      key={invitation.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {company?.name ?? "Empresa"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {company
                            ? COMPANY_TYPE_LABELS[company.type]
                            : "—"}{" "}
                          · Rol {ROLE_LABELS[invitation.role]} ·{" "}
                          {formatDate(invitation.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="warning">Invitación</Badge>
                        <ActionButton
                          action={acceptInvitationAction}
                          payload={{ membershipId: invitation.id }}
                          label="Aceptar"
                          icon="check"
                          variant="default"
                        />
                        <ActionButton
                          action={declineInvitationAction}
                          payload={{ membershipId: invitation.id }}
                          label="Rechazar"
                          icon="x"
                          variant="ghost"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Alert>
                <Inbox className="size-4" />
                <AlertTitle>Sin invitaciones</AlertTitle>
                <AlertDescription>
                  Cuando una empresa te invite con tu correo, la verás aquí.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar mi empresa</CardTitle>
            <CardDescription>
              ¿Eres una empresa y aún no está en la plataforma? Créala y quedarás
              como su primer miembro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateCompanyForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
