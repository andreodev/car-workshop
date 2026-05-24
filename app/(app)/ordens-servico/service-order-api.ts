import type {
  ServiceOrder,
  ServiceOrderListResponse,
  ServiceOrderPayload,
  ServiceOrderStatusPayload,
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
  const json = text ? (safeJsonParse<T & { error?: string }>(text)) : null;

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

export async function fetchServiceOrders(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  includeArchived?: boolean;
}) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    status: params.status,
    includeArchived: params.includeArchived ? "true" : undefined,
  });

  const response = await fetch(`/api/service-orders?${query}`, {
    method: "GET",
  });

  return parseResponse<ServiceOrderListResponse>(response);
}

export async function fetchServiceOrder(id: string) {
  const response = await fetch(`/api/service-orders/${id}`, {
    method: "GET",
  });

  return parseResponse<ServiceOrder>(response);
}

export async function createServiceOrder(payload: ServiceOrderPayload) {
  const response = await fetch("/api/service-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<ServiceOrder>(response);
}

export async function updateServiceOrder(id: string, payload: ServiceOrderPayload) {
  const response = await fetch(`/api/service-orders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<ServiceOrder>(response);
}

export async function updateServiceOrderStatus(
  id: string,
  payload: ServiceOrderStatusPayload
) {
  const response = await fetch(`/api/service-orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<ServiceOrder>(response);
}

export async function deleteServiceOrder(id: string) {
  const response = await fetch(`/api/service-orders/${id}`, {
    method: "DELETE" },
  );

  return parseResponse<{ ok: boolean }>(response);
}
