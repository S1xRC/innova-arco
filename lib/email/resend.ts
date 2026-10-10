import { Resend } from "resend";

import {
  buildDeletionRequestEmail,
  buildDeletionRequestSubject,
  buildDeletionRequestText,
  type DeletionRequestEmailData,
} from "@/lib/email/templates";

let cachedClient: Resend | null = null;

/**
 * Returns a lazily-created Resend client, or `null` when `RESEND_API_KEY`
 * is not configured. Email delivery is best-effort: the ARCO request itself
 * is always persisted, even if the notification cannot be sent.
 */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }

  return cachedClient;
}

export function getFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Innova ARCO <onboarding@resend.dev>"
  );
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  reason?: string;
}

export async function sendDeletionNotification(
  data: DeletionRequestEmailData,
  to: string,
): Promise<SendEmailResult> {
  const client = getResendClient();

  if (!client) {
    return { sent: false, reason: "RESEND_API_KEY no está configurada" };
  }

  if (!to || !to.includes("@")) {
    return {
      sent: false,
      reason: "El proveedor no tiene un correo de soporte configurado",
    };
  }

  try {
    const { data: result, error } = await client.emails.send({
      from: getFromAddress(),
      to,
      subject: buildDeletionRequestSubject(data),
      html: buildDeletionRequestEmail(data),
      text: buildDeletionRequestText(data),
    });

    if (error) {
      return { sent: false, reason: error.message };
    }

    return { sent: true, id: result?.id };
  } catch (error) {
    return {
      sent: false,
      reason:
        error instanceof Error
          ? error.message
          : "Error desconocido al enviar el correo",
    };
  }
}
