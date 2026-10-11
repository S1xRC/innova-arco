"use client";

import { PauseCircle, PlayCircle, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import {
  createShiftTemplateAction,
  deleteShiftTemplateAction,
  toggleShiftTemplateAction,
  updateShiftTemplateAction,
} from "@/actions/schedule";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/constants";
import { initialActionState } from "@/types/actions";
import type { ScheduleDriverOption, ScheduleEntry } from "@/types";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-destructive text-xs">{message}</p>;
}

/**
 * Editor for a single weekly schedule entry. Changing a schedule never touches
 * the occurrences that already hold a recording — the server preserves them.
 */
export function ShiftTemplateForm({
  drivers,
  entry,
  defaultDriverUserId,
  defaultWeekday,
}: {
  drivers: ScheduleDriverOption[];
  entry: ScheduleEntry | null;
  defaultDriverUserId: string;
  defaultWeekday: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    entry ? updateShiftTemplateAction : createShiftTemplateAction,
    initialActionState,
  );
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast.success(state.message);
      formRef.current?.reset();
    }

    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  const errors = state.fieldErrors ?? {};

  function handleToggle() {
    if (!entry) {
      return;
    }

    const data = new FormData();
    data.set("templateId", entry.id);

    startToggle(async () => {
      const result = await toggleShiftTemplateAction(initialActionState, data);

      if (result.message) {
        if (result.status === "error") {
          toast.error(result.message);
        } else {
          toast.success(result.message);
        }
      }

      router.refresh();
    });
  }

  function handleDelete() {
    if (!entry) {
      return;
    }

    if (
      !window.confirm(
        "¿Eliminar este horario? Los turnos con grabación asignada se conservarán.",
      )
    ) {
      return;
    }

    const data = new FormData();
    data.set("templateId", entry.id);

    startDelete(async () => {
      const result = await deleteShiftTemplateAction(initialActionState, data);

      if (result.message) {
        if (result.status === "error") {
          toast.error(result.message);
        } else {
          toast.success(result.message);
        }
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="space-y-4">
        {entry ? (
          <input type="hidden" name="templateId" value={entry.id} />
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="templateDriver">Conductor</Label>
          <select
            id="templateDriver"
            name="driverUserId"
            defaultValue={defaultDriverUserId}
            required
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="" disabled>
              Selecciona un conductor
            </option>
            {drivers.map((driver) => (
              <option key={driver.userId} value={driver.userId}>
                {driver.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.driverUserId} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="templateWeekday">Día</Label>
            <select
              id="templateWeekday"
              name="weekday"
              defaultValue={String(defaultWeekday)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              {WEEKDAY_ORDER.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {WEEKDAY_LABELS[weekday]}
                </option>
              ))}
            </select>
            <FieldError message={errors.weekday} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="templateTime">Hora de inicio</Label>
            <Input
              id="templateTime"
              name="startTime"
              type="time"
              defaultValue={entry ? entry.startTime.slice(0, 5) : "08:00"}
              required
              aria-invalid={Boolean(errors.startTime)}
            />
            <FieldError message={errors.startTime} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="templatePlate">Patente del camión</Label>
          <Input
            id="templatePlate"
            name="licensePlate"
            defaultValue={entry?.licensePlate ?? ""}
            placeholder="AB-CD-12"
            autoComplete="off"
            required
            aria-invalid={Boolean(errors.licensePlate)}
          />
          <FieldError message={errors.licensePlate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="templateNotes">Nota (opcional)</Label>
          <Textarea
            id="templateNotes"
            name="notes"
            defaultValue={entry?.notes ?? ""}
            placeholder="Turno nocturno, ruta norte…"
          />
          <FieldError message={errors.notes} />
        </div>

        {state.status === "error" && state.message ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending
            ? "Guardando…"
            : entry
              ? "Guardar cambios"
              : "Agregar al horario"}
        </Button>
      </form>

      {entry ? (
        <div className="space-y-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleToggle}
              disabled={isToggling}
            >
              {entry.active ? (
                <PauseCircle className="size-4" />
              ) : (
                <PlayCircle className="size-4" />
              )}
              {entry.active ? "Pausar" : "Reactivar"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </div>
          {entry.assignedCount > 0 ? (
            <p className="text-muted-foreground text-xs">
              {entry.assignedCount} turno(s) con grabación asignada: se conservan
              tal cual aunque cambies el conductor.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
