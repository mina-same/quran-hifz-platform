import { createFileRoute } from "@tanstack/react-router";
import { SignupApp } from "@/quran/QuranApp";
import { PLATFORM_NAME, TRIAL_DAYS } from "@/quran/config/saas";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/signup")({
  head: () =>
    seo({
      title: `سجّل مؤسستك مجاناً — ${PLATFORM_NAME}`,
      description: `أنشئ حساب جمعيتك أو مسجدك أو دار التحفيظ في دقيقتين، واحصل على رابط خاص وتجربة مجانية ${TRIAL_DAYS} أيام.`,
      path: "/signup",
    }),
  component: SignupApp,
});
