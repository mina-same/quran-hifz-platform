import { PLATFORM_LOGO_PNG, PLATFORM_NAME } from "@/quran/config/saas";

/** Absolute site origin for canonical/OG URLs (set VITE_PUBLIC_URL in prod). */
export const PUBLIC_URL: string = import.meta.env.VITE_PUBLIC_URL ?? "";

export function absoluteUrl(path: string): string {
  return `${PUBLIC_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type SeoInput = {
  title: string;
  description: string;
  /** Route path, e.g. "/blog/quran-review" — becomes the canonical URL. */
  path: string;
  image?: string;
  type?: "website" | "article";
  /** Private pages (an organisation's portal) must stay out of search results. */
  noindex?: boolean;
  publishedTime?: string;
};

/** Per-route `head()` meta + links: title, description, canonical, OG, Twitter. */
export function seo({ title, description, path, image = PLATFORM_LOGO_PNG, type = "website", noindex, publishedTime }: SeoInput) {
  const url = absoluteUrl(path);
  const img = absoluteUrl(image);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      { property: "og:site_name", content: PLATFORM_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:image", content: img },
      ...(publishedTime ? [{ property: "article:published_time", content: publishedTime }] : []),
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: img },
    ],
    links: noindex ? [] : [{ rel: "canonical", href: url }],
  };
}

/** `<script type="application/ld+json">` entry for a route's head().scripts. */
export function jsonLd(data: Record<string, unknown>) {
  return { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", ...data }) };
}
