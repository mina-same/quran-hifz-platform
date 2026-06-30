import { createFileRoute } from "@tanstack/react-router";
import QuranApp from "@/quran/QuranApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "جمعية تحفيظ القرآن الكريم بالعماير" },
      {
        name: "description",
        content: "منصة الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير — لإدارة الحلقات والطلاب والمعلمين.",
      },
      { property: "og:title", content: "جمعية تحفيظ القرآن الكريم بالعماير" },
      {
        property: "og:description",
        content: "منصة الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير.",
      },
    ],
  }),
  component: QuranApp,
});
