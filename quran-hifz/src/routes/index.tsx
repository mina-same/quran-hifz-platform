import { createFileRoute } from "@tanstack/react-router";
import { SaasHomeApp } from "@/quran/QuranApp";
import { PLATFORM_LOGO_PNG, PLATFORM_NAME, PLATFORM_TAGLINE, TRIAL_DAYS } from "@/quran/config/saas";
import { absoluteUrl, jsonLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...seo({
      title: `${PLATFORM_NAME} — ${PLATFORM_TAGLINE}`,
      description: `${PLATFORM_TAGLINE}: الحضور والتقييم وخطط الحفظ والمراجعة وبوابة ولي الأمر. جرّبها مجاناً ${TRIAL_DAYS} أيام.`,
      path: "/",
    }),
    scripts: [
      jsonLd({
        "@type": "SoftwareApplication",
        name: PLATFORM_NAME,
        description: PLATFORM_TAGLINE,
        url: absoluteUrl("/"),
        image: absoluteUrl(PLATFORM_LOGO_PNG),
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: "ar",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: `تجربة مجانية ${TRIAL_DAYS} أيام` },
      }),
    ],
  }),
  component: SaasHomeApp,
});
