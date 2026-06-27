import type { NextRequest } from "next/server";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";
import {
  emailSettingsSchema,
  toNullableEmailSettingsString,
} from "@/modules/email/utils/email-settings.schema";
import { emailService } from "@/modules/email/services/email.service";
import {
  hasInvalidEmailRecipient,
  normalizeEmailRecipients,
} from "@/modules/email/utils/email-recipients";
import type {
  EmailDomainStatus,
  EmailSettings,
  EmailSettingsStatus,
} from "@/modules/email/types/email-settings.types";

export const dynamic = "force-dynamic";

function buildEmailSettingsStatus(
  settings: EmailSettings | null
): EmailSettingsStatus {
  const provider = emailService.getProviderConfigurationStatus();
  const recipients = normalizeEmailRecipients(settings?.notificationEmails);
  const hasInvalidRecipients = hasInvalidEmailRecipient(recipients);
  const notificationsEnabled = settings?.notificationsEnabled ?? false;
  const fromAddress = settings?.fromAddress?.trim() || null;
  const fromAddressReady = Boolean(fromAddress);
  const notificationsReady =
    notificationsEnabled && recipients.length > 0 && !hasInvalidRecipients;
  const domainStatus = settings?.emailDomainStatus ?? "NOT_CONFIGURED";
  const domainConfigured = Boolean(settings?.emailDomain);
  const checks = [
    {
      key: "settings",
      label: "Configuração do tenant",
      ok: Boolean(settings),
      message: settings
        ? "Registro de configuração criado."
        : "Nenhuma configuração de email foi salva para este tenant.",
    },
    {
      key: "provider",
      label: "Provider da plataforma",
      ok: provider.configured,
      message: provider.configured
        ? "RESEND_API_KEY configurada no ambiente."
        : "Configure RESEND_API_KEY no ambiente da plataforma.",
    },
    {
      key: "sender",
      label: "Remetente do tenant",
      ok: fromAddressReady,
      message: fromAddressReady
        ? `Enviando como ${fromAddress}.`
        : "Cadastre o email remetente que ja esta verificado no Resend.",
    },
    {
      key: "notifications",
      label: "Notificações internas",
      ok: notificationsReady,
      message: notificationsReady
        ? `${recipients.length} destinatario(s) valido(s) para relatorios e avisos.`
        : "Ative as notificações e cadastre pelo menos um destinatário válido.",
    },
    {
      key: "domain",
      label: "Domínio próprio",
      ok: !domainConfigured || domainStatus === "VERIFIED",
      message: domainConfigured
        ? `Domínio informado com status ${formatEmailDomainStatus(domainStatus)}.`
        : "Domínio próprio é opcional nesta etapa; o envio usa o email remetente.",
    },
  ];
  const requiredChecks = checks.filter((check) => check.key !== "domain");
  const configured = requiredChecks.every((check) => check.ok);
  const severity = configured ? "success" : settings ? "warning" : "error";

  return {
    configured,
    severity,
    summary: configured
      ? "Configuração pronta para enviar relatórios e avisos."
      : "Configuração de email incompleta.",
    provider: {
      name: provider.provider,
      configured: provider.configured,
      apiKeyConfigured: provider.apiKeyConfigured,
    },
    sender: {
      configured: fromAddressReady,
      fromAddress,
      fromName: settings?.fromName ?? null,
    },
    notifications: {
      enabled: notificationsEnabled,
      ready: notificationsReady,
      recipientCount: recipients.length,
      hasInvalidRecipients,
    },
    domain: {
      configured: domainConfigured,
      status: domainStatus as EmailDomainStatus,
    },
    checks,
  };
}

function formatEmailDomainStatus(status: EmailDomainStatus) {
  const labels = {
    NOT_CONFIGURED: "Nao configurado",
    PENDING: "Pendente",
    VERIFIED: "Verificado",
  } satisfies Record<EmailDomainStatus, string>;

  return labels[status];
}

function buildEmailSettingsResponse(settings: EmailSettings | null) {
  return {
    settings,
    status: buildEmailSettingsStatus(settings),
  };
}

function serializeEmailSettings(
  settings: Awaited<ReturnType<typeof prisma.tenantEmailSettings.findUnique>>
): EmailSettings | null {
  if (!settings) {
    return null;
  }

  return {
    ...settings,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const settings = await prisma.tenantEmailSettings.findUnique({
    where: { tenantId: tenant.tenantId },
  });

  return Response.json(buildEmailSettingsResponse(serializeEmailSettings(settings)));
}

export async function PUT(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = emailSettingsSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const emailDomain = toNullableEmailSettingsString(parsed.data.emailDomain);
  const data = {
    fromName: toNullableEmailSettingsString(parsed.data.fromName),
    fromAddress: toNullableEmailSettingsString(parsed.data.fromAddress),
    replyTo: toNullableEmailSettingsString(parsed.data.replyTo),
    notificationsEnabled: parsed.data.notificationsEnabled,
    notificationEmails: toNullableEmailSettingsString(parsed.data.notificationEmails),
    emailDomain,
    emailDomainStatus: emailDomain ? ("PENDING" as const) : ("NOT_CONFIGURED" as const),
  };

  const settings = await prisma.tenantEmailSettings.upsert({
    where: { tenantId: tenant.tenantId },
    create: {
      tenantId: tenant.tenantId,
      ...data,
    },
    update: data,
  });

  return Response.json(buildEmailSettingsResponse(serializeEmailSettings(settings)));
}
