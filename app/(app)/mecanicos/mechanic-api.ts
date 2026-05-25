import type {
  Mechanic,
  MechanicListResponse,
  MechanicReport,
  MechanicSavePayload,
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

export async function fetchMechanics(params: {
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

  const response = await fetch(`/api/mechanics?${query}`, {
    method: "GET",
  });

  return parseResponse<MechanicListResponse>(response);
}

export async function fetchMechanic(id: string) {
  const response = await fetch(`/api/mechanics/${id}`, {
    method: "GET",
  });

  return parseResponse<Mechanic>(response);
}

export async function fetchMechanicReport(id: string) {
  const response = await fetch(`/api/mechanics/${id}/report`, {
    method: "GET",
  });

  return parseResponse<MechanicReport>(response);
}

export async function createMechanic(payload: MechanicSavePayload) {
  const response = await fetch("/api/mechanics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Mechanic>(response);
}

export async function updateMechanic(id: string, payload: MechanicSavePayload) {
  const response = await fetch(`/api/mechanics/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Mechanic>(response);
}

export async function deleteMechanic(id: string) {
  const response = await fetch(`/api/mechanics/${id}`, {
    method: "DELETE",
  });

  return parseResponse<{ ok: boolean }>(response);
}
