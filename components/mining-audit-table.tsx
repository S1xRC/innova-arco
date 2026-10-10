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
import { formatDate, formatDateTime } from "@/lib/format";
import type { MiningAuditRow } from "@/types";

export function MiningAuditTable({ rows }: { rows: MiningAuditRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Solicitada</TableHead>
          <TableHead>Conductor</TableHead>
          <TableHead>Patente</TableHead>
          <TableHead>Grabación</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Resolución</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDate(row.createdAt)}</TableCell>
            <TableCell className="text-muted-foreground">
              {row.driverEmail}
            </TableCell>
            <TableCell className="font-medium">{row.licensePlate}</TableCell>
            <TableCell>{formatDateTime(row.recordedAt)}</TableCell>
            <TableCell>{row.providerName}</TableCell>
            <TableCell>
              {row.status === "PENDING" ? (
                <Badge variant="warning">{AUDIT_STATUS_LABELS.PENDING}</Badge>
              ) : (
                <Badge variant="success">{AUDIT_STATUS_LABELS.DELETED}</Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {row.resolvedAt ? formatDateTime(row.resolvedAt) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
