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
import type { Json, MiningVideoRow } from "@/types";

function capitalize(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Reads any JSON value as plain, human readable text. */
function humanizeValue(value: Json | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => humanizeValue(item))
      .filter((part) => part !== "")
      .join(", ");
  }

  return Object.entries(value)
    .map(([key, nested]) => `${key}: ${humanizeValue(nested)}`)
    .join(" · ");
}

/**
 * Renders the "extra info" as readable text instead of raw JSON:
 *   { "nota": "Ruta Norte, Alerta de cansancio" }  ->  "Nota: Ruta Norte, ..."
 *   { "ruta": "norte", "alerta": true }            ->  "ruta: norte · alerta: true"
 */
function extraInfoText(extraInfo: MiningVideoRow["extraInfo"]): string {
  if (extraInfo === null || extraInfo === undefined) {
    return "";
  }

  if (typeof extraInfo === "object" && !Array.isArray(extraInfo)) {
    const entries = Object.entries(extraInfo);
    const first = entries[0];

    // Plain text typed in the form is stored as a single-key object.
    if (entries.length === 1 && first && typeof first[1] === "string") {
      return `${capitalize(first[0])}: ${first[1]}`;
    }
  }

  return humanizeValue(extraInfo);
}

function extraInfoLabel(extraInfo: MiningVideoRow["extraInfo"]): string {
  return extraInfoText(extraInfo) || "—";
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
            <TableCell
              className="text-muted-foreground max-w-80 text-xs break-words whitespace-pre-wrap"
              title={extraInfoText(video.extraInfo) || undefined}
            >
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
