import { AxiosError } from "axios";

export type ApiErrorPayload = {
  message?: string;
  error?: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
};

export class ApiRequestError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options?: { status?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function normalizeApiError(error: unknown) {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    const message =
      payload?.message ??
      payload?.error ??
      error.message ??
      "Nao foi possivel concluir a requisicao.";

    return new ApiRequestError(message, {
      status: error.response?.status,
      code: payload?.code,
      details: payload?.details ?? payload,
    });
  }

  if (error instanceof Error) {
    return error;
  }

  return new ApiRequestError("Nao foi possivel concluir a requisicao.");
}
