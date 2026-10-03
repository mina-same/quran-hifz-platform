import { createFileRoute, notFound } from "@tanstack/react-router";
import { QuranRoot } from "@/quran/QuranApp";
import { BlogPostView } from "@/quran/pages/Blog";
import { BLOG_AUTHOR, getPost, wordCount } from "@/quran/data/blog";
import { PLATFORM_LOGO_PNG, PLATFORM_NAME } from "@/quran/config/saas";
import { absoluteUrl, breadcrumbLd, jsonLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/blog/$post")({
  loader: ({ params }) => {
    const post = getPost(params.post);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData: post }) => {
    if (!post) return {};
    const url = absoluteUrl(`/blog/${post.slug}`);
    return {
      ...seo({
        title: `${post.seoTitle} | ${PLATFORM_NAME}`,
        description: post.description,
        path: `/blog/${post.slug}`,
        type: "article",
        image: post.cover,
        keywords: post.keywords,
        publishedTime: post.date,
        modifiedTime: post.updated,
        section: post.tag,
        tags: post.keywords,
      }),
      scripts: [
        jsonLd({
          "@type": "BlogPosting",
          headline: post.seoTitle,
          alternativeHeadline: post.title,
          description: post.description,
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          image: {
            "@type": "ImageObject",
            url: absoluteUrl(post.cover.src),
            width: post.cover.width,
            height: post.cover.height,
            caption: post.cover.alt,
          },
          datePublished: post.date,
          dateModified: post.updated,
          inLanguage: "ar",
          articleSection: post.tag,
          keywords: post.keywords.join("، "),
          wordCount: wordCount(post),
          author: { "@type": "Organization", name: BLOG_AUTHOR, url: absoluteUrl("/") },
          publisher: {
            "@type": "Organization",
            name: PLATFORM_NAME,
            logo: { "@type": "ImageObject", url: absoluteUrl(PLATFORM_LOGO_PNG), width: 512, height: 512 },
          },
        }),
        breadcrumbLd([["الرئيسية", "/"], ["المدونة", "/blog"], [post.seoTitle, `/blog/${post.slug}`]]),
        ...(post.faq.length
          ? [jsonLd({
              "@type": "FAQPage",
              mainEntity: post.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            })]
          : []),
      ],
    };
  },
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
