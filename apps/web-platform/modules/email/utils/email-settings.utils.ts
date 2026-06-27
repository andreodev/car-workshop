import type {
  EmailDomainStatus,
  EmailSettings,
  EmailSettingsFormValues,
} from "../types/email-settings.types";

export const emptyEmailSettingsForm: EmailSettingsFormValues = {
  fromName: "",
  fromAddress: "",
  replyTo: "",
  notificationsEnabled: false,
  notificationEmails: "",
  emailDomain: "",
};

const textLimits = {
  fromName: 120,
  fromAddress: 255,
  replyTo: 255,
  notificationEmails: 1000,
  emailDomain: 255,
} satisfies Partial<Record<keyof EmailSettingsFormValues, number>>;

export function mapEmailSettingsToFormValues(
  settings: EmailSettings | null
): EmailSettingsFormValues {
  if (!settings) {
    return emptyEmailSettingsForm;
  }

  return {
    fromName: settings.fromName ?? "",
    fromAddress: settings.fromAddress ?? "",
    replyTo: settings.replyTo ?? "",
    notificationsEnabled: settings.notificationsEnabled,
    notificationEmails: settings.notificationEmails ?? "",
    emailDomain: settings.emailDomain ?? "",
  };
}

export function maskEmailSettingsField<K extends keyof EmailSettingsFormValues>(
  field: K,
  value: EmailSettingsFormValues[K]
) {
  if (typeof value !== "string") {
    return value;
  }

  const max = textLimits[field as keyof typeof textLimits] ?? value.length;

  if (
    field === "fromAddress" ||
    field === "replyTo" ||
    field === "notificationEmails" ||
    field === "emailDomain"
  ) {
    return limitText(value.trimStart().toLowerCase(), max) as EmailSettingsFormValues[K];
  }

  return limitText(value, max) as EmailSettingsFormValues[K];
}

export function formatEmailDomainStatus(status: EmailDomainStatus) {
  const labels = {
    NOT_CONFIGURED: "Nao configurado",
    PENDING: "Pendente",
    VERIFIED: "Verificado",
  } satisfies Record<EmailDomainStatus, string>;

  return labels[status];
}

function limitText(value: string, max: number) {
  return value.slice(0, max);
}
