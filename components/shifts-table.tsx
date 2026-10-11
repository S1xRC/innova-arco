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
import { deleteShiftAction } from "@/actions/shifts";
import { formatDateTime } from "@/lib/format";
import type { ShiftRow } from "@/types";

export function ShiftsTable({ shifts }: { shifts: ShiftRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Conductor</TableHead>
          <TableHead>Patente</TableHead>
          <TableHead>Inicio</TableHead>
          <TableHead>Grabación</TableHead>
          <TableHead>Nota</TableHead>
          <TableHead className="text-right">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shifts.map((shift) => (
          <TableRow key={shift.id}>
            <TableCell className="text-muted-foreground">
              {shift.driverName ?? shift.driverEmail}
            </TableCell>
            <TableCell className="font-medium">{shift.licensePlate}</TableCell>
            <TableCell>{formatDateTime(shift.startsAt)}</TableCell>
            <TableCell>
              {shift.videoDeletedAt ? (
                <Badge variant="destructive">Grabación eliminada</Badge>
              ) : shift.matchedVideoId ? (
                <Badge variant="success">Grabación asignada</Badge>
              ) : (
                <Badge variant="outline">Sin grabación</Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {shift.notes ?? "—"}
            </TableCell>
            <TableCell className="text-right">
              <ActionButton
                action={deleteShiftAction}
                payload={{ shiftId: shift.id }}
                label="Eliminar"
                pendingLabel="Eliminando…"
                icon="trash"
                variant="ghost"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
