import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MiningClaimsTable } from "@/components/mining-claims-table";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MiningClaimRow } from "@/types";

export const metadata = { title: "Reclamos" };

export default async function MiningClaimsPage() {
  await requireCompany("MINING");
  const supabase = await createClient();

  // RLS limits these to videos owned by this mining company.
  const { data: requests } = await supabase
    .from("deletion_requests")
    .select(
      "id, video_id, driver_id, status, created_at, scheduled_deletion_at, resolved_at, auto_deleted_at, provider_id, provider_declared_at",
    )
    .order("created_at", { ascending: false });

  const videoIds = (requests ?? []).map((request) => request.video_id);
  const driverIds = (requests ?? []).map((request) => request.driver_id);
  const providerIds = [
    ...new Set(
      (requests ?? [])
        .map((request) => request.provider_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: videos } = videoIds.length
    ? await supabase
        .from("video_metadata")
        .select("id, license_plate, recorded_at")
        .in("id", videoIds)
    : { data: [] };

  const { data: drivers } = driverIds.length
    ? await supabase.from("users").select("id, email").in("id", driverIds)
    : { data: [] };

  const { data: providers } = providerIds.length
    ? await supabase.from("companies").select("id, name").in("id", providerIds)
    : { data: [] };

  const videosById = new Map((videos ?? []).map((video) => [video.id, video]));
  const driversById = new Map((drivers ?? []).map((user) => [user.id, user]));
  const providersById = new Map(
    (providers ?? []).map((company) => [company.id, company]),
  );

  const rows: MiningClaimRow[] = (requests ?? []).flatMap((request) => {
    const video = videosById.get(request.video_id);

    if (!video) {
      return [];
    }

    return [
      {
        id: request.id,
        status: request.status,
        createdAt: request.created_at,
        scheduledDeletionAt: request.scheduled_deletion_at,
        resolvedAt: request.resolved_at,
        autoDeletedAt: request.auto_deleted_at,
        licensePlate: video.license_plate,
        recordedAt: video.recorded_at,
        driverEmail: driversById.get(request.driver_id)?.email ?? "Conductor",
        providerName: request.provider_id
          ? providersById.get(request.provider_id)?.name ?? null
          : null,
        providerDeclaredAt: request.provider_declared_at,
      },
    ];
  });

  const pending = rows.filter((row) => row.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reclamos</h1>
        <p className="text-muted-foreground text-sm">
          {pending > 0
            ? `Tienes ${pending} reclamo(s) pendiente(s) de borrado.`
            : "No tienes reclamos pendientes."}{" "}
          El borrado se ejecuta automáticamente al cumplirse el plazo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Solicitudes de borrado de tus conductores
          </CardTitle>
          <CardDescription>
            La columna «Proveedora declaró» indica si la proveedora confirmó el
            borrado en sus propios sistemas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <MiningClaimsTable rows={rows} />
          ) : (
            <Alert>
              <AlertTitle>Sin reclamos</AlertTitle>
              <AlertDescription>
                Cuando un conductor solicite el borrado de una grabación asignada
                a su turno, aparecerá aquí.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
