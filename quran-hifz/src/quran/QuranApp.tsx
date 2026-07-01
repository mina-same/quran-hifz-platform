import "./quran.css";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PortalProvider, usePortal } from "./context/PortalContext";
import { ParentProvider, useParentContext } from "./context/ParentContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ChildSelector } from "./components/ChildSelector";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { PageOutlet } from "./components/PageOutlet";
import type { PortalKey } from "./config/portals";

function AppShell() {
  const { user } = useAuth();
  const { portal, enterPortal } = usePortal();

  useEffect(() => {
    if (user && !portal) {
      enterPortal(user.role as PortalKey);
    }
  }, [user, portal, enterPortal]);

  if (!portal) return null;

  return (
    <div id="app" style={{ display: "block" }}>
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          <PageOutlet />
        </div>
      </div>
    </div>
  );
}

type AuthGateStep = "landing" | "login";

function AuthGate() {
  const { user, isLoading } = useAuth();
  const { activeChild } = useParentContext();
  const [step, setStep] = useState<AuthGateStep>("landing");

  if (isLoading) {
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
    if (step === "landing") {
      return <LandingPage onLogin={() => setStep("login")} />;
    }
    return <LoginPage onBack={() => setStep("landing")} />;
  }

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

/**
 * Quran Hifz platform — React entry.
 *
 * Architecture:
 *  - `config/`      — static data (portals, masar mapping)
 *  - `context/`     — auth, portal/page state + topbar coordination
 *  - `components/`  — shell + reusable presentational primitives
 *  - `pages/`       — one component per page, grouped by portal
 *  - `router/`      — page registry mapping (portal, pageId) → component
 */
export default function QuranApp() {
  return (
    <ThemeProvider>
      <div dir="rtl" lang="ar" className="quran-root">
        <AuthProvider>
          <ParentProvider>
            <AuthGate />
          </ParentProvider>
        </AuthProvider>
      </div>
    </ThemeProvider>
  );
}
