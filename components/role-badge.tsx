import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/types";

const VARIANTS: Record<UserRole, "default" | "secondary" | "outline"> = {
  DRIVER: "secondary",
  PROVIDER: "default",
  MINING: "outline",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={VARIANTS[role]}>{ROLE_LABELS[role]}</Badge>;
}
