import { UserPlus } from "lucide-react";

import { InviteDriverForm } from "@/components/invite-driver-form";
import { MembersTable } from "@/components/members-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CompanyMember } from "@/types";

export const metadata = { title: "Conductores" };

export default async function MiningMembersPage() {
  const profile = await requireCompany("MINING");
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, user_id, invited_email, role, status, created_at, accepted_at")
    .eq("company_id", profile.companyId)
    .order("created_at", { ascending: false });

  const members: CompanyMember[] = (memberships ?? []).map((membership) => ({
    id: membership.id,
    userId: membership.user_id,
    email: membership.invited_email,
    role: membership.role,
    status: membership.status,
    createdAt: membership.created_at,
    acceptedAt: membership.accepted_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conductores</h1>
        <p className="text-muted-foreground text-sm">
          Invita a tus conductores por correo. Un conductor puede pertenecer a
          varias empresas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4" />
              Invitar conductor
            </CardTitle>
            <CardDescription>
              El conductor acepta la invitación al iniciar sesión con ese correo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteDriverForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Miembros e invitaciones
            </CardTitle>
            <CardDescription>
              {members.length > 0
                ? `${members.length} registro(s).`
                : "Aún no hay conductores."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <MembersTable members={members} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
