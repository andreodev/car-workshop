import { Resend, type CreateEmailOptions } from "resend";

import type {
  EmailProvider,
  EmailProviderConfigurationStatus,
} from "./email-provider.interface";
import type { SendEmailOptions } from "../types/email.types";

export class EmailProviderError extends Error {
  details: unknown;

  constructor(message: string, details: unknown = null) {
    super(message);
    this.name = "EmailProviderError";
    this.details = details;
  }
}

function formatAddress(params: { name?: string | null; address: string }) {
  const name = params.name?.trim();

  if (!name) {
    return params.address;
  }

  return `${name.replaceAll('"', "'")} <${params.address}>`;
}

export class ResendProvider implements EmailProvider {
  getConfigurationStatus(): EmailProviderConfigurationStatus {
    const apiKey = process.env.RESEND_API_KEY;

    return {
      provider: "resend",
      apiKeyConfigured: Boolean(apiKey),
      configured: Boolean(apiKey),
    };
  }

  async send(options: SendEmailOptions) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = options.fromAddress?.trim() || null;

    if (!apiKey) {
      throw new EmailProviderError("Configure RESEND_API_KEY para enviar emails.");
    }

    if (!fromAddress) {
      throw new EmailProviderError("Configure o email remetente do tenant.");
    }

    if (!options.html && !options.text) {
      throw new EmailProviderError("Informe html ou text para enviar emails.");
    }

    const resend = new Resend(apiKey);
    const payload: CreateEmailOptions = options.html
      ? {
          from: formatAddress({ name: options.fromName, address: fromAddress }),
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          ...(options.replyTo ? { replyTo: options.replyTo } : {}),
          ...(options.attachments?.length ? { attachments: options.attachments } : {}),
        }
      : {
          from: formatAddress({ name: options.fromName, address: fromAddress }),
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          text: options.text ?? "",
          ...(options.replyTo ? { replyTo: options.replyTo } : {}),
          ...(options.attachments?.length ? { attachments: options.attachments } : {}),
        };
    const response = await resend.emails.send(
      payload,
      options.idempotencyKey
        ? {
            idempotencyKey: options.idempotencyKey,
          }
        : undefined
    );

    if (response.error) {
      throw new EmailProviderError("Falha ao enviar email pelo Resend.", response.error);
    }

    return response.data;
  }
}
