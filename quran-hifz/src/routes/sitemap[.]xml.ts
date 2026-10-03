import { createFileRoute } from "@tanstack/react-router";
import { BLOG_POSTS } from "@/quran/data/blog";
import { PUBLIC_URL } from "@/lib/seo";

/** Public pages only — organisation portals (/<slug>) are private and noindex. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const origin = PUBLIC_URL;
        const latestPost = BLOG_POSTS[0]?.updated;
        const urls = [
          { loc: "/", changefreq: "weekly", priority: "1.0", lastmod: latestPost },
          { loc: "/signup", changefreq: "monthly", priority: "0.9" },
          { loc: "/blog", changefreq: "weekly", priority: "0.8", lastmod: latestPost },
          ...BLOG_POSTS.map((p) => ({ loc: `/blog/${p.slug}`, changefreq: "monthly", priority: "0.7", lastmod: p.updated, image: p.cover })),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(
    (u) => `  <url>
    <loc>${origin}${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${"image" in u && u.image ? `\n    <image:image><image:loc>${origin}${u.image.src}</image:loc></image:image>` : ""}
  </url>`,
  )
  .join("\n")}
</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
