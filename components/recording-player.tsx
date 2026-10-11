"use client";

import { Eye, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Inline "view" action for a recording.
 *
 * The `<video>` is mounted only when opened and points at the app's own proxy
 * route (`/api/recordings/<id>`), so the Storage URL is never exposed. The
 * download affordances are hidden and the context menu disabled as a friction
 * measure (it is not DRM: a determined user can still capture the stream).
 */
export function RecordingPlayer({
  videoId,
  label,
}: {
  videoId: string;
  label?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const [failed, setFailed] = useState(false);

  function open() {
    setFailed(false);
    setMounted(true);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
    setMounted(false);
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={open}>
        <Eye className="size-4" />
        Ver
      </Button>

      <dialog
        ref={dialogRef}
        className="bg-card text-card-foreground w-[92vw] max-w-3xl rounded-lg border p-0 shadow-lg backdrop:bg-black/70"
      >
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium">
              {label ?? "Grabación"}
            </p>
            <Button type="button" size="sm" variant="ghost" onClick={close}>
              <X className="size-4" />
              Cerrar
            </Button>
          </div>

          {failed ? (
            <p className="text-destructive text-sm">
              No se pudo reproducir la grabación (formato no soportado). Es
              posible que el archivo no sea MP4/H.264.
            </p>
          ) : mounted ? (
            <video
              className="max-h-[70vh] w-full rounded-md bg-black"
              src={`/api/recordings/${videoId}`}
              controls
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              preload="metadata"
              onContextMenu={(event) => event.preventDefault()}
              onError={() => setFailed(true)}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
