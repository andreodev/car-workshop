export type ResendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
};

export class ResendEmailError extends Error {
  details: unknown;

  constructor(message: string, details: unknown) {
    super(message);
    this.name = "ResendEmailError";
    this.details = details;
  }
}

export function parseEmailRecipients(value: string | undefined) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[;,]/)
        .map((recipient) => recipient.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendResendEmail(payload: ResendEmailPayload, idempotencyKey?: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new ResendEmailError("Configure RESEND_API_KEY para enviar emails.", null);
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  let details: unknown = responseText;

  try {
    details = JSON.parse(responseText);
  } catch {
    // Resend usually returns JSON; keep the raw text if a proxy returns another format.
  }

  if (!response.ok) {
    throw new ResendEmailError("Falha ao enviar email pelo Resend.", details);
  }

  return details;
}
