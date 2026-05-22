import type {
  FinancialAccount,
  FinancialAccountFormValues,
  FinancialAccountListResponse,
  FinancialAccountStatus,
  FinancialAccountType,
} from "./types";

const DEFAULT_PAGE_SIZE = 10;

function toQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

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

export async function fetchFinancialAccounts(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: FinancialAccountType | "TODOS";
  status?: FinancialAccountStatus | "TODOS";
  from?: string;
  to?: string;
}) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    type: params.type === "TODOS" ? undefined : params.type,
    status: params.status === "TODOS" ? undefined : params.status,
    from: params.from,
    to: params.to,
  });

  const response = await fetch(`/api/financial-accounts?${query}`, {
    method: "GET",
  });

  return parseResponse<FinancialAccountListResponse>(response);
}

export async function fetchFinancialAccount(id: string) {
  const response = await fetch(`/api/financial-accounts/${id}`, {
    method: "GET",
  });

  return parseResponse<FinancialAccount>(response);
}

export async function createFinancialAccount(payload: FinancialAccountFormValues) {
  const response = await fetch("/api/financial-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<FinancialAccount>(response);
}

export async function updateFinancialAccount(id: string, payload: FinancialAccountFormValues) {
  const response = await fetch(`/api/financial-accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<FinancialAccount>(response);
}

export async function updateFinancialAccountStatus(
  id: string,
  status: FinancialAccountStatus
) {
  const response = await fetch(`/api/financial-accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  return parseResponse<FinancialAccount>(response);
}

export async function deleteFinancialAccount(id: string) {
  const response = await fetch(`/api/financial-accounts/${id}`, {
    method: "DELETE",
  });

  return parseResponse<{ ok: boolean }>(response);
}
