import {
  createContext, useContext, useState, useCallback,
  useEffect, useMemo, type ReactNode,
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
  user: AuthUser | null;
  isSidebarOpen: boolean;
  enterPortal: (p: PortalKey) => void;
  logout: () => void;
  showPage: (id: string) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
};

// Split out from PortalContextValue on purpose: `topbar` changes on every
// page navigation (new icon/title/actions), and every page calls useTopbar()
// on mount. If that lived in the same context as the rest of the portal
// state, updating it would re-render every page component, which would
// recreate the inline `actions` JSX passed to useTopbar(), re-triggering its
// effect and calling setTopbar() again — an infinite render loop. Keeping
// `topbar` (read by Topbar.tsx) and `setTopbar` (a stable ref, read by
// useTopbar()) in their own contexts means calling setTopbar never re-renders
// the page that called it.
const TopbarValueContext = createContext<TopbarConfig>({ icon: "ti-home", title: "لوحة التحكم" });
const TopbarSetterContext = createContext<(cfg: TopbarConfig) => void>(() => {});

export function useTopbarValue() {
  return useContext(TopbarValueContext);
}
export function useSetTopbar() {
  return useContext(TopbarSetterContext);
}

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

  const portalValue = useMemo<PortalContextValue>(() => ({
    portal, page, user, isSidebarOpen,
    enterPortal, logout, showPage, toggleSidebar, closeSidebar,
  }), [portal, page, user, isSidebarOpen, enterPortal, logout, showPage, toggleSidebar, closeSidebar]);

  return (
    <PortalContext.Provider value={portalValue}>
      <TopbarSetterContext.Provider value={setTopbar}>
        <TopbarValueContext.Provider value={topbar}>
          {children}
        </TopbarValueContext.Provider>
      </TopbarSetterContext.Provider>
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used inside <PortalProvider>");
  return ctx;
}
