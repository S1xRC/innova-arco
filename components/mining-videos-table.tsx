import { deleteRecordingNowAction } from "@/actions/videos";
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
import { formatMegabytes } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { MiningVideoRow } from "@/types";

function extraInfoLabel(extraInfo: MiningVideoRow["extraInfo"]): string {
  if (!extraInfo) {
    return "—";
  }

  try {
    const text = JSON.stringify(extraInfo);
    return text === "{}" ? "—" : text;
  } catch {
    return "—";
  }
}

export function MiningVideosTable({ videos }: { videos: MiningVideoRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Identificador</TableHead>
          <TableHead>Patente</TableHead>
          <TableHead>Grabación</TableHead>
          <TableHead>Conductor</TableHead>
          <TableHead>Proveedora</TableHead>
          <TableHead>Info extra</TableHead>
          <TableHead>Tamaño</TableHead>
          <TableHead>Video</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {videos.map((video) => (
          <TableRow key={video.id}>
            <TableCell className="font-mono text-xs">
              {video.externalId ?? "—"}
            </TableCell>
            <TableCell className="font-medium">{video.licensePlate}</TableCell>
            <TableCell>{formatDateTime(video.recordedAt)}</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {video.driverEmail ?? "Sin turno asignado"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {video.providerName ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground max-w-48 truncate text-xs">
              {extraInfoLabel(video.extraInfo)}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {video.storageSize ? formatMegabytes(video.storageSize) : "—"}
            </TableCell>
            <TableCell>
              {!video.deletedAt && video.storagePath ? (
                <RecordingPlayer
                  videoId={video.id}
                  label={`${video.licensePlate} · ${formatDateTime(
                    video.recordedAt,
                  )}`}
                />
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </TableCell>
            <TableCell>
              {video.deletedAt ? (
                <Badge variant="destructive">Eliminada</Badge>
              ) : video.storagePath ? (
                <Badge variant="success">Con archivo</Badge>
              ) : (
                <Badge variant="outline">Solo metadata</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {video.deletedAt ? (
                <span className="text-muted-foreground text-xs">—</span>
              ) : (
                <ActionButton
                  action={deleteRecordingNowAction}
                  payload={{ videoId: video.id }}
                  label="Eliminar ahora"
                  pendingLabel="Eliminando…"
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
