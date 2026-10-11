import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShiftForm, type DriverOption } from "@/components/shift-form";
import { ShiftsTable } from "@/components/shifts-table";
import { requireCompany } from "@/lib/auth";
import { toDateInputValue, toTimeInputValue } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ShiftRow } from "@/types";

export const metadata = { title: "Turnos" };

export default async function MiningShiftsPage() {
  const profile = await requireCompany("MINING");
  const supabase = await createClient();

  const [{ data: shifts }, { data: memberships }] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        "id, license_plate, starts_at, notes, driver_user_id, matched_video_id, video_deleted_at",
      )
      .eq("mining_id", profile.companyId)
      .order("starts_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("user_id, invited_email, role, status")
      .eq("company_id", profile.companyId)
      .eq("role", "DRIVER")
      .eq("status", "ACTIVE"),
  ]);

  const driverIds = [
    ...new Set(
      [
        ...(shifts ?? []).map((shift) => shift.driver_user_id),
        ...(memberships ?? [])
          .map((membership) => membership.user_id)
          .filter((id): id is string => Boolean(id)),
      ].filter(Boolean),
    ),
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

  const drivers: DriverOption[] = (memberships ?? []).flatMap((membership) => {
    if (!membership.user_id) {
      return [];
    }

    const user = usersById.get(membership.user_id);

    return [
      {
        userId: membership.user_id,
        label: user?.full_name ?? user?.email ?? membership.invited_email,
      },
    ];
  });

  const rows: ShiftRow[] = (shifts ?? []).map((shift) => {
    const driver = usersById.get(shift.driver_user_id);

    return {
      id: shift.id,
      licensePlate: shift.license_plate,
      startsAt: shift.starts_at,
      notes: shift.notes,
      driverUserId: shift.driver_user_id,
      driverEmail: driver?.email ?? "—",
      driverName: driver?.full_name ?? null,
      matchedVideoId: shift.matched_video_id,
      videoDeletedAt: shift.video_deleted_at,
    };
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Turnos</h1>
        <p className="text-muted-foreground text-sm">
          Define el turno de cada conductor con la patente del camión y la hora de
          inicio. Cuando subas una grabación que coincida, se asignará a ese
          turno.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo turno</CardTitle>
            <CardDescription>
              La patente y la hora de inicio deben coincidir con la grabación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShiftForm
              drivers={drivers}
              defaultDate={toDateInputValue(now)}
              defaultTime={toTimeInputValue(now)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Turnos definidos</CardTitle>
            <CardDescription>
              {rows.length > 0
                ? `${rows.length} turno(s) registrados.`
                : "Aún no has definido turnos."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            {rows.length > 0 ? (
              <ShiftsTable shifts={rows} />
            ) : (
              <Alert>
                <AlertTitle>Sin turnos</AlertTitle>
                <AlertDescription>
                  Crea el primer turno con el formulario de la izquierda.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
