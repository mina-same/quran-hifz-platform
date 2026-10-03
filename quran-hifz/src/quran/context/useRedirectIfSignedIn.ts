import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./AuthContext";

/**
 * /login and /signup are for signed-out visitors: a signed-in user goes
 * straight to their organisation. Returns true while that is undecided or
 * happening, so the page can render nothing instead of flashing a form.
 */
export function useRedirectIfSignedIn(): boolean {
  const { user, tenant, isLoading } = useAuth();
  const navigate = useNavigate();
  const signedIn = !!(user && tenant);
  useEffect(() => {
    if (signedIn) navigate({ to: "/$slug", params: { slug: tenant!.slug }, replace: true });
  }, [signedIn, tenant, navigate]);
  return isLoading || signedIn;
}
