"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ShiftTemplateForm } from "@/components/shift-template-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  ScheduleDriverOption,
  ScheduleDriverRow,
  ScheduleEntry,
} from "@/types";

interface Selection {
  entry: ScheduleEntry | null;
  driverUserId: string;
  weekday: number;
}

/**
 * Weekly schedule board: rows = drivers, columns = weekdays. Clicking a shift
 * loads it in the editor; "Agregar" starts a new one for that driver/day.
 */
export function ScheduleBoard({
  drivers,
  rows,
}: {
  drivers: ScheduleDriverOption[];
  rows: ScheduleDriverRow[];
}) {
  const [selection, setSelection] = useState<Selection | null>(null);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horario semanal</CardTitle>
          <CardDescription>
            Haz clic en un turno para editarlo, o en “Agregar” para crear uno. El
            número verde son los turnos que ya tienen grabación asignada: al
            cambiar el horario se conservan tal cual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aún no hay conductores activos. Invítalos en «Conductores».
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border p-2 text-left">Conductor</th>
                    {WEEKDAY_ORDER.map((weekday) => (
                      <th key={weekday} className="border p-2 text-left">
                        {WEEKDAY_LABELS[weekday]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.userId}>
                      <td className="border p-2 align-top font-medium">
                        {row.label}
                      </td>
                      {WEEKDAY_ORDER.map((weekday) => {
                        const entries = row.entries
                          .filter((entry) => entry.weekday === weekday)
                          .sort((a, b) =>
                            a.startTime.localeCompare(b.startTime),
                          );

                        return (
                          <td key={weekday} className="border p-2 align-top">
                            <div className="flex flex-col gap-1">
                              {entries.map((entry) => (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() =>
                                    setSelection({
                                      entry,
                                      driverUserId: entry.driverUserId,
                                      weekday: entry.weekday,
                                    })
                                  }
                                  title="Editar horario"
                                  className={cn(
                                    "hover:bg-accent flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-left text-xs transition-colors",
                                    entry.active ? "" : "opacity-50",
                                  )}
                                >
                                  <span className="font-medium">
                                    {entry.startTime.slice(0, 5)}
                                  </span>
                                  <span className="truncate">
                                    {entry.licensePlate}
                                  </span>
                                  {entry.assignedCount > 0 ? (
                                    <Badge variant="success">
                                      {entry.assignedCount}
                                    </Badge>
                                  ) : null}
                                </button>
                              ))}

                              <button
                                type="button"
                                onClick={() =>
                                  setSelection({
                                    entry: null,
                                    driverUserId: row.userId,
                                    weekday,
                                  })
                                }
                                className="text-muted-foreground hover:bg-accent flex items-center justify-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs transition-colors"
                              >
                                <Plus className="size-3" />
                                Agregar
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="xl:sticky xl:top-20 xl:self-start">
        <CardHeader>
          <CardTitle className="text-base">
            {selection?.entry ? "Editar turno" : "Nuevo turno"}
          </CardTitle>
          <CardDescription>
            {selection?.entry
              ? "Los cambios solo afectan a los turnos futuros sin grabación."
              : "Selecciona un turno del calendario o pulsa «Agregar» en el día deseado."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selection ? (
            <ShiftTemplateForm
              key={
                selection.entry?.id ??
                `new-${selection.driverUserId}-${selection.weekday}`
              }
              drivers={drivers}
              entry={selection.entry}
              defaultDriverUserId={selection.driverUserId}
              defaultWeekday={selection.weekday}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Nada seleccionado todavía.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
