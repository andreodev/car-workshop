import { api } from "@/shared/api";

import type {
  EmailSettingsFormValues,
  EmailSettingsResponse,
} from "../types/email-settings.types";

export async function fetchEmailSettings() {
  const { data } = await api.get<EmailSettingsResponse>("/email-settings");

  return data;
}

export async function updateEmailSettings(payload: EmailSettingsFormValues) {
  const { data } = await api.put<EmailSettingsResponse>("/email-settings", payload);

  return data;
}
