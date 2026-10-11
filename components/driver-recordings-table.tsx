import {
  cancelDeletionRequestAction,
  requestDeletionAction,
} from "@/actions/deletions";
import { ActionButton } from "@/components/action-button";
import { RecordingPlayer } from "@/components/recording-player";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, formatRemaining, formatTime } from "@/lib/format";
import type { DriverRecording } from "@/types";

export function DriverRecordingsTable({
  records,
}: {
  records: DriverRecording[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patente</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Hora</TableHead>
          <TableHead>Proveedora</TableHead>
          <TableHead>Video</TableHead>
          <TableHead>Borrado</TableHead>
          <TableHead>Proveedora declaró</TableHead>
          <TableHead>Accesos</TableHead>
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
              {!record.deletedAt && record.storagePath ? (
                <RecordingPlayer
                  videoId={record.id}
                  label={`${record.licensePlate} · ${formatDate(
                    record.recordedAt,
                  )}`}
                />
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </TableCell>
            <TableCell>
              {record.requestStatus === "PENDING" ? (
                <div className="flex flex-col gap-1">
                  <Badge variant="warning">Solicitud pendiente</Badge>
                  {record.scheduledDeletionAt ? (
                    <span className="text-muted-foreground text-xs">
                      Se elimina {formatDate(record.scheduledDeletionAt)} (
                      {formatRemaining(record.scheduledDeletionAt)})
                    </span>
                  ) : null}
                </div>
              ) : record.requestStatus === "DELETED" || record.deletedAt ? (
                <Badge variant="destructive">
                  Eliminado
                  {record.deletedAt
                    ? ` el ${formatDateTime(record.deletedAt)}`
                    : ""}
                </Badge>
              ) : (
                <Badge variant="outline">Disponible</Badge>
              )}
            </TableCell>
            <TableCell>
              {record.providerDeclaredAt ? (
                <Badge variant="success">
                  Sí ({formatDate(record.providerDeclaredAt)})
                </Badge>
              ) : (
                <Badge variant="outline">No</Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {record.accessCount > 0 ? (
                <div className="flex flex-col gap-0.5">
                  <span>{record.accessCount} acceso(s)</span>
                  {record.lastAccessCompanyName ? (
                    <span>
                      {record.lastAccessCompanyName}
                      {record.lastAccessAt
                        ? ` · ${formatDate(record.lastAccessAt)}`
                        : ""}
                    </span>
                  ) : null}
                </div>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-right">
              {record.deletedAt ? (
                <span className="text-muted-foreground text-xs">
                  Datos borrados
                </span>
              ) : record.requestId ? (
                <ActionButton
                  action={cancelDeletionRequestAction}
                  payload={{ requestId: record.requestId }}
                  label="Cancelar solicitud"
                  pendingLabel="Cancelando…"
                  icon="x"
                  variant="ghost"
                />
              ) : (
                <ActionButton
                  action={requestDeletionAction}
                  payload={{ videoId: record.id }}
                  label="Solicitar borrado"
                  pendingLabel="Enviando…"
                  icon="trash"
                  variant="destructive"
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
