import { createFileRoute } from "@tanstack/react-router";
import { QuranRoot } from "@/quran/QuranApp";
import { BlogIndex } from "@/quran/pages/Blog";
import { BLOG_POSTS } from "@/quran/data/blog";
import { PLATFORM_NAME } from "@/quran/config/saas";
import { absoluteUrl, jsonLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    ...seo({
      title: `المدونة — ${PLATFORM_NAME}`,
      description: "مقالات عملية في إدارة حلقات تحفيظ القرآن الكريم، وخطط الحفظ والمراجعة، ومتابعة أولياء الأمور.",
      path: "/blog",
    }),
    scripts: [
      jsonLd({
        "@type": "Blog",
        name: `مدونة ${PLATFORM_NAME}`,
        url: absoluteUrl("/blog"),
        inLanguage: "ar",
        blogPost: BLOG_POSTS.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          url: absoluteUrl(`/blog/${p.slug}`),
          datePublished: p.date,
        })),
      }),
    ],
  }),
  component: () => (
    <QuranRoot>
      <BlogIndex />
    </QuranRoot>
  ),
});
