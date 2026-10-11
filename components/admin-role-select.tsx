"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { adminSetRoleAction } from "@/actions/roles";
import { ROLE_LABELS } from "@/lib/constants";
import { initialActionState } from "@/types/actions";
import type { UserRole } from "@/types";

const ROLES: UserRole[] = ["DRIVER", "PROVIDER", "MINING"];

/** Platform admin free-form role assignment. */
export function AdminRoleSelect({
  userId,
  role,
}: {
  userId: string;
  role: UserRole;
}) {
  const [state, formAction, pending] = useActionState(
    adminSetRoleAction,
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
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="border-input bg-background h-8 rounded-md border px-2 text-sm"
      >
        {ROLES.map((item) => (
          <option key={item} value={item}>
            {ROLE_LABELS[item]}
          </option>
        ))}
      </select>
    </form>
  );
}
