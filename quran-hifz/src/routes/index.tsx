import { createFileRoute } from "@tanstack/react-router";
import QuranApp from "@/quran/QuranApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "المنصة التعليمية لجمعية التحفيظ بالعماير" },
      {
        name: "description",
        content: "منصة الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير — لإدارة الحلقات والطلاب والمعلمين.",
      },
      { property: "og:title", content: "المنصة التعليمية لجمعية التحفيظ بالعماير" },
      {
        property: "og:description",
        content: "منصة الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير.",
      },
    ],
  }),
  component: QuranApp,
});
