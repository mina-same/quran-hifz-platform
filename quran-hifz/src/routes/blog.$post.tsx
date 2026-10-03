import { createFileRoute, notFound } from "@tanstack/react-router";
import { QuranRoot } from "@/quran/QuranApp";
import { BlogPostView } from "@/quran/pages/Blog";
import { getPost } from "@/quran/data/blog";
import { PLATFORM_LOGO_PNG, PLATFORM_NAME } from "@/quran/config/saas";
import { absoluteUrl, jsonLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/blog/$post")({
  loader: ({ params }) => {
    const post = getPost(params.post);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData: post }) =>
    post
      ? {
          ...seo({
            title: `${post.title} | ${PLATFORM_NAME}`,
            description: post.description,
            path: `/blog/${post.slug}`,
            type: "article",
            publishedTime: post.date,
          }),
          scripts: [
            jsonLd({
              "@type": "BlogPosting",
              headline: post.title,
              description: post.description,
              datePublished: post.date,
              inLanguage: "ar",
              mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
              image: absoluteUrl(PLATFORM_LOGO_PNG),
              author: { "@type": "Organization", name: PLATFORM_NAME },
              publisher: { "@type": "Organization", name: PLATFORM_NAME, logo: absoluteUrl(PLATFORM_LOGO_PNG) },
            }),
          ],
        }
      : {},
  component: BlogPostRoute,
});

function BlogPostRoute() {
  const post = Route.useLoaderData();
  return (
    <QuranRoot>
      <BlogPostView post={post} />
    </QuranRoot>
  );
}
