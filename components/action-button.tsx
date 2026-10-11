"use client";

import {
  Check,
  CheckCheck,
  Clock,
  RefreshCw,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/types/actions";

export type ActionButtonIcon =
  | "check"
  | "trash"
  | "x"
  | "clock"
  | "refresh"
  | "shield-off"
  | "double-check";

const ICONS: Record<ActionButtonIcon, React.ComponentType<{ className?: string }>> = {
  check: Check,
  trash: Trash2,
  x: X,
  clock: Clock,
  refresh: RefreshCw,
  "shield-off": ShieldOff,
  "double-check": CheckCheck,
};

export type ServerAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

/**
 * Small client wrapper that submits a Server Action from a button (with hidden
 * payload fields) and surfaces the result as a toast. Used for every row-level
 * action (request deletion, cancel, revoke, delete shift, ...).
 */
export function ActionButton({
  action,
  payload = {},
  label,
  pendingLabel,
  variant = "outline",
  size = "sm",
  icon,
  disabled = false,
}: {
  action: ServerAction;
  payload?: Record<string, string>;
  label: string;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  icon?: ActionButtonIcon;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    action,
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

  const Icon = icon ? ICONS[icon] : null;

  return (
    <form action={formAction}>
      {Object.entries(payload).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button
        type="submit"
        variant={variant}
        size={size}
        disabled={pending || disabled}
      >
        {Icon ? <Icon className="size-4" /> : null}
        {pending ? (pendingLabel ?? "Procesando…") : label}
      </Button>
    </form>
  );
}
