import { Camera, FileWarning, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Resumen del proveedor" };

export default async function ProviderOverviewPage() {
  const profile = await requireRole(["PROVIDER"]);
  const supabase = await createClient();

  const [{ count: videoCount }, { data: requests }] = await Promise.all([
    supabase
      .from("video_metadata")
      .select("id", { count: "exact", head: true }),
    supabase.from("deletion_requests").select("id, status"),
  ]);

  const pending = (requests ?? []).filter(
    (request) => request.status === "PENDING",
  ).length;
  const resolved = (requests ?? []).filter(
    (request) => request.status === "DELETED",
  ).length;

  const stats = [
    {
      icon: Camera,
      label: "Registros subidos",
      value: videoCount ?? 0,
    },
    { icon: FileWarning, label: "Reclamos pendientes", value: pending },
    { icon: ShieldCheck, label: "Reclamos resueltos", value: resolved },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {profile.companyName ?? "proveedor"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Gestiona la ingesta de metadatos y responde a las solicitudes de
          borrado (derechos ARCO) de los conductores.
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
            <CardTitle className="text-base">Subir metadatos</CardTitle>
            <CardDescription>
              Registra manualmente la patente, fecha, hora y correo del
              conductor. En producción esto llegará vía la API de las cámaras.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/provider/upload">
                <Upload className="size-4" />
                Ir al formulario
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bandeja de reclamos</CardTitle>
            <CardDescription>
              Revisa las solicitudes de borrado de tus registros y márcalas como
              resueltas una vez eliminado el dato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/provider/claims">
                <FileWarning className="size-4" />
                Ver reclamos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
