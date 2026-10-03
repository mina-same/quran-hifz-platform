import { createFileRoute } from "@tanstack/react-router";
import QuranApp from "@/quran/QuranApp";
import { PLATFORM_NAME } from "@/quran/config/saas";
import { seo } from "@/lib/seo";

/** One organisation's portal: /<slug>. Static routes (/signup, …) win over this. */
export const Route = createFileRoute("/$slug")({
  // Organisation portals are private — keep them out of search results.
  head: ({ params }) =>
    seo({ title: PLATFORM_NAME, description: PLATFORM_NAME, path: `/${params.slug}`, noindex: true }),
  component: SlugPortal,
});

function SlugPortal() {
  const { slug } = Route.useParams();
  return <QuranApp slug={slug} />;
}
