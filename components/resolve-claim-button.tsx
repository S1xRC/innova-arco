"use client";

import { CheckCheck } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { resolveDeletionRequestAction } from "@/actions/provider";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/types/actions";

export function ResolveClaimButton({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(
    resolveDeletionRequestAction,
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
    <form action={formAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <Button type="submit" size="sm" disabled={pending}>
        <CheckCheck className="size-4" />
        {pending ? "Procesando…" : "Marcar como eliminado"}
      </Button>
    </form>
  );
}
