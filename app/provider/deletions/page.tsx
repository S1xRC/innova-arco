import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProviderDeletionsTable } from "@/components/provider-deletions-table";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProviderDeletionTicket } from "@/types";

export const metadata = { title: "Borrado de grabaciones" };

export default async function ProviderDeletionsPage() {
  await requireCompany("PROVIDER");
  const supabase = await createClient();

  // RLS limits these to videos associated with the caller's provider company.
  const { data: requests } = await supabase
    .from("deletion_requests")
    .select(
      "id, video_id, driver_id, status, created_at, scheduled_deletion_at, resolved_at, auto_deleted_at, provider_declared_at, provider_note",
    )
    .order("created_at", { ascending: false });

  const videoIds = (requests ?? []).map((request) => request.video_id);
  const driverIds = (requests ?? []).map((request) => request.driver_id);

  const { data: videos } = videoIds.length
    ? await supabase
        .from("video_metadata")
        .select("id, license_plate, recorded_at, mining_id")
        .in("id", videoIds)
    : { data: [] };

  const { data: drivers } = driverIds.length
    ? await supabase.from("users").select("id, email").in("id", driverIds)
    : { data: [] };

  const miningIds = [
    ...new Set(
      (videos ?? [])
        .map((video) => video.mining_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: miningCompanies } = miningIds.length
    ? await supabase.from("companies").select("id, name").in("id", miningIds)
    : { data: [] };

  const videosById = new Map((videos ?? []).map((video) => [video.id, video]));
  const driversById = new Map((drivers ?? []).map((user) => [user.id, user]));
  const miningById = new Map(
    (miningCompanies ?? []).map((company) => [company.id, company]),
  );

  const tickets: ProviderDeletionTicket[] = (requests ?? []).flatMap(
    (request) => {
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
          scheduledDeletionAt: request.scheduled_deletion_at,
          resolvedAt: request.resolved_at,
          autoDeletedAt: request.auto_deleted_at,
          licensePlate: video.license_plate,
          recordedAt: video.recorded_at,
          miningName: video.mining_id
            ? miningById.get(video.mining_id)?.name ?? "Minera"
            : "Minera",
          driverEmail: driversById.get(request.driver_id)?.email ?? "Conductor",
          providerDeclaredAt: request.provider_declared_at,
          providerNote: request.provider_note,
        },
      ];
    },
  );

  const pending = tickets.filter((ticket) => !ticket.providerDeclaredAt).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Borrado de grabaciones
        </h1>
        <p className="text-muted-foreground text-sm">
          {pending > 0
            ? `Tienes ${pending} ticket(s) por confirmar.`
            : "No tienes tickets pendientes."}{" "}
          Declara aquí el borrado en tus sistemas; el conductor verá esa
          confirmación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets de borrado</CardTitle>
          <CardDescription>
            Un ticket se genera cuando un conductor pide el borrado de una
            grabación asociada a tu empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length > 0 ? (
            <ProviderDeletionsTable tickets={tickets} />
          ) : (
            <Alert>
              <AlertTitle>Sin tickets</AlertTitle>
              <AlertDescription>
                Cuando una minera registre una solicitud de borrado sobre una de
                tus grabaciones, aparecerá aquí.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
