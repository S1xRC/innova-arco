import { DeclareDeletionForm } from "@/components/declare-deletion-form";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ProviderDeletionTicket } from "@/types";

export function ProviderDeletionsTable({
  tickets,
}: {
  tickets: ProviderDeletionTicket[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Solicitada</TableHead>
          <TableHead>Minera</TableHead>
          <TableHead>Patente</TableHead>
          <TableHead>Grabación</TableHead>
          <TableHead>Borrado en plataforma</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Borrado en tus sistemas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
            <TableCell className="text-muted-foreground">
              {ticket.miningName}
            </TableCell>
            <TableCell className="font-medium">{ticket.licensePlate}</TableCell>
            <TableCell>{formatDateTime(ticket.recordedAt)}</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {ticket.scheduledDeletionAt
                ? formatDateTime(ticket.scheduledDeletionAt)
                : "—"}
            </TableCell>
            <TableCell>
              {ticket.status === "PENDING" ? (
                <Badge variant="warning">{STATUS_LABELS.PENDING}</Badge>
              ) : (
                <Badge variant="success">{STATUS_LABELS.DELETED}</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {ticket.providerDeclaredAt ? (
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="success">
                    Declarado {formatDateTime(ticket.providerDeclaredAt)}
                  </Badge>
                  {ticket.providerNote ? (
                    <span className="text-muted-foreground text-xs">
                      {ticket.providerNote}
                    </span>
                  ) : null}
                </div>
              ) : (
                <DeclareDeletionForm requestId={ticket.id} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
