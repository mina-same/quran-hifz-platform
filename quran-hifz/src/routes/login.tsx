import { createFileRoute } from "@tanstack/react-router";
import { SignInApp } from "@/quran/QuranApp";
import { PLATFORM_NAME } from "@/quran/config/saas";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () =>
    seo({
      title: `تسجيل الدخول — ${PLATFORM_NAME}`,
      description: `ادخل إلى حساب مؤسستك على ${PLATFORM_NAME}: الإدارة والمعلمون والطلاب وأولياء الأمور.`,
      path: "/login",
    }),
  component: SignInApp,
});
