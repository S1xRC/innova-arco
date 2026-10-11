"use client";

import { CalendarPlus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { createShiftAction } from "@/actions/shifts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

export interface DriverOption {
  userId: string;
  label: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-destructive text-xs">{message}</p>;
}

export function ShiftForm({
  drivers,
  defaultDate,
  defaultTime,
}: {
  drivers: DriverOption[];
  defaultDate: string;
  defaultTime: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createShiftAction,
    initialActionState,
  );

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

  if (drivers.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Invita y activa al menos un conductor antes de crear turnos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="driverUserId">Conductor</Label>
        <select
          id="driverUserId"
          name="driverUserId"
          required
          defaultValue=""
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

      <div className="space-y-2">
        <Label htmlFor="licensePlate">Patente del camión</Label>
        <Input
          id="licensePlate"
          name="licensePlate"
          placeholder="AB-CD-12"
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.licensePlate)}
        />
        <FieldError message={errors.licensePlate} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shiftDate">Fecha del turno</Label>
          <Input
            id="shiftDate"
            name="shiftDate"
            type="date"
            defaultValue={defaultDate}
            required
            aria-invalid={Boolean(errors.shiftDate)}
          />
          <FieldError message={errors.shiftDate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shiftTime">Hora de inicio</Label>
          <Input
            id="shiftTime"
            name="shiftTime"
            type="time"
            defaultValue={defaultTime}
            required
            aria-invalid={Boolean(errors.shiftTime)}
          />
          <FieldError message={errors.shiftTime} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Nota (opcional)</Label>
        <Input
          id="notes"
          name="notes"
          placeholder="Turno nocturno, ruta norte…"
          autoComplete="off"
        />
        <FieldError message={errors.notes} />
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        <CalendarPlus className="size-4" />
        {pending ? "Guardando…" : "Crear turno"}
      </Button>
    </form>
  );
}
