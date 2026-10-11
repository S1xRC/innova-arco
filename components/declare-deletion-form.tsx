"use client";

import { CheckCheck } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { declareProviderDeletionAction } from "@/actions/deletions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

/** Provider declares it deleted the recording from its own systems. */
export function DeclareDeletionForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(
    declareProviderDeletionAction,
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

  const noteId = `note-${requestId}`;

  return (
    <form action={formAction} className="flex w-full flex-col items-end gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="w-full space-y-1">
        <Label htmlFor={noteId} className="text-muted-foreground text-xs">
          Nota (opcional)
        </Label>
        <Input
          id={noteId}
          name="note"
          placeholder="Ej.: borrada del servidor y del respaldo"
          className="h-8 w-full"
          maxLength={500}
          autoComplete="off"
        />
      </div>
      <Button type="submit" size="sm" className="w-full" disabled={pending}>
        <CheckCheck className="size-4" />
        {pending ? "Guardando…" : "Declarar borrado"}
      </Button>
    </form>
  );
}
