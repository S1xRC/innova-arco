import { generateOccurrencesAction } from "@/actions/schedule";
import { ActionButton } from "@/components/action-button";
import { ScheduleBoard } from "@/components/schedule-board";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  ScheduleDriverOption,
  ScheduleDriverRow,
  ScheduleEntry,
} from "@/types";

export const metadata = { title: "Horario semanal" };

export default async function MiningSchedulePage() {
  const profile = await requireCompany("MINING");
  const supabase = await createClient();

  const [{ data: templates }, { data: memberships }, { data: occurrences }] =
    await Promise.all([
      supabase
        .from("shift_templates")
        .select(
          "id, driver_user_id, license_plate, weekday, start_time, notes, active",
        )
        .eq("mining_id", profile.companyId)
        .order("start_time", { ascending: true }),
      supabase
        .from("memberships")
        .select("user_id, invited_email, role, status")
        .eq("company_id", profile.companyId)
        .eq("role", "DRIVER")
        .eq("status", "ACTIVE"),
      supabase
        .from("shifts")
        .select("template_id, matched_video_id")
        .eq("mining_id", profile.companyId)
        .not("template_id", "is", null),
    ]);

  const driverIds = [
    ...new Set([
      ...(memberships ?? [])
        .map((membership) => membership.user_id)
        .filter((id): id is string => Boolean(id)),
      ...(templates ?? []).map((template) => template.driver_user_id),
    ]),
  ];

  const { data: driverUsers } = driverIds.length
    ? await supabase
        .from("users")
        .select("id, email, full_name")
        .in("id", driverIds)
    : { data: [] };

  const usersById = new Map((driverUsers ?? []).map((user) => [user.id, user]));

  const assignedByTemplate = new Map<string, number>();
  for (const occurrence of occurrences ?? []) {
    if (occurrence.template_id && occurrence.matched_video_id) {
      assignedByTemplate.set(
        occurrence.template_id,
        (assignedByTemplate.get(occurrence.template_id) ?? 0) + 1,
      );
    }
  }

  function labelFor(userId: string, fallback: string): string {
    const user = usersById.get(userId);
    return user?.full_name ?? user?.email ?? fallback;
  }

  const entries: ScheduleEntry[] = (templates ?? []).map((template) => ({
    id: template.id,
    driverUserId: template.driver_user_id,
    driverLabel: labelFor(template.driver_user_id, "Conductor"),
    licensePlate: template.license_plate,
    weekday: template.weekday,
    startTime: template.start_time,
    notes: template.notes,
    active: template.active,
    assignedCount: assignedByTemplate.get(template.id) ?? 0,
  }));

  const drivers: ScheduleDriverOption[] = (memberships ?? []).flatMap(
    (membership) =>
      membership.user_id
        ? [
            {
              userId: membership.user_id,
              label: labelFor(membership.user_id, membership.invited_email),
            },
          ]
        : [],
  );

  const rows: ScheduleDriverRow[] = [];
  const seen = new Set<string>();

  for (const option of drivers) {
    if (seen.has(option.userId)) {
      continue;
    }

    seen.add(option.userId);
    rows.push({
      userId: option.userId,
      label: option.label,
      entries: entries.filter((entry) => entry.driverUserId === option.userId),
    });
  }

  // Schedule entries whose driver is no longer an active member.
  for (const entry of entries) {
    if (seen.has(entry.driverUserId)) {
      continue;
    }

    seen.add(entry.driverUserId);
    rows.push({
      userId: entry.driverUserId,
      label: `${labelFor(entry.driverUserId, "Conductor")} (inactivo)`,
      entries: entries.filter((item) => item.driverUserId === entry.driverUserId),
    });
  }

  const recordedTotal = entries.reduce(
    (total, entry) => total + entry.assignedCount,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Horario semanal
          </h1>
          <p className="text-muted-foreground text-sm">
            Define el horario recurrente de cada conductor. Los turnos con fecha
            se generan a partir de él y aparecen en «Turnos».
          </p>
        </div>
        <ActionButton
          action={generateOccurrencesAction}
          label="Generar turnos"
          pendingLabel="Generando…"
          icon="refresh"
          variant="default"
        />
      </div>

      <ScheduleBoard drivers={drivers} rows={rows} />

      {recordedTotal > 0 ? (
        <p className="text-muted-foreground text-xs">
          {recordedTotal} turno(s) ya tienen una grabación asignada y no se
          modifican al cambiar el horario.
        </p>
      ) : null}
    </div>
  );
}
