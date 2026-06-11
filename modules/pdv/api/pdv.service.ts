import type {
  CatalogItem,
  CatalogItemFormValues,
  CatalogItemListResponse,
  CatalogItemType,
  Sale,
  SaleListResponse,
  SalePayload,
  SalePaymentPayload,
  SaleStatus,
  Sector,
  SectorFormValues,
  SectorListResponse,
  ServiceOrderPdvResponse,
} from "../types/pdv.types";

const DEFAULT_PAGE_SIZE = 10;

export type CatalogItemsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: CatalogItemType | "TODOS";
  includeInactive?: boolean;
};

export type SectorsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  includeInactive?: boolean;
};

export type SalesParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: SaleStatus | "TODOS";
  from?: string;
  to?: string;
};

type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
  errors?: unknown;
};

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

function stringifyApiMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const message = value.trim();
    return message || null;
  }

  if (Array.isArray(value)) {
    const message = value
      .map((item) => stringifyApiMessage(item))
      .filter(Boolean)
      .join(" ");
    return message || null;
  }

  if (value && typeof value === "object") {
    const record = value as ApiErrorPayload;
    return (
      stringifyApiMessage(record.error) ??
      stringifyApiMessage(record.message) ??
      stringifyApiMessage(record.details) ??
      stringifyApiMessage(record.errors)
    );
  }

  return null;
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as ApiErrorPayload;
  const primary =
    stringifyApiMessage(record.error) ??
    stringifyApiMessage(record.message) ??
    stringifyApiMessage(record.errors);
  const details = stringifyApiMessage(record.details);

  if (primary && details && !primary.includes(details)) {
    return `${primary} ${details}`;
  }

  return primary ?? details ?? fallback;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const json = text ? safeJsonParse<T>(text) : null;

  if (!response.ok) {
    const message = getApiErrorMessage(
      json,
      response.statusText || "Erro ao processar a requisicao."
    );
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

export async function fetchCatalogItems(params: CatalogItemsParams) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    type: params.type === "TODOS" ? undefined : params.type,
    includeInactive: params.includeInactive,
  });

  const response = await fetch(`/api/catalog-items?${query}`, {
    method: "GET",
  });

  return parseResponse<CatalogItemListResponse>(response);
}

export async function createCatalogItem(
  payload: Partial<Omit<CatalogItemFormValues, "name" | "type" | "unitPrice">> & {
    name: string;
    type: CatalogItemType;
    unitPrice: string | number;
  }
) {
  const response = await fetch("/api/catalog-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<CatalogItem>(response);
}

export async function fetchCatalogItem(id: string) {
  const response = await fetch(`/api/catalog-items/${id}`, {
    method: "GET",
  });

  return parseResponse<CatalogItem>(response);
}

export async function updateCatalogItem(id: string, payload: CatalogItemFormValues) {
  const response = await fetch(`/api/catalog-items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<CatalogItem>(response);
}

export async function addCatalogItemStock(
  id: string,
  payload: { quantity: string | number; notes?: string }
) {
  const response = await fetch(`/api/catalog-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "ADD_STOCK",
      ...payload,
    }),
  });

  return parseResponse<CatalogItem>(response);
}

export async function deleteCatalogItem(id: string) {
  const response = await fetch(`/api/catalog-items/${id}`, {
    method: "DELETE",
  });

  return parseResponse<{ ok: boolean }>(response);
}

export async function fetchSectors(params: SectorsParams) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    includeInactive: params.includeInactive,
  });

  const response = await fetch(`/api/sectors?${query}`, {
    method: "GET",
  });

  return parseResponse<SectorListResponse>(response);
}

export async function fetchSector(id: string) {
  const response = await fetch(`/api/sectors/${id}`, {
    method: "GET",
  });

  return parseResponse<Sector>(response);
}

export async function createSector(payload: SectorFormValues) {
  const response = await fetch("/api/sectors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Sector>(response);
}

export async function updateSector(id: string, payload: SectorFormValues) {
  const response = await fetch(`/api/sectors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Sector>(response);
}

export async function deleteSector(id: string) {
  const response = await fetch(`/api/sectors/${id}`, {
    method: "DELETE",
  });

  return parseResponse<{ ok: boolean }>(response);
}

export async function fetchSales(params: SalesParams) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    status: params.status,
    from: params.from,
    to: params.to,
  });

  const response = await fetch(`/api/sales?${query}`, {
    method: "GET",
  });

  return parseResponse<SaleListResponse>(response);
}

export async function createSale(payload: SalePayload) {
  const response = await fetch("/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Sale>(response);
}

export async function updateSaleStatus(id: string, status: SaleStatus) {
  const response = await fetch(`/api/sales/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  return parseResponse<Sale>(response);
}

export async function fetchServiceOrderPdv(serviceOrderId: string) {
  const response = await fetch(`/api/service-orders/${serviceOrderId}`, {
    method: "GET",
    credentials: "include",
  });

  return parseResponse<ServiceOrderPdvResponse>(response);
}

export async function payServiceOrderPdv({
  serviceOrderId,
  discountAmount,
  payments,
}: {
  serviceOrderId: string;
  discountAmount?: number;
  payments: SalePaymentPayload[];
}) {
  const response = await fetch(`/api/sales/${serviceOrderId}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      serviceOrderId,
      discountAmount,
      payments,
    }),
  });

  return parseResponse<{
    sale: {
      id: string;
      code: number;
    };
    mechanicCommissionPayable?: Array<{
      id: string;
      counterparty: string | null;
      amount: string | number;
    }>;
  }>(response);
}

export const pdvService = {
  listCatalogItems: fetchCatalogItems,
  createCatalogItem,
  findCatalogItemById: fetchCatalogItem,
  updateCatalogItem,
  addCatalogItemStock,
  deleteCatalogItem,
  listSectors: fetchSectors,
  findSectorById: fetchSector,
  createSector,
  updateSector,
  deleteSector,
  listSales: fetchSales,
  createSale,
  updateSaleStatus,
  fetchServiceOrderPdv,
  payServiceOrderPdv,
};
