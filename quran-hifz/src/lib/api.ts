import { getToken } from "./auth-storage";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

/** Fired on any 402 — the organisation's trial/subscription has ended.
 *  AuthContext listens and swaps the app for the "contact sales" screen. */
export const SUBSCRIPTION_REQUIRED_EVENT = "qh:subscription-required";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  // An explicit Authorization (super-admin pages) wins over the org session.
  if (token && !headers["Authorization"]) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 402 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(SUBSCRIPTION_REQUIRED_EVENT));
    }
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // ignore parse failure
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export function get<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, options);
}

export function post<T>(path: string, body: unknown, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "POST", body: JSON.stringify(body) });
}

export function put<T>(path: string, body: unknown, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "PUT", body: JSON.stringify(body) });
}

export function patch<T>(path: string, body: unknown, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) });
}

export function del<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}
