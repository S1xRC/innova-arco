"use client";

import { Upload } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { createVideoMetadataAction } from "@/actions/provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-destructive text-xs">{message}</p>;
}

export function ProviderUploadForm({
  defaultDate,
  defaultTime,
}: {
  defaultDate: string;
  defaultTime: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    createVideoMetadataAction,
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

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
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
          <Label htmlFor="recordedDate">Fecha</Label>
          <Input
            id="recordedDate"
            name="recordedDate"
            type="date"
            defaultValue={defaultDate}
            required
            aria-invalid={Boolean(errors.recordedDate)}
          />
          <FieldError message={errors.recordedDate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recordedTime">Hora</Label>
          <Input
            id="recordedTime"
            name="recordedTime"
            type="time"
            defaultValue={defaultTime}
            required
            aria-invalid={Boolean(errors.recordedTime)}
          />
          <FieldError message={errors.recordedTime} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="driverEmail">Correo del conductor</Label>
        <Input
          id="driverEmail"
          name="driverEmail"
          type="email"
          placeholder="conductor@correo.cl"
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.driverEmail)}
        />
        <FieldError message={errors.driverEmail} />
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        <Upload className="size-4" />
        {pending ? "Guardando…" : "Subir metadatos"}
      </Button>
    </form>
  );
}
