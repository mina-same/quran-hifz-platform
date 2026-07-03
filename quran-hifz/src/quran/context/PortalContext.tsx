import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from "react";
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
  isSidebarOpen: boolean;
  enterPortal: (p: PortalKey) => void;
  logout: () => void;
  showPage: (id: string) => void;
  setTopbar: (cfg: TopbarConfig) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
};

/* ── hash helpers ── */
function readHash(): string {
  const h = window.location.hash.slice(1); // strip leading #
  return h || "dashboard";
}
function writeHash(id: string) {
  // Replace so back button doesn't re-visit every nav click
  window.history.replaceState(null, "", "#" + id);
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const { user, logout: authLogout } = useAuth();

  // Restore page from URL hash on first mount
  const [portal, setPortal] = useState<PortalKey | null>(null);
  const [page,   setPage]   = useState<string>(readHash);
  const [topbar, setTopbarState] = useState<TopbarConfig>({ icon: "ti-home", title: "لوحة التحكم" });
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Keep hash in sync whenever page changes
  useEffect(() => { writeHash(page); }, [page]);

  // Handle browser back/forward
  useEffect(() => {
    function onHashChange() {
      const next = readHash();
      setPage(next);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const enterPortal = useCallback((p: PortalKey) => {
    setPortal(p);
    // Restore from hash if it has a valid non-default value, else land on dashboard
    const fromHash = readHash();
    setPage(fromHash !== "dashboard" ? fromHash : "dashboard");
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setPortal(null);
    setPage("dashboard");
    writeHash("dashboard");
  }, [authLogout]);

  const showPage = useCallback((id: string) => {
    setPage(id);
    // Use pushState so the back button works between pages
    window.history.pushState(null, "", "#" + id);
    setSidebarOpen(false); // close the mobile drawer after navigating
  }, []);

  const setTopbar = useCallback((cfg: TopbarConfig) => setTopbarState(cfg), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <PortalContext.Provider
      value={{
        portal, page, topbar, user, isSidebarOpen,
        enterPortal, logout, showPage, setTopbar, toggleSidebar, closeSidebar,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used inside <PortalProvider>");
  return ctx;
}
