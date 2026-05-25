import type { CompanySettings, CompanySettingsFormValues } from "./types";

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const json = text ? safeJsonParse<T & { error?: string }>(text) : null;

  if (!response.ok) {
    const message =
      typeof json === "object" && json && "error" in json
        ? String(json.error)
        : response.statusText || "Erro ao processar a requisicao.";
    throw new Error(message);
  }

  return json as T;
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchCompanySettings() {
  const response = await fetch("/api/company-settings", {
    method: "GET",
  });

  return parseResponse<CompanySettings | null>(response);
}

export async function updateCompanySettings(payload: CompanySettingsFormValues) {
  const response = await fetch("/api/company-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<CompanySettings>(response);
}
