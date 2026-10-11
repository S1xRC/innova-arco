import { revokeMembershipAction } from "@/actions/invitations";
import { ActionButton } from "@/components/action-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MEMBERSHIP_STATUS_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { CompanyMember } from "@/types";

export function MembersTable({ members }: { members: CompanyMember[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Correo</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Alta</TableHead>
          <TableHead className="text-right">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="font-medium">{member.email}</TableCell>
            <TableCell>{ROLE_LABELS[member.role]}</TableCell>
            <TableCell>
              {member.status === "ACTIVE" ? (
                <Badge variant="success">
                  {MEMBERSHIP_STATUS_LABELS.ACTIVE}
                </Badge>
              ) : member.status === "INVITED" ? (
                <Badge variant="warning">
                  {MEMBERSHIP_STATUS_LABELS.INVITED}
                </Badge>
              ) : (
                <Badge variant="outline">
                  {MEMBERSHIP_STATUS_LABELS.REVOKED}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {member.acceptedAt ? formatDate(member.acceptedAt) : "Pendiente"}
            </TableCell>
            <TableCell className="text-right">
              {member.status === "REVOKED" ? (
                <span className="text-muted-foreground text-xs">—</span>
              ) : (
                <ActionButton
                  action={revokeMembershipAction}
                  payload={{ membershipId: member.id }}
                  label="Revocar"
                  pendingLabel="Revocando…"
                  icon="shield-off"
                  variant="ghost"
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
