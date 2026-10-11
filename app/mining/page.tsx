import { Camera, FileWarning, Truck, Users } from "lucide-react";
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

export const metadata = { title: "Panel de la minera" };

export default async function MiningDashboardPage() {
  const profile = await requireCompany("MINING");
  const supabase = await createClient();

  const [
    { count: videoCount },
    { count: shiftCount },
    { data: memberships },
    { data: claims },
  ] = await Promise.all([
    supabase
      .from("video_metadata")
      .select("id", { count: "exact", head: true })
      .eq("mining_id", profile.companyId)
      .is("deleted_at", null),
    supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .eq("mining_id", profile.companyId),
    supabase
      .from("memberships")
      .select("id, role, status")
      .eq("company_id", profile.companyId),
    supabase.from("deletion_requests").select("id, status"),
  ]);

  const drivers = (memberships ?? []).filter(
    (item) => item.role === "DRIVER" && item.status === "ACTIVE",
  ).length;
  const pending = (claims ?? []).filter(
    (item) => item.status === "PENDING",
  ).length;

  const stats = [
    { icon: Camera, label: "Grabaciones activas", value: videoCount ?? 0 },
    { icon: Truck, label: "Turnos definidos", value: shiftCount ?? 0 },
    { icon: Users, label: "Conductores activos", value: drivers },
    { icon: FileWarning, label: "Reclamos pendientes", value: pending },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {profile.companyName ?? "minera"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Sube grabaciones, define turnos con patente y hora de inicio, e invita a
          tus conductores y proveedoras.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subir grabación</CardTitle>
            <CardDescription>
              Registra el identificador, patente, hora de inicio y la información
              extra. Se asigna automáticamente al turno que coincida.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/mining/videos">Ir a grabaciones</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Definir turnos</CardTitle>
            <CardDescription>
              Crea turnos por conductor con la patente del camión y la hora de
              inicio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/mining/shifts">Ir a turnos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revisar reclamos</CardTitle>
            <CardDescription>
              Revisa los reclamos de borrado de tus conductores y su estado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/mining/claims">Ir a reclamos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
