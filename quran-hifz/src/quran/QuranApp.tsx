import "./quran.css";
import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PortalProvider, usePortal } from "./context/PortalContext";
import { ParentProvider, useParentContext } from "./context/ParentContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ChildSelector } from "./components/ChildSelector";
import { LoginPage } from "./pages/LoginPage";
import { SaasHome } from "./pages/SaasHome";
import { SignupPage } from "./pages/SignupPage";
import { TrialBanner, SubscriptionEnded } from "./components/Subscription";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { PageOutlet } from "./components/PageOutlet";
import type { PortalKey } from "./config/portals";

function AppShell() {
  const { user } = useAuth();
  const { portal, enterPortal, isSidebarOpen } = usePortal();

  useEffect(() => {
    if (user && !portal) {
      enterPortal(user.role as PortalKey);
    }
  }, [user, portal, enterPortal]);

  if (!portal) return null;

  return (
    <div id="app" className={isSidebarOpen ? "sidebar-open" : ""} style={{ display: "block" }}>
      <Sidebar />
      <div className="main">
        <Topbar />
        <TrialBanner />
        <div className="content">
          <PageOutlet />
        </div>
      </div>
    </div>
  );
}

function AuthGate({ slug }: { slug: string }) {
  const { user, tenant, isLoading, hasAccess } = useAuth();
  const { activeChild } = useParentContext();
  const navigate = useNavigate();

  // Signed in to a different organisation than the URL names — go to its own.
  const wrongTenant = !!(user && tenant && tenant.slug !== slug);
  useEffect(() => {
    if (wrongTenant) navigate({ to: "/$slug", params: { slug: tenant!.slug }, replace: true });
  }, [wrongTenant, tenant, navigate]);

  if (isLoading || wrongTenant) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: 18,
          color: "var(--green)",
        }}
      >
        <i className="ti ti-loader-2" style={{ marginLeft: 8, animation: "spin 1s linear infinite" }} />
        جارٍ التحقق...
      </div>
    );
  }

  if (!user) {
    return <LoginPage slug={slug} onBack={() => navigate({ to: "/" })} />;
  }

  if (!hasAccess) return <SubscriptionEnded />;

  // Parent must select a child before entering the dashboard
  if (user.role === "parent" && !activeChild) {
    return <ChildSelector onBack={() => {}} />;
  }

  return (
    <PortalProvider>
      <AppShell />
    </PortalProvider>
  );
}

/** Providers + RTL root shared by every SaaS route. */
export function QuranRoot({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <div dir="rtl" lang="ar" className="quran-root">
        <AuthProvider>{children}</AuthProvider>
        <Toaster dir="rtl" position="top-center" richColors />
      </div>
    </ThemeProvider>
  );
}

/** `/` — the platform's marketing home. */
export function SaasHomeApp() {
  return (
    <QuranRoot>
      <SaasHome />
    </QuranRoot>
  );
}

/** `/signup` — create an organisation (tenant) on a free trial. */
export function SignupApp() {
  return (
    <QuranRoot>
      <SignupPage />
    </QuranRoot>
  );
}

/**
 * `/<slug>` — one organisation's portal (login → admin/teacher/student/parent).
 *
 * Architecture:
 *  - `config/`      — static data (portals, masar mapping, SaaS constants)
 *  - `context/`     — auth (+ tenant), portal/page state + topbar coordination
 *  - `components/`  — shell + reusable presentational primitives
 *  - `pages/`       — one component per page, grouped by portal
 *  - `router/`      — page registry mapping (portal, pageId) → component
 */
export default function QuranApp({ slug }: { slug: string }) {
  return (
    <QuranRoot>
      <ParentProvider>
        <AuthGate slug={slug.toLowerCase()} />
      </ParentProvider>
    </QuranRoot>
  );
}
