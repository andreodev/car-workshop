import axios from "axios";

import {
  clearAccessToken,
  getAccessToken,
  getSelectedTenantId,
  notifyAccessTokenExpired,
} from "./auth-token";
import { normalizeApiError } from "./api-error";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  const tenantId = getSelectedTenantId();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId) {
    config.headers["X-Tenant-Id"] = tenantId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedError = normalizeApiError(error);

    if ("status" in normalizedError && normalizedError.status === 401) {
      clearAccessToken();
      notifyAccessTokenExpired();
    }

    return Promise.reject(normalizedError);
  }
);
