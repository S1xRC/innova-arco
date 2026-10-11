import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShiftsTable } from "@/components/shifts-table";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ShiftRow } from "@/types";

export const metadata = { title: "Turnos" };

export default async function MiningShiftsPage() {
  const profile = await requireCompany("MINING");
  const supabase = await createClient();

  const { data: shifts } = await supabase
    .from("shifts")
    .select(
      "id, license_plate, starts_at, notes, driver_user_id, matched_video_id, video_deleted_at",
    )
    .eq("mining_id", profile.companyId)
    .order("starts_at", { ascending: false })
    .limit(200);

  const driverIds = [
    ...new Set((shifts ?? []).map((shift) => shift.driver_user_id)),
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

  const withVideo = rows.filter(
    (row) => row.matchedVideoId || row.videoDeletedAt,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Turnos generados
        </h1>
        <p className="text-muted-foreground text-sm">
          Turnos con fecha generados desde el <strong>horario semanal</strong>.
          Aquí ves a qué conductor quedó asignada cada grabación. Para cambiar el
          horario, usa «Horario».
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Turnos</CardTitle>
          <CardDescription>
            {rows.length > 0
              ? `${rows.length} turno(s) (máximo 200 más recientes), ${withVideo} con grabación.`
              : "Aún no hay turnos generados."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <ShiftsTable shifts={rows} />
          ) : (
            <Alert>
              <AlertTitle>Sin turnos</AlertTitle>
              <AlertDescription>
                Crea el <strong>horario semanal</strong> y pulsa «Generar turnos»
                para poblar el calendario.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
