import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { get, post } from "../../lib/api";
import {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  type StoredUser,
} from "../../lib/auth-storage";

export type AuthUser = StoredUser;

type LoginResponse = {
  success: boolean;
  token: string;
  user: { id: string; name: string; email: string; role: AuthUser["role"]; profileId?: string };
};

type MeResponse = {
  success: boolean;
  user: { _id: string; name: string; email: string; role: AuthUser["role"]; profileId?: string };
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(getStoredUser());
      setIsLoading(false);
      return;
    }
    get<MeResponse>("/auth/me")
      .then((res) => {
        const u: AuthUser = {
          id: res.user._id,
          name: res.user.name,
          role: res.user.role,
          profileId: res.user.profileId,
        };
        setUser(u);
        setStoredUser(u);
      })
      .catch(() => {
        clearToken();
        clearStoredUser();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await post<LoginResponse>("/auth/login", { email, password });
    const u: AuthUser = {
      id: res.user.id,
      name: res.user.name,
      role: res.user.role,
      profileId: res.user.profileId,
    };
    setToken(res.token);
    setStoredUser(u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    clearStoredUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
