"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { updateCompanySettingsAction } from "@/actions/company";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DELETION_POLICY_OPTIONS } from "@/lib/constants";
import { initialActionState } from "@/types/actions";

/**
 * Mining company settings: retention policy (30 days by default, instant for
 * demos) and the support email.
 */
export function CompanySettingsForm({
  deletionGraceDays,
  supportEmail,
}: {
  deletionGraceDays: number;
  supportEmail: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateCompanySettingsAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast.success(state.message);
    }

    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="deletionGraceDays">
          Plazo antes del borrado automático
        </Label>
        <select
          id="deletionGraceDays"
          name="deletionGraceDays"
          defaultValue={String(deletionGraceDays)}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          {DELETION_POLICY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Al pasar el plazo se elimina la grabación (archivo + información extra)
          y se marca el turno correspondiente.
        </p>
        {errors.deletionGraceDays ? (
          <p className="text-destructive text-xs">
            {errors.deletionGraceDays}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="supportEmail">Correo de soporte (opcional)</Label>
        <Input
          id="supportEmail"
          name="supportEmail"
          type="email"
          defaultValue={supportEmail ?? ""}
          placeholder="soporte@minera.cl"
          autoComplete="off"
        />
        {errors.supportEmail ? (
          <p className="text-destructive text-xs">{errors.supportEmail}</p>
        ) : null}
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        <Save className="size-4" />
        {pending ? "Guardando…" : "Guardar configuración"}
      </Button>
    </form>
  );
}
