import { Resend } from "resend";

import {
  buildDeletionCompletedEmail,
  buildInvitationEmail,
  buildProviderTicketEmail,
  type EmailContent,
} from "@/lib/email/templates";

let cachedClient: Resend | null = null;

/**
 * Email is completely optional: the app works without Resend. When no API key
 * is configured, invites are accepted from inside the app and every action
 * still succeeds — notifications are simply skipped (and logged).
 */
export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Innova ARCO <onboarding@resend.dev>"
  );
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }

  return cachedClient;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  reason?: string;
}

/** Best-effort send. Never throws. */
async function send(to: string, content: EmailContent): Promise<SendEmailResult> {
  const client = getResendClient();

  if (!client) {
    return { sent: false, reason: "RESEND_API_KEY no está configurada" };
  }

  if (!to || !to.includes("@")) {
    return { sent: false, reason: "Destinatario inválido" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromAddress(),
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (error) {
      return { sent: false, reason: error.message };
    }

    return { sent: true, id: data?.id };
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

export async function sendInvitationEmail(
  to: string,
  input: Parameters<typeof buildInvitationEmail>[0],
): Promise<SendEmailResult> {
  return send(to, buildInvitationEmail(input));
}

export async function sendProviderTicketEmail(
  to: string,
  input: Parameters<typeof buildProviderTicketEmail>[0],
): Promise<SendEmailResult> {
  return send(to, buildProviderTicketEmail(input));
}

export async function sendDeletionCompletedEmail(
  to: string,
  input: Parameters<typeof buildDeletionCompletedEmail>[0],
): Promise<SendEmailResult> {
  return send(to, buildDeletionCompletedEmail(input));
}
