import type {
  CatalogItem,
  CatalogItemFormValues,
  CatalogItemListResponse,
  CatalogItemType,
  Sale,
  SaleListResponse,
  SalePayload,
  SaleStatus,
  Sector,
  SectorFormValues,
  SectorListResponse,
} from "./types";

const DEFAULT_PAGE_SIZE = 10;

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

export async function fetchCatalogItems(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: CatalogItemType | "TODOS";
  includeInactive?: boolean;
}) {
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

export async function createCatalogItem(payload: {
  name: string;
  type: CatalogItemType;
  unitPrice: number;
  sku?: string | null;
  active?: boolean;
  notes?: string | null;
}) {
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

export async function deleteCatalogItem(id: string) {
  const response = await fetch(`/api/catalog-items/${id}`, {
    method: "DELETE",
  });

  return parseResponse<{ ok: boolean }>(response);
}

export async function fetchSectors(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  includeInactive?: boolean;
}) {
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

export async function fetchSales(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: SaleStatus | "TODOS";
  from?: string;
  to?: string;
}) {
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
