export type EmailDomainStatus = "NOT_CONFIGURED" | "PENDING" | "VERIFIED";

export type EmailSettings = {
  id: string;
  tenantId: string;
  fromName: string | null;
  fromAddress: string | null;
  replyTo: string | null;
  notificationsEnabled: boolean;
  notificationEmails: string | null;
  emailDomain: string | null;
  emailDomainStatus: EmailDomainStatus;
  createdAt: string;
  updatedAt: string;
};

export type EmailSettingsStatus = {
  configured: boolean;
  severity: "success" | "warning" | "error";
  summary: string;
  provider: {
    name: "resend";
    configured: boolean;
    apiKeyConfigured: boolean;
  };
  sender: {
    configured: boolean;
    fromAddress: string | null;
    fromName: string | null;
  };
  notifications: {
    enabled: boolean;
    ready: boolean;
    recipientCount: number;
    hasInvalidRecipients: boolean;
  };
  domain: {
    configured: boolean;
    status: EmailDomainStatus;
  };
  checks: Array<{
    key: string;
    label: string;
    ok: boolean;
    message: string;
  }>;
};

export type EmailSettingsResponse = {
  settings: EmailSettings | null;
  status: EmailSettingsStatus;
};

export type EmailSettingsFormValues = {
  fromName: string;
  fromAddress: string;
  replyTo: string;
  notificationsEnabled: boolean;
  notificationEmails: string;
  emailDomain: string;
};

export type EmailSettingsFormErrors = Partial<Record<keyof EmailSettingsFormValues, string>>;
