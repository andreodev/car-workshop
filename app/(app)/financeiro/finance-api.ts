import type {
  CashMovement,
  CashMovementFormValues,
  CashMovementListResponse,
  CashMovementType,
  FinancialAccount,
  FinancialAccountFormValues,
  FinancialAccountListResponse,
  FinancialAccountStatus,
  FinancialAccountType,
  FinancialOpenSummary,
  FinancialCategory,
  FinancialCategoryFormValues,
  FinancialCategoryListResponse,
  FinancialCategoryType,
  MechanicCommissionPeriod,
  MechanicCommissionReport,
  MechanicCommissionStatusFilter,
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

export async function fetchMechanicCommissions(params: {
  period?: MechanicCommissionPeriod;
  status?: MechanicCommissionStatusFilter;
}) {
  const query = toQuery({
    period: params.period,
    status: params.status,
  });

  const response = await fetch(`/api/mechanics/commissions?${query}`, {
    method: "GET",
  });

  return parseResponse<MechanicCommissionReport>(response);
}

export async function fetchFinancialAccount(id: string) {
  const response = await fetch(`/api/financial-accounts/${id}`, {
    method: "GET",
  });

  return parseResponse<FinancialAccount>(response);
}

export async function fetchFinancialOpenSummary() {
  const response = await fetch("/api/financial-open-summary", {
    method: "GET",
  });

  return parseResponse<FinancialOpenSummary>(response);
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

export async function fetchFinancialCategories(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: FinancialCategoryType | "TODOS";
  active?: boolean;
} = {}) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
    search: params.search,
    type: params.type === "TODOS" ? undefined : params.type,
    active: params.active === undefined ? undefined : String(params.active),
  });

  const response = await fetch(`/api/financial-categories?${query}`, {
    method: "GET",
  });

  return parseResponse<FinancialCategoryListResponse>(response);
}

export async function createFinancialCategory(payload: FinancialCategoryFormValues) {
  const response = await fetch("/api/financial-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<FinancialCategory>(response);
}

export async function updateFinancialCategory(
  id: string,
  payload: FinancialCategoryFormValues
) {
  const response = await fetch(`/api/financial-categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<FinancialCategory>(response);
}

export async function updateFinancialCategoryActive(id: string, active: boolean) {
  const response = await fetch(`/api/financial-categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });

  return parseResponse<FinancialCategory>(response);
}

export async function deleteFinancialCategory(id: string) {
  const response = await fetch(`/api/financial-categories/${id}`, {
    method: "DELETE",
  });

  return parseResponse<{ ok: boolean }>(response);
}

export async function fetchCashMovements(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: CashMovementType | "TODOS";
  categoryId?: string;
  from?: string;
  to?: string;
}) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    type: params.type === "TODOS" ? undefined : params.type,
    categoryId: params.categoryId,
    from: params.from,
    to: params.to,
  });

  const response = await fetch(`/api/cash-movements?${query}`, {
    method: "GET",
  });

  return parseResponse<CashMovementListResponse>(response);
}

export async function createCashMovement(payload: CashMovementFormValues) {
  const response = await fetch("/api/cash-movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<CashMovement>(response);
}

export async function updateCashMovement(id: string, payload: CashMovementFormValues) {
  const response = await fetch(`/api/cash-movements/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<CashMovement>(response);
}

export async function deleteCashMovement(id: string) {
  const response = await fetch(`/api/cash-movements/${id}`, {
    method: "DELETE",
  });

  return parseResponse<{ ok: boolean }>(response);
}
