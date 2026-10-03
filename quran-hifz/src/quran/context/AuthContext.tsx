import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { get, post, SUBSCRIPTION_REQUIRED_EVENT } from "../../lib/api";
import {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  getStoredTenant,
  setStoredTenant,
  clearStoredTenant,
  type StoredUser,
  type StoredTenant,
} from "../../lib/auth-storage";
import { tenantHasAccess } from "../config/saas";

export type AuthUser = StoredUser;
export type AuthTenant = StoredTenant;

type ApiUser = {
  name: string;
  email: string;
  role: AuthUser["role"];
  profileId?: string;
  supervisorGender?: "male" | "female";
};

/** Shape shared by POST /auth/login and POST /tenants/signup. */
export type SessionResponse = {
  success: boolean;
  token: string;
  user: ApiUser & { id: string };
  tenant: AuthTenant;
};

type MeResponse = {
  success: boolean;
  user: ApiUser & { _id: string };
  tenant: AuthTenant | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isLoading: boolean;
  /** False once the organisation's trial/subscription has ended. */
  hasAccess: boolean;
  /** Resolves with the session so callers can route to `/<tenant.slug>`. */
  login: (email: string, password: string, slug?: string) => Promise<SessionResponse>;
  /** Adopt a session the server already issued (signup). */
  startSession: (res: SessionResponse) => void;
  logout: () => void;
  updateUser: (patch: Partial<Pick<AuthUser, "name">>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(id: string, u: ApiUser): AuthUser {
  return { id, name: u.name, role: u.role, profileId: u.profileId, supervisorGender: u.supervisorGender };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [blocked, setBlocked] = useState(false);

  const clearSession = useCallback(() => {
    clearToken();
    clearStoredUser();
    clearStoredTenant();
    setUser(null);
    setTenant(null);
    setBlocked(false);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      // A session without a token can't call the API — don't resurrect it.
      clearStoredUser();
      clearStoredTenant();
      setIsLoading(false);
      return;
    }
    setUser(getStoredUser());
    setTenant(getStoredTenant());
    get<MeResponse>("/auth/me")
      .then((res) => {
        const u = toAuthUser(res.user._id, res.user);
        setUser(u);
        setStoredUser(u);
        if (res.tenant) {
          setTenant(res.tenant);
          setStoredTenant(res.tenant);
        }
      })
      .catch(clearSession)
      .finally(() => setIsLoading(false));
  }, [clearSession]);

  // Any API call answered with 402 means the trial ended mid-session.
  useEffect(() => {
    const onBlocked = () => setBlocked(true);
    window.addEventListener(SUBSCRIPTION_REQUIRED_EVENT, onBlocked);
    return () => window.removeEventListener(SUBSCRIPTION_REQUIRED_EVENT, onBlocked);
  }, []);

  const startSession = useCallback((res: SessionResponse) => {
    const u = toAuthUser(res.user.id, res.user);
    setToken(res.token);
    setStoredUser(u);
    setStoredTenant(res.tenant);
    setUser(u);
    setTenant(res.tenant);
    setBlocked(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string, slug?: string) => {
      const res = await post<SessionResponse>("/auth/login", { email, password, slug });
      startSession(res);
      return res;
    },
    [startSession],
  );

  const updateUser = useCallback((patch: Partial<Pick<AuthUser, "name">>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setStoredUser(next);
      return next;
    });
  }, []);

  const hasAccess = !blocked && (!tenant || tenantHasAccess(tenant));

  return (
    <AuthContext.Provider
      value={{ user, tenant, isLoading, hasAccess, login, startSession, logout: clearSession, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
