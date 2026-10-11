import { Camera, FileWarning, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { DriverRecordingsTable } from "@/components/driver-recordings-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DriverRecording } from "@/types";

export const metadata = { title: "Mis grabaciones" };

export default async function DriverDashboardPage() {
  const profile = await requireRole(["DRIVER"]);
  const supabase = await createClient();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, starts_at, matched_video_id")
    .eq("driver_user_id", profile.id);

  const videoIds = [
    ...new Set(
      (shifts ?? [])
        .map((shift) => shift.matched_video_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: videos } = videoIds.length
    ? await supabase
        .from("video_metadata")
        .select(
          "id, license_plate, recorded_at, external_id, provider_id, deleted_at, storage_path",
        )
        .in("id", videoIds)
        .order("recorded_at", { ascending: false })
    : { data: [] };

  const { data: requests } = videoIds.length
    ? await supabase
        .from("deletion_requests")
        .select(
          "id, video_id, status, scheduled_deletion_at, provider_declared_at",
        )
        .in("video_id", videoIds)
    : { data: [] };

  // ARCO "right of access": who opened each of the driver's recordings.
  const { data: accessLogs } = videoIds.length
    ? await supabase
        .from("recording_access_log")
        .select("video_id, user_id, company_id, created_at")
        .in("video_id", videoIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const externalCompanyIds = [
    ...new Set(
      (accessLogs ?? [])
        .filter((log) => log.user_id !== profile.id)
        .map((log) => log.company_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const { data: externalCompanies } = externalCompanyIds.length
    ? await supabase
        .from("companies")
        .select("id, name")
        .in("id", externalCompanyIds)
    : { data: [] };

  const externalCompaniesById = new Map(
    (externalCompanies ?? []).map((company) => [company.id, company]),
  );

  const accessByVideo = new Map<
    string,
    {
      count: number;
      lastExternalAt: string | null;
      lastExternalCompany: string | null;
    }
  >();

  for (const log of accessLogs ?? []) {
    const stats = accessByVideo.get(log.video_id) ?? {
      count: 0,
      lastExternalAt: null,
      lastExternalCompany: null,
    };

    stats.count += 1;

    // Logs are ordered newest-first, so the first external one wins.
    if (log.user_id !== profile.id && !stats.lastExternalAt) {
      stats.lastExternalAt = log.created_at;
      stats.lastExternalCompany = log.company_id
        ? externalCompaniesById.get(log.company_id)?.name ?? null
        : null;
    }

    accessByVideo.set(log.video_id, stats);
  }

  const providerIds = [
    ...new Set(
      (videos ?? [])
        .map((video) => video.provider_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: providers } = providerIds.length
    ? await supabase.from("companies").select("id, name").in("id", providerIds)
    : { data: [] };

  const providersById = new Map(
    (providers ?? []).map((provider) => [provider.id, provider]),
  );
  const requestsByVideo = new Map(
    (requests ?? []).map((request) => [request.video_id, request]),
  );
  const shiftByVideo = new Map(
    (shifts ?? [])
      .filter((shift) => shift.matched_video_id)
      .map((shift) => [shift.matched_video_id as string, shift]),
  );

  const records: DriverRecording[] = (videos ?? []).map((video) => {
    const request = requestsByVideo.get(video.id);
    const shift = shiftByVideo.get(video.id);
    const access = accessByVideo.get(video.id);

    return {
      id: video.id,
      licensePlate: video.license_plate,
      recordedAt: video.recorded_at,
      externalId: video.external_id,
      providerName: video.provider_id
        ? providersById.get(video.provider_id)?.name ?? "Proveedora"
        : "Sin proveedora",
      shiftStartsAt: shift?.starts_at ?? null,
      requestId: request?.id ?? null,
      requestStatus: request?.status ?? null,
      scheduledDeletionAt: request?.scheduled_deletion_at ?? null,
      providerDeclaredAt: request?.provider_declared_at ?? null,
      deletedAt: video.deleted_at,
      storagePath: video.storage_path,
      accessCount: access?.count ?? 0,
      lastAccessAt: access?.lastExternalAt ?? null,
      lastAccessCompanyName: access?.lastExternalCompany ?? null,
    };
  });

  const pending = records.filter(
    (record) => record.requestStatus === "PENDING",
  ).length;
  const deleted = records.filter((record) => record.deletedAt).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Mis grabaciones
        </h1>
        <p className="text-muted-foreground text-sm">
          Estas son las grabaciones asignadas a tus turnos. Puedes pedir el
          borrado de cualquiera que te identifique.
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Consulta la{" "}
          <Link href="/driver/policies" className="underline">
            declaración de uso y tratamiento de datos
          </Link>{" "}
          de tus empresas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Camera className="size-4" />
              Grabaciones asignadas
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
            <CardTitle className="text-3xl">{pending}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Grabaciones eliminadas
            </CardDescription>
            <CardTitle className="text-3xl">{deleted}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de grabaciones</CardTitle>
          <CardDescription>
            Al solicitar el borrado, la grabación se elimina automáticamente al
            cumplirse el plazo y se marca el turno. Verás si la proveedora
            confirmó el borrado en sus sistemas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          {records.length > 0 ? (
            <DriverRecordingsTable records={records} />
          ) : (
            <Alert>
              <AlertTitle>Sin grabaciones por ahora</AlertTitle>
              <AlertDescription>
                Cuando la empresa minera registre una grabación que coincida con
                tus turnos, aparecerá aquí automáticamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
