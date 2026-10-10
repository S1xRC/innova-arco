import { Activity, Clock, ShieldCheck } from "lucide-react";

import { MiningAuditTable } from "@/components/mining-audit-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MiningAuditRow } from "@/types";

export const metadata = { title: "Portal de auditoría" };

export default async function MiningAuditPage() {
  const profile = await requireRole(["MINING"]);
  const supabase = await createClient();

  // RLS limits these rows to requests filed by drivers of this company.
  const { data: requests } = await supabase
    .from("deletion_requests")
    .select("id, video_id, status, created_at, resolved_at")
    .order("created_at", { ascending: false });

  const videoIds = (requests ?? []).map((request) => request.video_id);

  const { data: videos } = videoIds.length
    ? await supabase
        .from("video_metadata")
        .select("id, license_plate, recorded_at, driver_email, provider_id")
        .in("id", videoIds)
    : { data: [] };

  const providerIds = [
    ...new Set((videos ?? []).map((video) => video.provider_id)),
  ];

  const { data: providers } = providerIds.length
    ? await supabase.from("companies").select("id, name").in("id", providerIds)
    : { data: [] };

  const videosById = new Map((videos ?? []).map((video) => [video.id, video]));
  const providersById = new Map(
    (providers ?? []).map((provider) => [provider.id, provider]),
  );

  const rows: MiningAuditRow[] = (requests ?? []).flatMap((request) => {
    const video = videosById.get(request.video_id);

    if (!video) {
      return [];
    }

    return [
      {
        id: request.id,
        status: request.status,
        createdAt: request.created_at,
        resolvedAt: request.resolved_at,
        licensePlate: video.license_plate,
        recordedAt: video.recorded_at,
        driverEmail: video.driver_email,
        providerName:
          providersById.get(video.provider_id)?.name ?? "Proveedor",
      },
    ];
  });

  const total = rows.length;
  const resolved = rows.filter((row) => row.status === "DELETED").length;
  const pending = total - resolved;
  const compliance = total === 0 ? 100 : Math.round((resolved / total) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Actividad reciente
        </h1>
        <p className="text-muted-foreground text-sm">
          Portal de solo lectura con las solicitudes ARCO realizadas por los
          conductores de <strong>{profile.companyName ?? "tu empresa"}</strong>.
          Úsalo para auditar a los proveedores de cámaras.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="size-4" />
              Solicitudes totales
            </CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="size-4" />
              Pendientes
            </CardDescription>
            <CardTitle className="text-3xl">{pending}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Cumplimiento
            </CardDescription>
            <CardTitle className="text-3xl">{compliance}%</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Progress value={compliance} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Solicitudes de eliminación de datos
          </CardTitle>
          <CardDescription>
            Estado de cada reclamo: <strong>Pendiente</strong> si el proveedor
            aún no lo procesa, <strong>Resuelto</strong> si el dato ya fue
            eliminado de su sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <MiningAuditTable rows={rows} />
          ) : (
            <Alert>
              <AlertTitle>Sin actividad registrada</AlertTitle>
              <AlertDescription>
                Aún no hay solicitudes de borrado de los conductores que
                declararon pertenecer a tu empresa minera.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
