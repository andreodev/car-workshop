export type EmailAttachment = {
  filename: string;
  content: string;
};

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  fromAddress?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  idempotencyKey?: string;
};

export type TenantEmailSettings = {
  tenantId: string;
  companyName: string;
  fromName: string | null;
  fromAddress: string | null;
  replyTo: string | null;
  supportEmail: string | null;
  notificationsEnabled: boolean;
  notificationEmails: string | null;
  emailDomain: string | null;
  emailDomainStatus: "NOT_CONFIGURED" | "PENDING" | "VERIFIED";
};

export type TenantBranding = {
  tenantId: string;
  companyName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  website: string | null;
  supportEmail: string | null;
};

export type InternalNotificationPurpose = "daily-report" | "pdv-sale";

export type EmailSendResult =
  | {
      sent: true;
      recipients: string[];
      providerResult: unknown;
    }
  | {
      sent: false;
      recipients: string[];
      skippedReason:
        | "invalid-recipient"
        | "missing-recipient"
        | "notifications-disabled"
        | "tenant-not-found";
    };
