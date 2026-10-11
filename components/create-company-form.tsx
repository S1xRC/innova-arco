"use client";

import { Building2 } from "lucide-react";
import { useActionState, useState } from "react";

import { createCompanyAction } from "@/actions/onboarding";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

/**
 * Self-service company creation. Useful when the database has no seeded
 * companies: the caller becomes the first member (mining or provider).
 */
export function CreateCompanyForm() {
  const [state, formAction, pending] = useActionState(
    createCompanyAction,
    initialActionState,
  );
  const [type, setType] = useState<"MINING" | "PROVIDER">("MINING");

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />

      <div className="space-y-2">
        <Label>¿Qué tipo de empresa quieres registrar?</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={type === "MINING" ? "default" : "outline"}
            onClick={() => setType("MINING")}
          >
            Empresa minera
          </Button>
          <Button
            type="button"
            variant={type === "PROVIDER" ? "default" : "outline"}
            onClick={() => setType("PROVIDER")}
          >
            Proveedor de cámaras
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyName">Nombre de la empresa</Label>
        <Input
          id="companyName"
          name="name"
          placeholder="Minera Los Andes S.A."
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? (
          <p className="text-destructive text-xs">{errors.name}</p>
        ) : null}
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        <Building2 className="size-4" />
        {pending ? "Creando…" : "Crear empresa"}
      </Button>
    </form>
  );
}
