/**
 * SaaS-level constants (quran-hifz-sass branch). The organisation's own name
 * comes from the signed-in tenant; these describe the platform itself.
 */
export const PLATFORM_NAME = "منصة حِفظ";
export const PLATFORM_TAGLINE = "منصة سحابية لإدارة حلقات تحفيظ القرآن الكريم";
export const TRIAL_DAYS = 7;

/** Platform logo (۞ over an open Mushaf). PNG twin for social cards / touch icons. */
export const PLATFORM_LOGO = "/brand/logo.svg";
export const PLATFORM_LOGO_PNG = "/brand/logo-512.png";

/** Sales WhatsApp, international format without "+" (wa.me links need digits only). */
export const SALES_WHATSAPP = "201273363970";
export const SALES_WHATSAPP_DISPLAY = "+20 127 336 3970";

export function salesWhatsappLink(message?: string): string {
  const text = message ?? `السلام عليكم، أرغب في الاشتراك في ${PLATFORM_NAME}`;
  return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

import type { StoredTenant } from "../../lib/auth-storage";
export type TenantInfo = StoredTenant;

/** Mirrors the server's tenantHasAccess(). */
export function tenantHasAccess(t: TenantInfo, now = Date.now()): boolean {
  if (t.status === "suspended") return false;
  if (t.status === "active") return !t.paidUntil || new Date(t.paidUntil).getTime() > now;
  return new Date(t.trialEndsAt).getTime() > now;
}

/** Whole days left on the trial, rounded up (0 once it has ended). */
export function trialDaysLeft(t: TenantInfo, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(t.trialEndsAt).getTime() - now) / 86_400_000));
}
