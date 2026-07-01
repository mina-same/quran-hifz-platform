import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/sitemap.xml")({
  GET: ({ request }) => {
    const origin = new URL(request.url).origin;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    return new Response(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  },
});
