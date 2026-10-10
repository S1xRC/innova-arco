import { FileWarning } from "lucide-react";

import { ProviderClaimsTable } from "@/components/provider-claims-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProviderClaim } from "@/types";

export const metadata = { title: "Bandeja de reclamos" };

export default async function ProviderClaimsPage() {
  await requireRole(["PROVIDER"]);
  const supabase = await createClient();

  // RLS already limits this to videos uploaded by the caller's company.
  const { data: requests } = await supabase
    .from("deletion_requests")
    .select("id, video_id, status, created_at, resolved_at")
    .order("created_at", { ascending: false });

  const videoIds = (requests ?? []).map((request) => request.video_id);

  const { data: videos } = videoIds.length
    ? await supabase
        .from("video_metadata")
        .select("id, license_plate, recorded_at, driver_email")
        .in("id", videoIds)
    : { data: [] };

  const videosById = new Map((videos ?? []).map((video) => [video.id, video]));

  const claims: ProviderClaim[] = (requests ?? []).flatMap((request) => {
    const video = videosById.get(request.video_id);

    if (!video) {
      return [];
    }

    return [
      {
        id: request.id,
        videoId: request.video_id,
        status: request.status,
        createdAt: request.created_at,
        resolvedAt: request.resolved_at,
        licensePlate: video.license_plate,
        recordedAt: video.recorded_at,
        driverEmail: video.driver_email,
      },
    ];
  });

  const pendingCount = claims.filter(
    (claim) => claim.status === "PENDING",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bandeja de reclamos
        </h1>
        <p className="text-muted-foreground text-sm">
          {pendingCount > 0
            ? `Tienes ${pendingCount} solicitud(es) pendiente(s) de respuesta.`
            : "No tienes solicitudes pendientes."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Solicitudes de borrado recibidas
          </CardTitle>
          <CardDescription>
            Al marcar una solicitud como eliminada se notifica el estado a la
            empresa minera en su portal de auditoría.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {claims.length > 0 ? (
            <ProviderClaimsTable claims={claims} />
          ) : (
            <Alert>
              <FileWarning className="size-4" />
              <AlertTitle>Sin reclamos</AlertTitle>
              <AlertDescription>
                Cuando un conductor solicite el borrado de uno de tus registros,
                aparecerá aquí y recibirás un correo en la dirección de soporte
                de tu empresa.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
