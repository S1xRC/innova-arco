"use client";

import { Building2 } from "lucide-react";
import { useActionState } from "react";

import { selectMiningCompanyAction } from "@/actions/onboarding";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initialActionState } from "@/types/actions";

export interface MiningCompanyOption {
  id: string;
  name: string;
}

export function OnboardingCompanyForm({
  companies,
}: {
  companies: MiningCompanyOption[];
}) {
  const [state, formAction, pending] = useActionState(
    selectMiningCompanyAction,
    initialActionState,
  );

  const fieldError = state.fieldErrors?.companyId;

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="companyId">Empresa minera</Label>
        <Select name="companyId">
          <SelectTrigger
            id="companyId"
            className="w-full"
            aria-invalid={Boolean(fieldError)}
          >
            <SelectValue placeholder="Selecciona tu empresa" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError ? (
          <p className="text-destructive text-xs">{fieldError}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Esta declaración quedará registrada para auditoría.
          </p>
        )}
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        <Building2 className="size-4" />
        {pending ? "Guardando…" : "Confirmar empresa"}
      </Button>
    </form>
  );
}
