import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { AccessLogRow } from "@/types";

export function AccessLogTable({ rows }: { rows: AccessLogRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha de acceso</TableHead>
          <TableHead>Grabación</TableHead>
          <TableHead>Patente</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>Empresa</TableHead>
          <TableHead>Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDateTime(row.createdAt)}</TableCell>
            <TableCell>{formatDateTime(row.recordedAt)}</TableCell>
            <TableCell className="font-medium">{row.licensePlate}</TableCell>
            <TableCell className="text-muted-foreground">
              {row.userEmail}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.companyName ?? "—"}
            </TableCell>
            <TableCell>
              {row.action === "DOWNLOAD" ? (
                <Badge variant="warning">Descarga</Badge>
              ) : (
                <Badge variant="secondary">Visualización</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
