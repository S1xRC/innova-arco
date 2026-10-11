import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AUDIT_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { MiningClaimRow } from "@/types";

export function MiningClaimsTable({ rows }: { rows: MiningClaimRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Solicitada</TableHead>
          <TableHead>Conductor</TableHead>
          <TableHead>Patente</TableHead>
          <TableHead>Grabación</TableHead>
          <TableHead>Proveedora</TableHead>
          <TableHead>Borrado programado</TableHead>
          <TableHead>Proveedora declaró</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDateTime(row.createdAt)}</TableCell>
            <TableCell className="text-muted-foreground">
              {row.driverEmail}
            </TableCell>
            <TableCell className="font-medium">{row.licensePlate}</TableCell>
            <TableCell>{formatDateTime(row.recordedAt)}</TableCell>
            <TableCell>{row.providerName ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {row.scheduledDeletionAt
                ? formatDateTime(row.scheduledDeletionAt)
                : "—"}
            </TableCell>
            <TableCell>
              {row.providerDeclaredAt ? (
                <Badge variant="success">Sí</Badge>
              ) : (
                <Badge variant="outline">No</Badge>
              )}
            </TableCell>
            <TableCell>
              {row.status === "PENDING" ? (
                <Badge variant="warning">{AUDIT_STATUS_LABELS.PENDING}</Badge>
              ) : (
                <Badge variant="success">{AUDIT_STATUS_LABELS.DELETED}</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
