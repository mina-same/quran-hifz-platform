import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminApp } from "@/quran/QuranApp";
import { PLATFORM_NAME } from "@/quran/config/saas";
import { seo } from "@/lib/seo";

/** Platform owner console — private, never indexed. */
export const Route = createFileRoute("/super")({
  head: () => seo({ title: `لوحة مالك المنصة — ${PLATFORM_NAME}`, description: PLATFORM_NAME, path: "/super", noindex: true }),
  component: SuperAdminApp,
});
