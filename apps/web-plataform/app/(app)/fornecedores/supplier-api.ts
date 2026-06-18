import type {
  Supplier,
  SupplierFormValues,
  SupplierListResponse,
  SupplierOrder,
  SupplierOrderFormValues,
  SupplierOrderListResponse,
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

export async function fetchSuppliers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
  });

  const response = await fetch(`/api/suppliers?${query}`, { method: "GET" });
  return parseResponse<SupplierListResponse>(response);
}

export async function fetchSupplier(id: string) {
  const response = await fetch(`/api/suppliers/${id}`, { method: "GET" });
  return parseResponse<Supplier>(response);
}

export async function createSupplier(payload: SupplierFormValues) {
  const response = await fetch("/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Supplier>(response);
}

export async function updateSupplier(id: string, payload: SupplierFormValues) {
  const response = await fetch(`/api/suppliers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Supplier>(response);
}

export async function deleteSupplier(id: string) {
  const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
  return parseResponse<{ ok: boolean }>(response);
}

export async function fetchSupplierOrders(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    status: params.status,
  });

  const response = await fetch(`/api/supplier-orders?${query}`, { method: "GET" });
  return parseResponse<SupplierOrderListResponse>(response);
}

export async function fetchSupplierOrder(id: string) {
  const response = await fetch(`/api/supplier-orders/${id}`, { method: "GET" });
  return parseResponse<SupplierOrder>(response);
}

export async function createSupplierOrder(payload: SupplierOrderFormValues) {
  const response = await fetch("/api/supplier-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<SupplierOrder>(response);
}

export async function updateSupplierOrder(id: string, payload: SupplierOrderFormValues) {
  const response = await fetch(`/api/supplier-orders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<SupplierOrder>(response);
}

export async function deleteSupplierOrder(id: string) {
  const response = await fetch(`/api/supplier-orders/${id}`, { method: "DELETE" });
  return parseResponse<{ ok: boolean }>(response);
}
