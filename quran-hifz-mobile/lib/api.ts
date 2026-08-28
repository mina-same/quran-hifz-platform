import { getToken, clearToken } from './auth-storage';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

/** Called once when any request comes back 401 — the store registers a handler
 * that clears the session so the app drops back to the login screen instead of
 * rendering portal screens whose every query is failing. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken().catch(() => null);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    // A rejected token (expired, or signed with a since-rotated secret) must end
    // the session — otherwise authUser stays set and every screen renders empty.
    // Login itself answers 401 for a wrong password, which is not a dead session.
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      await clearToken().catch(() => {});
      onUnauthorized?.();
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

export function get<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function del<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
