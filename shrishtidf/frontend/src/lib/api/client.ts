export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export const fetchOptions = {
  credentials: "include" as RequestCredentials,
};

// The API identifies a customer by a `session-id` header (the same
// convention the mobile app uses) rather than a cookie the backend never
// actually sets — this id is generated once per browser and reused so
// logging in on one visit is still recognized on the next.
const SESSION_STORAGE_KEY = "sdf_session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  } catch {
    // Private browsing / storage disabled — fall back to a per-request id
    // rather than throwing; the customer just won't stay logged in across
    // page loads in that case.
    return crypto.randomUUID();
  }
}

export function authHeaders(): Record<string, string> {
  const sessionId = getOrCreateSessionId();
  return sessionId ? { "session-id": sessionId } : {};
}
