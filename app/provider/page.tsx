import { CheckCheck, FileWarning, Handshake } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Panel de la proveedora" };

export default async function ProviderOverviewPage() {
  const profile = await requireCompany("PROVIDER");
  const supabase = await createClient();

  const [{ data: tickets }, { data: relations }] = await Promise.all([
    supabase.from("deletion_requests").select("id, status, provider_declared_at"),
    supabase
      .from("company_relations")
      .select("id, status")
      .eq("provider_id", profile.companyId),
  ]);

  const pending = (tickets ?? []).filter(
    (ticket) => ticket.status === "PENDING",
  ).length;
  const declared = (tickets ?? []).filter(
    (ticket) => ticket.provider_declared_at,
  ).length;
  const activeRelations = (relations ?? []).filter(
    (relation) => relation.status === "ACTIVE",
  ).length;

  const stats = [
    { icon: FileWarning, label: "Tickets pendientes", value: pending },
    { icon: CheckCheck, label: "Borrados declarados", value: declared },
    { icon: Handshake, label: "Mineras activas", value: activeRelations },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {profile.companyName ?? "proveedora"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Cuando un conductor solicite el borrado de una grabación, verás aquí una
          fila pidiendo eliminarla también de tus propios sistemas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <stat.icon className="size-4" />
                {stat.label}
              </CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Borrado de grabaciones</CardTitle>
            <CardDescription>
              Revisa los tickets y declara el borrado en tus sistemas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/provider/deletions">Ver tickets</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relaciones con mineras</CardTitle>
            <CardDescription>
              Acepta las invitaciones de relación de las empresas mineras que te
              contratan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/provider/relations">Ver relaciones</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
