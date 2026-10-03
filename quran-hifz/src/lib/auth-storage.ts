const TOKEN_KEY = "qh_token";
const USER_KEY = "qh_user";
const TENANT_KEY = "qh_tenant";

const isBrowser = typeof window !== "undefined";

export type StoredUser = {
  id: string;
  name: string;
  role: "admin" | "teacher" | "student" | "parent" | "supervisor";
  profileId?: string;
  supervisorGender?: "male" | "female";
};

export function getToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (!isBrowser) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (!isBrowser) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (!isBrowser) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  if (!isBrowser) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (!isBrowser) return;
  localStorage.removeItem(USER_KEY);
}

// ── SaaS tenant (the signed-in user's organisation) ──────────────────────────

export type StoredTenant = {
  id: string;
  name: string;
  slug: string;
  status: "trial" | "active" | "suspended";
  trialEndsAt: string;
  paidUntil?: string;
  salesWhatsapp?: string;
};

export function getStoredTenant(): StoredTenant | null {
  if (!isBrowser) return null;
  const raw = localStorage.getItem(TENANT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTenant;
  } catch {
    return null;
  }
}

export function setStoredTenant(tenant: StoredTenant): void {
  if (!isBrowser) return;
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
}

export function clearStoredTenant(): void {
  if (!isBrowser) return;
  localStorage.removeItem(TENANT_KEY);
}
