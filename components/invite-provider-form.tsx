"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { inviteProviderAction } from "@/actions/invitations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

/**
 * The mining company invites the camera provider it contracts. The provider is
 * created on the fly if it does not exist yet.
 */
export function InviteProviderForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    inviteProviderAction,
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
        <Label htmlFor="providerName">Nombre de la proveedora</Label>
        <Input
          id="providerName"
          name="name"
          placeholder="SafeDrive Cámaras SpA"
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? (
          <p className="text-destructive text-xs">{errors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="providerEmail">Correo de contacto</Label>
        <Input
          id="providerEmail"
          name="email"
          type="email"
          placeholder="contacto@proveedora.cl"
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? (
          <p className="text-destructive text-xs">{errors.email}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            La proveedora acepta la relación al iniciar sesión con ese correo.
          </p>
        )}
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        <Send className="size-4" />
        {pending ? "Enviando…" : "Invitar proveedora"}
      </Button>
    </form>
  );
}
