"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { requestDeletionAction } from "@/actions/driver";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/types/actions";

export function RequestDeletionButton({
  videoId,
  pending = false,
}: {
  videoId: string;
  pending?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    requestDeletionAction,
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
      <input type="hidden" name="videoId" value={videoId} />
      <Button
        type="submit"
        size="sm"
        variant="destructive"
        disabled={isPending || pending}
      >
        <Trash2 className="size-4" />
        {isPending ? "Enviando…" : "Solicitar borrado"}
      </Button>
    </form>
  );
}
