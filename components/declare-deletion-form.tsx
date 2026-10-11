"use client";

import { CheckCheck } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { declareProviderDeletionAction } from "@/actions/deletions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <Input
        name="note"
        placeholder="Nota (opcional)"
        className="h-8 max-w-40"
        autoComplete="off"
      />
      <Button type="submit" size="sm" disabled={pending}>
        <CheckCheck className="size-4" />
        {pending ? "Guardando…" : "Declarar borrado"}
      </Button>
    </form>
  );
}
