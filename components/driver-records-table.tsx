import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequestDeletionButton } from "@/components/request-deletion-button";
import { formatDate, formatTime } from "@/lib/format";
import type { DriverRecord } from "@/types";

export function DriverRecordsTable({ records }: { records: DriverRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patente</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Hora</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id}>
            <TableCell className="font-medium">{record.licensePlate}</TableCell>
            <TableCell>{formatDate(record.recordedAt)}</TableCell>
            <TableCell>{formatTime(record.recordedAt)}</TableCell>
            <TableCell>{record.providerName}</TableCell>
            <TableCell>
              {record.requestStatus === "PENDING" ? (
                <Badge variant="warning">Solicitud pendiente</Badge>
              ) : record.requestStatus === "DELETED" ? (
                <Badge variant="success">Eliminado</Badge>
              ) : (
                <Badge variant="outline">Sin solicitud</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {record.requestId ? (
                <span className="text-muted-foreground text-xs">
                  Solicitud registrada
                </span>
              ) : (
                <RequestDeletionButton videoId={record.id} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
