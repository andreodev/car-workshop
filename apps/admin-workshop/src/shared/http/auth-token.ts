const ACCESS_TOKEN_KEY = "admin-workshop.access-token";
const TENANT_ID_KEY = "admin-workshop.tenant-id";

export const ADMIN_AUTH_TOKEN_EXPIRED_EVENT = "admin-workshop:auth-token-expired";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getAccessToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function notifyAccessTokenExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_AUTH_TOKEN_EXPIRED_EVENT));
}

export function getSelectedTenantId() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(TENANT_ID_KEY);
}

export function setSelectedTenantId(tenantId: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TENANT_ID_KEY, tenantId);
}
