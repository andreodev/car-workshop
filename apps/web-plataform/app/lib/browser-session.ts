const BROWSER_SESSION_STORAGE_KEY = "car-workshop.auth.browser-session";
const ACTIVE_SESSION_VALUE = "active";

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function hasBrowserSession() {
  return (
    getSessionStorage()?.getItem(BROWSER_SESSION_STORAGE_KEY) ===
    ACTIVE_SESSION_VALUE
  );
}

export function markBrowserSession() {
  getSessionStorage()?.setItem(
    BROWSER_SESSION_STORAGE_KEY,
    ACTIVE_SESSION_VALUE
  );
}

export function clearBrowserSession() {
  getSessionStorage()?.removeItem(BROWSER_SESSION_STORAGE_KEY);
}
