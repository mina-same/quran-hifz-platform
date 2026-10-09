/** Super-admin (platform owner) session token — kept apart from an
 *  organisation session so the two never mix in one browser. */
const KEY = "qh_platform_token";

export function getPlatformToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setPlatformToken(token: string | null): void {
  try { if (token) localStorage.setItem(KEY, token); else localStorage.removeItem(KEY); } catch { /* private mode */ }
}
