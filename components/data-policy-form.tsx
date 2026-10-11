"use client";

import { Save, Wand2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { updateDataPolicyAction } from "@/actions/company";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_DATA_POLICY_TEXT } from "@/lib/data-policy";
import { formatDateTime } from "@/lib/format";
import { initialActionState } from "@/types/actions";

/**
 * Editor for the company's data processing declaration. When nothing has been
 * published yet the suggested template is preloaded so it can be reviewed and
 * saved in one step.
 */
export function DataPolicyForm({
  content,
  updatedAt,
}: {
  content: string;
  updatedAt: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    updateDataPolicyAction,
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
  const initialContent = content.trim() ? content : DEFAULT_DATA_POLICY_TEXT;

  function insertTemplate() {
    const textarea = formRef.current?.elements.namedItem(
      "content",
    ) as HTMLTextAreaElement | null;

    if (textarea) {
      textarea.value = DEFAULT_DATA_POLICY_TEXT;
      textarea.focus();
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="content">Texto de la declaración</Label>
        <Textarea
          id="content"
          name="content"
          defaultValue={initialContent}
          className="min-h-96 text-xs leading-relaxed"
          required
          aria-invalid={Boolean(errors.content)}
        />
        <p className="text-muted-foreground text-xs">
          {updatedAt
            ? `Última actualización: ${formatDateTime(updatedAt)}.`
            : "Aún no publicada: los conductores verán «Sin declaración publicada»."}{" "}
          Se muestra a los conductores en «Uso de datos».
        </p>
        {errors.content ? (
          <p className="text-destructive text-xs">{errors.content}</p>
        ) : null}
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Guardando…" : "Guardar declaración"}
        </Button>
        <Button type="button" variant="outline" onClick={insertTemplate}>
          <Wand2 className="size-4" />
          Insertar plantilla sugerida
        </Button>
      </div>
    </form>
  );
}
