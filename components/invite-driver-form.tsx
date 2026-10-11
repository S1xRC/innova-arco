"use client";

import { MailPlus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { inviteDriverAction } from "@/actions/invitations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

/** Mining company invites a driver by email (accepted on their next sign-in). */
export function InviteDriverForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    inviteDriverAction,
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
        <Label htmlFor="driverEmail">Correo del conductor</Label>
        <Input
          id="driverEmail"
          name="email"
          type="email"
          placeholder="conductor@correo.cl"
          autoComplete="off"
          required
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? (
          <p className="text-destructive text-xs">{errors.email}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            El conductor acepta la invitación al iniciar sesión con ese correo.
          </p>
        )}
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        <MailPlus className="size-4" />
        {pending ? "Invitando…" : "Invitar conductor"}
      </Button>
    </form>
  );
}
