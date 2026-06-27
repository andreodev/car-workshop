import type { SendEmailOptions } from "../types/email.types";

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<unknown>;
  getConfigurationStatus?(): EmailProviderConfigurationStatus;
}

export type EmailProviderConfigurationStatus = {
  provider: "resend";
  apiKeyConfigured: boolean;
  configured: boolean;
};
