import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { PortalKey } from "../config/portals";
import { useAuth, type AuthUser } from "./AuthContext";

export type TopbarConfig = {
  icon: string;
  title: string;
  actions?: ReactNode;
};

type PortalContextValue = {
  portal: PortalKey | null;
  page: string;
  topbar: TopbarConfig;
  user: AuthUser | null;
  enterPortal: (p: PortalKey) => void;
  logout: () => void;
  showPage: (id: string) => void;
  setTopbar: (cfg: TopbarConfig) => void;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const [portal, setPortal] = useState<PortalKey | null>(null);
  const [page, setPage] = useState<string>("dashboard");
  const [topbar, setTopbarState] = useState<TopbarConfig>({ icon: "ti-home", title: "لوحة التحكم" });

  const enterPortal = useCallback((p: PortalKey) => {
    setPortal(p);
    setPage("dashboard");
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setPortal(null);
    setPage("dashboard");
  }, [authLogout]);

  const showPage = useCallback((id: string) => setPage(id), []);
  const setTopbar = useCallback((cfg: TopbarConfig) => setTopbarState(cfg), []);

  return (
    <PortalContext.Provider value={{ portal, page, topbar, user, enterPortal, logout, showPage, setTopbar }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used inside <PortalProvider>");
  return ctx;
}
