"use client";

import { Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createUploadUrlAction,
  createVideoMetadataAction,
} from "@/actions/videos";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { formatMegabytes } from "@/lib/constants";
import { toDateInputValue, toTimeInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { initialActionState } from "@/types/actions";
import type { ScheduleDriverOption } from "@/types";

export interface ProviderOption {
  id: string;
  name: string;
}

export interface ShiftOption {
  id: string;
  label: string;
  licensePlate: string;
  startsAt: string;
  driverUserId: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-destructive text-xs">{message}</p>;
}

/**
 * Mining company uploads a recording (file + metadata). The file goes straight
 * to Supabase Storage with a signed URL; the metadata is registered afterwards
 * and the shift is assigned **manually** by the user.
 */
export function VideoUploadForm({
  providers,
  drivers,
  shifts,
  defaultDate,
  defaultTime,
  maxUploadMb,
}: {
  providers: ProviderOption[];
  drivers: ScheduleDriverOption[];
  shifts: ShiftOption[];
  defaultDate: string;
  defaultTime: string;
  maxUploadMb: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(
    createVideoMetadataAction,
    initialActionState,
  );
  const [uploading, setUploading] = useState(false);
  const [driverSearch, setDriverSearch] = useState("");
  const [driverUserId, setDriverUserId] = useState("");

  const query = driverSearch.trim().toLowerCase();
  // Keep the selected driver visible even when the search no longer matches.
  const visibleDrivers = query
    ? drivers.filter(
        (driver) =>
          driver.label.toLowerCase().includes(query) ||
          driver.userId === driverUserId,
      )
    : drivers;

  const driverShifts = shifts.filter(
    (shift) => shift.driverUserId === driverUserId,
  );

  /** Clears the metadata prefilled by a previously selected shift. */
  function clearShiftFields() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const plate = form.elements.namedItem(
      "licensePlate",
    ) as HTMLInputElement | null;
    const date = form.elements.namedItem(
      "recordedDate",
    ) as HTMLInputElement | null;
    const time = form.elements.namedItem(
      "recordedTime",
    ) as HTMLInputElement | null;

    if (plate) {
      plate.value = "";
    }

    if (date) {
      date.value = defaultDate;
    }

    if (time) {
      time.value = defaultTime;
    }
  }

  function handleDriverSelect(userId: string) {
    setDriverUserId((current) => (current === userId ? "" : userId));
    clearShiftFields();
  }

  /**
   * Picking a shift prefills plate + start time (still editable). The fields
   * remain uncontrolled so `formRef.current.reset()` clears everything after a
   * successful submit.
   */
  function handleShiftChange(value: string) {
    const form = formRef.current;
    const shift = shifts.find((item) => item.id === value);

    if (!form || !shift) {
      return;
    }

    const startsAt = new Date(shift.startsAt);
    const plate = form.elements.namedItem(
      "licensePlate",
    ) as HTMLInputElement | null;
    const date = form.elements.namedItem(
      "recordedDate",
    ) as HTMLInputElement | null;
    const time = form.elements.namedItem(
      "recordedTime",
    ) as HTMLInputElement | null;

    if (plate) {
      plate.value = shift.licensePlate;
    }

    if (date) {
      date.value = toDateInputValue(startsAt);
    }

    if (time) {
      time.value = toTimeInputValue(startsAt);
    }
  }

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
  const busy = uploading || actionPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    const externalId = String(data.get("externalId") ?? "").trim();

    // The file itself must never travel inside the Server Action payload:
    // Next.js caps that body at 1 MB (`serverActions.bodySizeLimit`). It is
    // uploaded straight to Supabase Storage; only its path is sent to the action.
    data.delete("file");

    if (file && file.size > 0) {
      if (!externalId) {
        toast.error("Ingresa el identificador del video/cámara antes de subir.");
        return;
      }

      const maxBytes = maxUploadMb * 1024 * 1024;

      if (file.size > maxBytes) {
        toast.error(
          `El archivo pesa ${formatMegabytes(
            file.size,
          )} y el máximo permitido es ${maxUploadMb} MB.`,
        );
        return;
      }

      setUploading(true);

      try {
        const target = await createUploadUrlAction(externalId, file.name);

        if (!target.ok || !target.bucket || !target.path || !target.token) {
          toast.error(target.error ?? "No se pudo preparar la subida.");
          return;
        }

        const supabase = createClient();
        const { error } = await supabase.storage
          .from(target.bucket)
          .uploadToSignedUrl(target.path, target.token, file);

        if (error) {
          toast.error(`No se pudo subir el archivo: ${error.message}`);
          return;
        }

        data.set("storagePath", target.path);
        data.set("storageSize", String(file.size));
        data.set("storageMime", file.type || "");
      } catch (error) {
        console.error("[ARCO] upload error:", error);
        toast.error("No fue posible subir el archivo. Intenta nuevamente.");
        return;
      } finally {
        setUploading(false);
      }
    }

    formAction(data);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="externalId">Identificador de video/cámara</Label>
        <Input
          id="externalId"
          name="externalId"
          placeholder="CAM-01-2026-0001"
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.externalId)}
        />
        <FieldError message={errors.externalId} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="driverSearch">Conductor</Label>
        <Input
          id="driverSearch"
          value={driverSearch}
          onChange={(event) => setDriverSearch(event.target.value)}
          placeholder="Buscar conductor por nombre o correo…"
          autoComplete="off"
        />

        {drivers.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No hay turnos libres. Créalos en{" "}
            <Link href="/mining/schedule" className="underline">
              Horario
            </Link>{" "}
            y pulsa «Generar turnos».
          </p>
        ) : (
          <div className="max-h-40 overflow-y-auto rounded-md border">
            {visibleDrivers.length === 0 ? (
              <p className="text-muted-foreground p-2 text-xs">
                Sin coincidencias.
              </p>
            ) : (
              visibleDrivers.map((driver) => (
                <button
                  key={driver.userId}
                  type="button"
                  onClick={() => handleDriverSelect(driver.userId)}
                  className={cn(
                    "hover:bg-accent flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                    driver.userId === driverUserId && "bg-accent font-medium",
                  )}
                >
                  <span className="truncate">{driver.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {
                      shifts.filter(
                        (shift) => shift.driverUserId === driver.userId,
                      ).length
                    }{" "}
                    turno(s)
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        <p className="text-muted-foreground text-xs">
          {driverUserId
            ? "Ahora elige uno de sus turnos libres."
            : "Opcional: si no eliges conductor, se guarda solo la metadata."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shiftId">Turno a asignar</Label>
        <select
          key={driverUserId}
          id="shiftId"
          name="shiftId"
          defaultValue=""
          onChange={(event) => handleShiftChange(event.target.value)}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          {driverUserId ? (
            <>
              <option value="">Sin asignar (solo metadatos)</option>
              {driverShifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.label}
                </option>
              ))}
            </>
          ) : (
            <option value="">Selecciona un conductor primero</option>
          )}
        </select>
        <p className="text-muted-foreground text-xs">
          Solo se listan los turnos libres del conductor elegido.
        </p>
        <FieldError message={errors.shiftId} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="licensePlate">Patente del camión</Label>
        <Input
          id="licensePlate"
          name="licensePlate"
          defaultValue=""
          placeholder="AB-CD-12"
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.licensePlate)}
        />
        <FieldError message={errors.licensePlate} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recordedDate">Fecha de inicio</Label>
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
          <Label htmlFor="recordedTime">Hora de inicio</Label>
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
        <Label htmlFor="providerId">Proveedora asociada (opcional)</Label>
        <select
          id="providerId"
          name="providerId"
          defaultValue=""
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Sin proveedora</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.providerId} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="extraInfo">Información extra (opcional)</Label>
        <Textarea
          id="extraInfo"
          name="extraInfo"
          placeholder='Texto libre o JSON, p. ej. {"ruta":"norte"}'
          aria-invalid={Boolean(errors.extraInfo)}
        />
        <p className="text-muted-foreground text-xs">
          Esta información se borra automáticamente al eliminarse la grabación.
        </p>
        <FieldError message={errors.extraInfo} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Archivo de video (opcional)</Label>
        <Input id="file" name="file" type="file" accept="video/*" />
        <p className="text-muted-foreground text-xs">
          El archivo se sube directamente a Supabase Storage (máximo{" "}
          {maxUploadMb} MB). Si no adjuntas archivo, se registra solo la metadata.
        </p>
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {uploading
          ? "Subiendo archivo…"
          : actionPending
            ? "Guardando…"
            : "Subir grabación"}
      </Button>
    </form>
  );
}
