"use client";

import { Building2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { setActiveCompanyAction } from "@/actions/roles";
import { initialActionState } from "@/types/actions";
import type { MembershipSummary } from "@/types";

/**
 * Lets a user switch between the companies they belong to. Each company carries
 * its own role, so switching also switches the effective role.
 */
export function CompanySwitcher({
  memberships,
  activeCompanyId,
}: {
  memberships: MembershipSummary[];
  activeCompanyId: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    setActiveCompanyAction,
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

  const active = memberships.filter((item) => item.status === "ACTIVE");

  if (active.length <= 1) {
    return null;
  }

  return (
    <form action={formAction} className="hidden sm:block">
      <label className="relative flex items-center">
        <Building2 className="text-muted-foreground pointer-events-none absolute left-2 size-4" />
        <select
          name="companyId"
          defaultValue={activeCompanyId ?? active[0]?.companyId}
          disabled={pending}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="border-input bg-background h-8 max-w-44 rounded-md border pr-2 pl-8 text-sm"
        >
          {active.map((item) => (
            <option key={item.companyId} value={item.companyId}>
              {item.companyName}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
