import { PLATFORM_LOGO_PNG, PLATFORM_NAME, PUBLIC_DOMAIN } from "@/quran/config/saas";

/** Absolute site origin for canonical/OG URLs. VITE_PUBLIC_URL overrides it
 *  (e.g. a preview deployment or a custom domain later). */
export const PUBLIC_URL: string = import.meta.env.VITE_PUBLIC_URL || `https://${PUBLIC_DOMAIN}`;

export function absoluteUrl(path: string): string {
  return `${PUBLIC_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type SeoImage = { src: string; alt: string; width?: number; height?: number };

type SeoInput = {
  title: string;
  description: string;
  /** Route path, e.g. "/blog/quran-review" — becomes the canonical URL. */
  path: string;
  image?: SeoImage;
  type?: "website" | "article";
  /** Private pages (an organisation's portal) must stay out of search results. */
  noindex?: boolean;
  keywords?: string[];
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
};

const DEFAULT_IMAGE: SeoImage = { src: PLATFORM_LOGO_PNG, alt: `شعار ${PLATFORM_NAME}`, width: 512, height: 512 };

/** Per-route `head()` meta + links: title, description, canonical, OG, Twitter. */
export function seo({
  title, description, path, image = DEFAULT_IMAGE, type = "website", noindex,
  keywords, publishedTime, modifiedTime, section, tags,
}: SeoInput) {
  const url = absoluteUrl(path);
  const img = absoluteUrl(image.src);
  const large = (image.width ?? 0) >= 1000;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      ...(keywords?.length ? [{ name: "keywords", content: keywords.join("، ") }] : []),
      { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: PLATFORM_NAME },
      { property: "og:locale", content: "ar_AR" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:image", content: img },
      { property: "og:image:alt", content: image.alt },
      ...(image.width ? [{ property: "og:image:width", content: String(image.width) }] : []),
      ...(image.height ? [{ property: "og:image:height", content: String(image.height) }] : []),
      ...(publishedTime ? [{ property: "article:published_time", content: publishedTime }] : []),
      ...(modifiedTime ? [{ property: "article:modified_time", content: modifiedTime }] : []),
      ...(section ? [{ property: "article:section", content: section }] : []),
      ...(tags ?? []).map((t) => ({ property: "article:tag", content: t })),
      { name: "twitter:card", content: large ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: img },
      { name: "twitter:image:alt", content: image.alt },
    ],
    links: noindex ? [] : [{ rel: "canonical", href: url }],
  };
}

/** `<script type="application/ld+json">` entry for a route's head().scripts. */
export function jsonLd(data: Record<string, unknown>) {
  return { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", ...data }) };
}

/** BreadcrumbList structured data from [name, path] pairs. */
export function breadcrumbLd(items: [string, string][]) {
  return jsonLd({
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  });
}
