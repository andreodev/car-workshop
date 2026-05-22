import type { Vehicle, VehicleFormValues, VehicleListResponse, VehicleSearchBy } from "./types";

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

export async function fetchVehicles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  searchBy?: VehicleSearchBy;
  status?: string;
}) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    searchBy: params.searchBy,
    status: params.status,
  });

  const response = await fetch(`/api/vehicles?${query}`, {
    method: "GET",
  });

  return parseResponse<VehicleListResponse>(response);
}

export async function fetchVehicle(id: string) {
  const response = await fetch(`/api/vehicles/${id}`, {
    method: "GET",
  });

  return parseResponse<Vehicle>(response);
}

export async function createVehicle(payload: VehicleFormValues) {
  const response = await fetch("/api/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Vehicle>(response);
}

export async function updateVehicle(id: string, payload: VehicleFormValues) {
  const response = await fetch(`/api/vehicles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Vehicle>(response);
}

export async function deleteVehicle(id: string) {
  const response = await fetch(`/api/vehicles/${id}`, {
    method: "DELETE" },
  );

  return parseResponse<{ ok: boolean }>(response);
}
