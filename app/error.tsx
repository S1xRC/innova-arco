"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ARCO] Error no controlado:", error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <AlertTriangle className="text-destructive mx-auto size-10" />
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="text-muted-foreground text-sm">
          Ocurrió un error inesperado al cargar la página. Puedes intentarlo
          nuevamente.
        </p>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
