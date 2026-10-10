import { ShieldQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <ShieldQuestion className="text-muted-foreground mx-auto size-10" />
        <h1 className="text-xl font-semibold">Página no encontrada</h1>
        <p className="text-muted-foreground text-sm">
          La dirección que buscas no existe o fue movida.
        </p>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
