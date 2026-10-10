import { formatLongDateTime } from "@/lib/format";

export interface DeletionRequestEmailData {
  requestId: string;
  providerName: string;
  driverEmail: string;
  licensePlate: string;
  recordedAt: Date | string;
  requestedAt: Date | string;
  reviewUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildDeletionRequestSubject(
  data: DeletionRequestEmailData,
): string {
  return `Nueva solicitud de borrado ARCO — patente ${data.licensePlate}`;
}

export function buildDeletionRequestText(
  data: DeletionRequestEmailData,
): string {
  return [
    `Hola equipo de ${data.providerName},`,
    "",
    "Un conductor ha ejercido su derecho de supresión (ARCO) sobre un registro de video.",
    "",
    `Patente del camión: ${data.licensePlate}`,
    `Correo del conductor: ${data.driverEmail}`,
    `Fecha de grabación: ${formatLongDateTime(data.recordedAt)}`,
    `Fecha de la solicitud: ${formatLongDateTime(data.requestedAt)}`,
    `ID de la solicitud: ${data.requestId}`,
    "",
    "Ingresa a tu bandeja de reclamos para procesar la solicitud:",
    data.reviewUrl,
    "",
    "— Innova ARCO",
  ].join("\n");
}

export function buildDeletionRequestEmail(
  data: DeletionRequestEmailData,
): string {
  const rows: Array<[string, string]> = [
    ["Patente del camión", data.licensePlate],
    ["Correo del conductor", data.driverEmail],
    ["Fecha de grabación", formatLongDateTime(data.recordedAt)],
    ["Fecha de la solicitud", formatLongDateTime(data.requestedAt)],
    ["ID de la solicitud", data.requestId],
  ];

  const rowsHtml = rows
    .map(
      ([label, value], index) => `
        <tr>
          <td style="padding:12px 0;${
            index > 0 ? "border-top:1px solid #e2e8f0;" : ""
          }font-size:13px;color:#64748b;width:45%;">${escapeHtml(label)}</td>
          <td style="padding:12px 0;${
            index > 0 ? "border-top:1px solid #e2e8f0;" : ""
          }font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Solicitud de borrado ARCO</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
            <tr>
              <td style="background-color:#0f172a;padding:24px 32px;">
                <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">Innova ARCO</p>
                <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">Gestión de derechos de datos</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a;">Nueva solicitud de borrado</p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">
                  Hola equipo de <strong>${escapeHtml(data.providerName)}</strong>, un conductor ha ejercido
                  su derecho de <strong>supresión (ARCO)</strong> sobre un registro de video que su
                  empresa subió a la plataforma.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;padding:0 20px;">
                  ${rowsHtml}
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:8px;background-color:#0f172a;">
                      <a href="${escapeHtml(data.reviewUrl)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                        Revisar en la bandeja de reclamos
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Por cumplimiento de la Ley de Protección de Datos Personales, procesa esta solicitud
                  a la brevedad. Una vez eliminado el registro, márcalo como resuelto en la plataforma.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">
                  Correo automático generado por Innova ARCO. No respondas a este mensaje.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
