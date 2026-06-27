import { prisma } from "@/app/lib/prisma";

import { ResendProvider } from "../providers/resend.provider";
import type { EmailProvider } from "../providers/email-provider.interface";
import type {
  EmailSendResult,
  InternalNotificationPurpose,
  SendEmailOptions,
  TenantEmailSettings,
} from "../types/email.types";
import {
  hasInvalidEmailRecipient,
  normalizeEmailRecipients,
} from "../utils/email-recipients";

function logEmailInfo(message: string, context: Record<string, unknown>) {
  console.info(`[email] ${message}`, context);
}

function logEmailError(message: string, context: Record<string, unknown>) {
  console.error(`[email] ${message}`, context);
}

export class EmailService {
  constructor(private readonly provider: EmailProvider = new ResendProvider()) {}

  getProviderConfigurationStatus() {
    return (
      this.provider.getConfigurationStatus?.() ?? {
        provider: "resend" as const,
        apiKeyConfigured: false,
        configured: false,
      }
    );
  }

  async sendTransactionalEmail(options: SendEmailOptions & { tenantId: string }) {
    const settings = await this.resolveTenantEmailSettings(options.tenantId);

    if (!settings) {
      logEmailInfo("envio transacional ignorado: tenant inexistente", {
        tenantId: options.tenantId,
      });

      return {
        sent: false,
        recipients: [],
        skippedReason: "tenant-not-found",
      } satisfies EmailSendResult;
    }

    return this.send({
      ...options,
      fromAddress: options.fromAddress ?? settings.fromAddress,
      fromName: options.fromName ?? this.resolveFromName(settings),
      replyTo: options.replyTo ?? this.resolveReplyTo(settings),
    });
  }

  async sendInternalNotification(
    options: Omit<SendEmailOptions, "to"> & {
      tenantId: string;
      purpose: InternalNotificationPurpose;
    }
  ) {
    const settings = await this.resolveTenantEmailSettings(options.tenantId);

    if (!settings) {
      logEmailInfo("notificacao ignorada: tenant inexistente", {
        tenantId: options.tenantId,
        purpose: options.purpose,
      });

      return {
        sent: false,
        recipients: [],
        skippedReason: "tenant-not-found",
      } satisfies EmailSendResult;
    }

    if (!settings.notificationsEnabled) {
      logEmailInfo("notificacao ignorada: envio desativado", {
        tenantId: options.tenantId,
        purpose: options.purpose,
      });

      return {
        sent: false,
        recipients: [],
        skippedReason: "notifications-disabled",
      } satisfies EmailSendResult;
    }

    return this.send({
      ...options,
      to: settings.notificationEmails ?? "",
      fromAddress: options.fromAddress ?? settings.fromAddress,
      fromName: options.fromName ?? this.resolveFromName(settings),
      replyTo: options.replyTo ?? this.resolveReplyTo(settings),
    });
  }

  private async send(options: SendEmailOptions): Promise<EmailSendResult> {
    const recipients = normalizeEmailRecipients(options.to);

    if (recipients.length === 0) {
      logEmailInfo("envio ignorado: nenhum destinatario", {
        subject: options.subject,
      });

      return {
        sent: false,
        recipients,
        skippedReason: "missing-recipient",
      };
    }

    if (hasInvalidEmailRecipient(recipients)) {
      logEmailInfo("envio ignorado: destinatario invalido", {
        subject: options.subject,
        recipientCount: recipients.length,
      });

      return {
        sent: false,
        recipients,
        skippedReason: "invalid-recipient",
      };
    }

    try {
      const providerResult = await this.provider.send({
        ...options,
        to: recipients,
      });

      logEmailInfo("email enviado com sucesso", {
        subject: options.subject,
        recipientCount: recipients.length,
      });

      return {
        sent: true,
        recipients,
        providerResult,
      };
    } catch (error) {
      logEmailError("falha ao enviar email", {
        subject: options.subject,
        recipientCount: recipients.length,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });

      throw error;
    }
  }

  private async resolveTenantEmailSettings(
    tenantId: string
  ): Promise<TenantEmailSettings | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        emailSettings: {
          select: {
            fromName: true,
            fromAddress: true,
            replyTo: true,
            notificationsEnabled: true,
            notificationEmails: true,
            emailDomain: true,
            emailDomainStatus: true,
          },
        },
        companySettings: {
          select: {
            legalName: true,
            tradeName: true,
            email: true,
          },
        },
      },
    });

    if (!tenant) {
      return null;
    }

    const emailSettings = tenant.emailSettings;
    const companySettings = tenant.companySettings;
    const companyName =
      companySettings?.tradeName || companySettings?.legalName || tenant.name;

    return {
      tenantId: tenant.id,
      companyName,
      fromName: emailSettings?.fromName ?? null,
      fromAddress: emailSettings?.fromAddress ?? null,
      replyTo: emailSettings?.replyTo ?? null,
      supportEmail: companySettings?.email ?? null,
      notificationsEnabled: emailSettings?.notificationsEnabled ?? false,
      notificationEmails: emailSettings?.notificationEmails ?? null,
      emailDomain: emailSettings?.emailDomain ?? null,
      emailDomainStatus: emailSettings?.emailDomainStatus ?? "NOT_CONFIGURED",
    };
  }

  private resolveFromName(settings: TenantEmailSettings) {
    return settings.fromName || settings.companyName;
  }

  private resolveReplyTo(settings: TenantEmailSettings) {
    return settings.replyTo || settings.supportEmail || null;
  }
}

export const emailService = new EmailService();
