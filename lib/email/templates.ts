import { formatLongDateTime } from "@/lib/format";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface EmailRow {
  label: string;
  value: string;
}

export interface EmailLayoutInput {
  subject: string;
  title: string;
  intro: string;
  rows?: EmailRow[];
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rowsHtml(rows: EmailRow[]): string {
  return rows
    .map(
      (row, index) => `
        <tr>
          <td style="padding:12px 0;${
            index > 0 ? "border-top:1px solid #e2e8f0;" : ""
          }font-size:13px;color:#64748b;width:45%;">${escapeHtml(row.label)}</td>
          <td style="padding:12px 0;${
            index > 0 ? "border-top:1px solid #e2e8f0;" : ""
          }font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(
            row.value,
          )}</td>
        </tr>`,
    )
    .join("");
}

/**
 * Renders a simple, responsive HTML email plus its plain-text twin.
 * All transactional emails share this layout.
 */
export function renderEmail(input: EmailLayoutInput): EmailContent {
  const rows = input.rows ?? [];

  const tableHtml = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;padding:0 20px;">${rowsHtml(
        rows,
      )}</table>`
    : "";

  const ctaHtml =
    input.ctaUrl && input.ctaLabel
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
          <tr>
            <td style="border-radius:8px;background-color:#0f172a;">
              <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                ${escapeHtml(input.ctaLabel)}
              </a>
            </td>
          </tr>
        </table>`
      : "";

  const footer = input.footer ?? "Correo automático generado por Innova ARCO.";

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.subject)}</title>
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
                <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(
                  input.title,
                )}</p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">${escapeHtml(
                  input.intro,
                )}</p>
                ${tableHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">${escapeHtml(
                  footer,
                )}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    input.title,
    "",
    input.intro,
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    input.ctaUrl ? `\n${input.ctaLabel ?? "Abrir"}: ${input.ctaUrl}` : "",
    "",
    "— Innova ARCO",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject: input.subject, html, text };
}

/** Invitation to join a company (driver or provider). */
export function buildInvitationEmail(input: {
  companyName: string;
  roleLabel: string;
  acceptUrl: string;
  invitedEmail: string;
}): EmailContent {
  return renderEmail({
    subject: `Invitación de ${input.companyName} — Innova ARCO`,
    title: "Tienes una invitación",
    intro: `${input.companyName} te invitó a la plataforma con el rol de ${input.roleLabel}. Ingresa con tu cuenta de Google usando el correo invitado para aceptarla.`,
    rows: [
      { label: "Empresa", value: input.companyName },
      { label: "Rol", value: input.roleLabel },
      { label: "Correo invitado", value: input.invitedEmail },
    ],
    ctaLabel: "Ir a la plataforma",
    ctaUrl: input.acceptUrl,
  });
}

/** Ticket sent to the camera provider asking to delete the recording. */
export function buildProviderTicketEmail(input: {
  miningName: string;
  licensePlate: string;
  recordedAt: string | Date;
  scheduledDeletionAt: string | Date;
  reviewUrl: string;
}): EmailContent {
  return renderEmail({
    subject: `Solicitud de borrado — patente ${input.licensePlate}`,
    title: "Nueva solicitud de borrado",
    intro: `${input.miningName} registró una solicitud de supresión (ARCO) sobre una grabación asociada a tu empresa. Elimínala también de tus sistemas y márcala en tu bandeja.`,
    rows: [
      { label: "Patente", value: input.licensePlate },
      { label: "Grabación", value: formatLongDateTime(input.recordedAt) },
      {
        label: "Borrado automático",
        value: formatLongDateTime(input.scheduledDeletionAt),
      },
    ],
    ctaLabel: "Abrir bandeja de borrado",
    ctaUrl: input.reviewUrl,
  });
}

/** Confirmation sent when a recording is deleted from the platform. */
export function buildDeletionCompletedEmail(input: {
  licensePlate: string;
  deletedAt: string | Date;
}): EmailContent {
  return renderEmail({
    subject: `Borrado completado — patente ${input.licensePlate}`,
    title: "Borrado completado",
    intro:
      "La grabación se eliminó de la plataforma: se borraron el archivo y la información extra asociada.",
    rows: [
      { label: "Patente", value: input.licensePlate },
      { label: "Fecha de borrado", value: formatLongDateTime(input.deletedAt) },
    ],
  });
}
