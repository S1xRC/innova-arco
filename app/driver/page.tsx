import { Camera, FileWarning, ShieldCheck } from "lucide-react";

import { DriverRecordsTable } from "@/components/driver-records-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DriverRecord } from "@/types";

export const metadata = { title: "Mis registros" };

export default async function DriverDashboardPage() {
  const profile = await requireRole(["DRIVER"]);
  const supabase = await createClient();

  const { data: videos } = await supabase
    .from("video_metadata")
    .select("id, license_plate, recorded_at, provider_id")
    .eq("driver_email", profile.email.toLowerCase())
    .order("recorded_at", { ascending: false });

  const videoIds = (videos ?? []).map((video) => video.id);

  const { data: requests } = videoIds.length
    ? await supabase
        .from("deletion_requests")
        .select("id, video_id, status")
        .in("video_id", videoIds)
    : { data: [] };

  const providerIds = [
    ...new Set((videos ?? []).map((video) => video.provider_id)),
  ];

  const { data: providers } = providerIds.length
    ? await supabase.from("companies").select("id, name").in("id", providerIds)
    : { data: [] };

  const requestsByVideo = new Map(
    (requests ?? []).map((request) => [request.video_id, request]),
  );
  const providersById = new Map(
    (providers ?? []).map((provider) => [provider.id, provider]),
  );

  const records: DriverRecord[] = (videos ?? []).map((video) => {
    const request = requestsByVideo.get(video.id);

    return {
      id: video.id,
      licensePlate: video.license_plate,
      recordedAt: video.recorded_at,
      providerName: providersById.get(video.provider_id)?.name ?? "Proveedor",
      requestId: request?.id ?? null,
      requestStatus: request?.status ?? null,
    };
  });

  const pendingCount = records.filter(
    (record) => record.requestStatus === "PENDING",
  ).length;
  const resolvedCount = records.filter(
    (record) => record.requestStatus === "DELETED",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Mis registros de video
        </h1>
        <p className="text-muted-foreground text-sm">
          Estos son los metadatos asociados a <strong>{profile.email}</strong>.
          Puedes solicitar la eliminación de cualquier registro que te
          identifique.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Camera className="size-4" />
              Registros
            </CardDescription>
            <CardTitle className="text-3xl">{records.length}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileWarning className="size-4" />
              Solicitudes pendientes
            </CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Solicitudes resueltas
            </CardDescription>
            <CardTitle className="text-3xl">{resolvedCount}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de grabaciones</CardTitle>
          <CardDescription>
            Al solicitar el borrado, el registro pasa a estado
            &ldquo;Solicitud pendiente&rdquo; y el proveedor es notificado por
            correo electrónico.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          {records.length > 0 ? (
            <DriverRecordsTable records={records} />
          ) : (
            <Alert>
              <AlertTitle>Sin registros por ahora</AlertTitle>
              <AlertDescription>
                Cuando un proveedor de cámaras suba metadatos asociados a tu
                correo, aparecerán aquí automáticamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
