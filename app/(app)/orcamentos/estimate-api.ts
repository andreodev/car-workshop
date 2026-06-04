import type {
  ConvertEstimateResponse,
  Estimate,
  EstimateListResponse,
  EstimatePayload,
  EstimateStatusPayload,
  EstimateVisibility,
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

export async function fetchEstimates(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  visibility?: EstimateVisibility;
}) {
  const query = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    status: params.status,
    visibility: params.visibility,
  });

  const response = await fetch(`/api/estimates?${query}`, {
    method: "GET",
  });

  return parseResponse<EstimateListResponse>(response);
}

export async function fetchEstimate(id: string) {
  const response = await fetch(`/api/estimates/${id}`, {
    method: "GET",
  });

  return parseResponse<Estimate>(response);
}

export async function createEstimate(payload: EstimatePayload) {
  const response = await fetch("/api/estimates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Response status:", response.status);

  return parseResponse<Estimate>(response);
}

export async function updateEstimate(id: string, payload: EstimatePayload) {
  const response = await fetch(`/api/estimates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Estimate>(response);
}

export async function updateEstimateStatus(id: string, payload: EstimateStatusPayload) {
  const response = await fetch(`/api/estimates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<Estimate>(response);
}

export async function convertEstimate(id: string) {
  const response = await fetch(`/api/estimates/${id}/convert`, {
    method: "POST",
  });

  return parseResponse<ConvertEstimateResponse>(response);
}

export async function deleteEstimate(id: string) {
  const response = await fetch(`/api/estimates/${id}`, {
    method: "DELETE" },
  );

  return parseResponse<{ ok: boolean }>(response);
}
