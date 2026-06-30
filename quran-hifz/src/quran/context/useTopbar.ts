import { useEffect, type ReactNode } from "react";
import { usePortal } from "./PortalContext";

/** Declarative topbar setter for a page component. */
export function useTopbar(icon: string, title: string, actions?: ReactNode) {
  const { setTopbar } = usePortal();
  useEffect(() => {
    setTopbar({ icon, title, actions });
  }, [icon, title, actions, setTopbar]);
}
