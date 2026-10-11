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
import { VideoUploadForm, type ProviderOption, type ShiftOption } from "@/components/video-upload-form";
import { requireCompany } from "@/lib/auth";
import { resolveMaxUploadMb } from "@/lib/constants";
import { formatDateTime, toDateInputValue, toTimeInputValue } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MiningVideoRow } from "@/types";

export const metadata = { title: "Grabaciones" };

export default async function MiningVideosPage() {
  const profile = await requireCompany("MINING");
  const supabase = await createClient();
  const now = new Date();

  const [{ data: videos }, { data: relations }] = await Promise.all([
    supabase
      .from("video_metadata")
      .select(
        "id, external_id, license_plate, recorded_at, provider_id, storage_path, storage_size, deleted_at, shift_id, extra_info",
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

  // Shifts of this company that still have no recording (manual assignment).
  // Only a rolling window, so the picker does not grow without bound.
  const windowFrom = new Date(
    now.getTime() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const windowTo = new Date(
    now.getTime() + 28 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: availableShifts } = await supabase
    .from("shifts")
    .select("id, license_plate, starts_at, driver_user_id")
    .eq("mining_id", profile.companyId)
    .is("matched_video_id", null)
    .is("video_deleted_at", null)
    .gte("starts_at", windowFrom)
    .lte("starts_at", windowTo)
    .order("starts_at", { ascending: false })
    .limit(200);

  const driverIds = [
    ...new Set([
      ...(shifts ?? []).map((shift) => shift.driver_user_id),
      ...(availableShifts ?? []).map((shift) => shift.driver_user_id),
    ]),
  ];

  const { data: driverUsers } = driverIds.length
    ? await supabase
        .from("users")
        .select("id, email, full_name")
        .in("id", driverIds)
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

  const shiftOptions: ShiftOption[] = (availableShifts ?? []).map((shift) => {
    const driver = usersById.get(shift.driver_user_id);
    const driverLabel = driver?.full_name ?? driver?.email ?? "";

    return {
      id: shift.id,
      licensePlate: shift.license_plate,
      startsAt: shift.starts_at,
      label: [shift.license_plate, formatDateTime(shift.starts_at), driverLabel]
        .filter(Boolean)
        .join(" · "),
    };
  });

  const rows: MiningVideoRow[] = (videos ?? []).map((video) => ({
    id: video.id,
    externalId: video.external_id,
    licensePlate: video.license_plate,
    recordedAt: video.recorded_at,
    providerName: video.provider_id
      ? providersById.get(video.provider_id)?.name ?? null
      : null,
    storagePath: video.storage_path,
    storageSize: video.storage_size,
    deletedAt: video.deleted_at,
    shiftStartsAt: null,
    driverEmail: video.shift_id
      ? driversByShift.get(video.shift_id) ?? null
      : null,
    extraInfo: video.extra_info,
  }));

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
              shifts={shiftOptions}
              defaultDate={toDateInputValue(now)}
              defaultTime={toTimeInputValue(now)}
              maxUploadMb={resolveMaxUploadMb()}
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
