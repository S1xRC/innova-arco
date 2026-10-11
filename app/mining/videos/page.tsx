import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MiningVideosTable } from "@/components/mining-videos-table";
import { VideoUploadForm, type ProviderOption } from "@/components/video-upload-form";
import { requireCompany } from "@/lib/auth";
import { toDateInputValue, toTimeInputValue } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MiningVideoRow } from "@/types";

export const metadata = { title: "Grabaciones" };

export default async function MiningVideosPage() {
  const profile = await requireCompany("MINING");
  const supabase = await createClient();

  const [{ data: videos }, { data: relations }] = await Promise.all([
    supabase
      .from("video_metadata")
      .select(
        "id, external_id, license_plate, recorded_at, provider_id, storage_path, deleted_at, shift_id, extra_info",
      )
      .eq("mining_id", profile.companyId)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("company_relations")
      .select("provider_id, status")
      .eq("mining_id", profile.companyId),
  ]);

  const providerIds = [
    ...new Set(
      [
        ...(relations ?? []).map((relation) => relation.provider_id),
        ...(videos ?? [])
          .map((video) => video.provider_id)
          .filter((id): id is string => Boolean(id)),
      ].filter(Boolean),
    ),
  ];

  const { data: providerCompanies } = providerIds.length
    ? await supabase
        .from("companies")
        .select("id, name")
        .in("id", providerIds)
    : { data: [] };

  const providersById = new Map(
    (providerCompanies ?? []).map((company) => [company.id, company]),
  );

  const providers: ProviderOption[] = (relations ?? []).flatMap((relation) => {
    const company = providersById.get(relation.provider_id);
    return company ? [{ id: company.id, name: company.name }] : [];
  });

  const shiftIds = [
    ...new Set(
      (videos ?? [])
        .map((video) => video.shift_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: shifts } = shiftIds.length
    ? await supabase
        .from("shifts")
        .select("id, driver_user_id")
        .in("id", shiftIds)
    : { data: [] };

  const driverIds = [
    ...new Set((shifts ?? []).map((shift) => shift.driver_user_id)),
  ];

  const { data: driverUsers } = driverIds.length
    ? await supabase.from("users").select("id, email").in("id", driverIds)
    : { data: [] };

  const usersById = new Map(
    (driverUsers ?? []).map((user) => [user.id, user]),
  );
  const driversByShift = new Map(
    (shifts ?? []).map((shift) => [
      shift.id,
      usersById.get(shift.driver_user_id)?.email ?? null,
    ]),
  );

  const rows: MiningVideoRow[] = (videos ?? []).map((video) => ({
    id: video.id,
    externalId: video.external_id,
    licensePlate: video.license_plate,
    recordedAt: video.recorded_at,
    providerName: video.provider_id
      ? providersById.get(video.provider_id)?.name ?? null
      : null,
    storagePath: video.storage_path,
    deletedAt: video.deleted_at,
    shiftStartsAt: null,
    driverEmail: video.shift_id
      ? driversByShift.get(video.shift_id) ?? null
      : null,
    extraInfo: video.extra_info,
  }));

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Grabaciones</h1>
        <p className="text-muted-foreground text-sm">
          Sube el archivo y la metadata. Si la patente y la hora de inicio
          coinciden con un turno, la grabación se asigna a ese conductor.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva grabación</CardTitle>
            <CardDescription>
              La información extra se borra automáticamente al eliminar la
              grabación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoUploadForm
              providers={providers}
              defaultDate={toDateInputValue(now)}
              defaultTime={toTimeInputValue(now)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grabaciones registradas</CardTitle>
            <CardDescription>
              {rows.length > 0
                ? `${rows.length} grabación(es) en tu catálogo.`
                : "Aún no has subido grabaciones."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            {rows.length > 0 ? (
              <MiningVideosTable videos={rows} />
            ) : (
              <Alert>
                <AlertTitle>Sin grabaciones</AlertTitle>
                <AlertDescription>
                  Sube la primera grabación con el formulario de la izquierda.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
