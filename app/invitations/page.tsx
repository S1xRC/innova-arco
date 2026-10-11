import { Inbox } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  acceptInvitationAction,
  declineInvitationAction,
} from "@/actions/invitations";
import { ActionButton } from "@/components/action-button";
import { AppHeader } from "@/components/app-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  COMPANY_TYPE_LABELS,
  ROLE_LABELS,
  roleHomePath,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Invitaciones" };

/**
 * Pending invitations for the signed-in user. Reachable from any role, so a
 * user that already belongs to a company can accept new ones (a driver may
 * belong to several companies).
 */
export default async function InvitationsPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
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
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Invitaciones pendientes
            </h1>
            <p className="text-muted-foreground text-sm">
              Invitaciones dirigidas a <strong>{profile.email}</strong>.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={roleHomePath(profile.role)}>Volver a mi panel</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitaciones</CardTitle>
            <CardDescription>
              Al aceptar, pasas a trabajar en esa empresa (puedes pertenecer a
              varias y cambiar con el selector de la cabecera).
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
                          {company ? COMPANY_TYPE_LABELS[company.type] : "—"} ·
                          Rol {ROLE_LABELS[invitation.role]} ·{" "}
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
      </main>
    </div>
  );
}
