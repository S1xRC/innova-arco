import { ProviderUploadForm } from "@/components/provider-upload-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { toDateInputValue, toTimeInputValue } from "@/lib/format";

export const metadata = { title: "Subir metadatos" };

export default async function ProviderUploadPage() {
  await requireRole(["PROVIDER"]);

  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Subir metadatos de video
        </h1>
        <p className="text-muted-foreground text-sm">
          Simula la ingesta desde tus cámaras. Los conductores verán este
          registro en su panel automáticamente al coincidir el correo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo registro</CardTitle>
          <CardDescription>
            Todos los campos son obligatorios. La fecha y hora se interpretan en
            horario de Chile continental.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderUploadForm
            defaultDate={toDateInputValue(now)}
            defaultTime={toTimeInputValue(now)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
