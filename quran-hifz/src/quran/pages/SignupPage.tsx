import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type SessionResponse } from "../context/AuthContext";
import { useHost } from "../components/SaasChrome";
import { useTheme } from "../context/ThemeContext";
import { ApiError, get, post } from "../../lib/api";
import { toAr } from "../../lib/format";
import { PLATFORM_NAME, TRIAL_DAYS, salesWhatsappLink, SALES_WHATSAPP_DISPLAY } from "../config/saas";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

const ORG_TYPES = [
  { value: "association", label: "جمعية تحفيظ" },
  { value: "masjid",      label: "مسجد / جامع" },
  { value: "school",      label: "مدرسة / دار تحفيظ" },
  { value: "center",      label: "مركز تعليمي" },
  { value: "individual",  label: "معلم مستقل" },
] as const;

const schema = z
  .object({
    orgName:          z.string().trim().min(3, "اسم المؤسسة مطلوب (٣ أحرف على الأقل)"),
    orgType:          z.enum(["association", "masjid", "school", "center", "individual"]),
    slug:             z.string().regex(SLUG_RE, "من ٣ إلى ٣٢ حرفاً إنجليزياً صغيراً أو رقماً أو شرطة (-)"),
    country:          z.string().trim().min(2, "الدولة مطلوبة"),
    city:             z.string().trim().optional(),
    expectedStudents: z.string().optional(),
    ownerName:        z.string().trim().min(3, "الاسم مطلوب (٣ أحرف على الأقل)"),
    email:            z.string().trim().email("بريد إلكتروني غير صحيح"),
    phone:            z.string().trim().regex(/^\+?[0-9\s-]{8,20}$/, "رقم جوال غير صحيح"),
    password:         z.string().min(8, "كلمة المرور ٨ أحرف على الأقل"),
    confirm:          z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "كلمتا المرور غير متطابقتين" });
type FormData = z.infer<typeof schema>;

type SlugState = { status: "idle" | "checking" | "ok" | "taken"; message?: string };

/** Lower-case, spaces → dashes, drop anything a URL slug can't hold. */
function sanitizeSlug(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").slice(0, 32);
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="login-field">
      <label className="login-label">{label}</label>
      {children}
      {hint && !error && <span className="signup-hint">{hint}</span>}
      {error && (
        <span className="login-field-error">
          <i className="ti ti-alert-circle" /> {error}
        </span>
      )}
    </div>
  );
}

export function SignupPage() {
  const { startSession } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [slugState, setSlugState] = useState<SlugState>({ status: "idle" });

  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { orgType: "association", country: "" },
    });

  const slug = watch("slug") ?? "";
  const origin = useHost();

  // Debounced live availability check.
  useEffect(() => {
    if (!SLUG_RE.test(slug)) {
      setSlugState({ status: "idle" });
      return;
    }
    setSlugState({ status: "checking" });
    const t = setTimeout(() => {
      get<{ available: boolean; message: string }>(`/tenants/check-slug/${slug}`)
        .then((r) => setSlugState({ status: r.available ? "ok" : "taken", message: r.message }))
        .catch(() => setSlugState({ status: "idle" }));
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  async function onSubmit(data: FormData) {
    setServerError("");
    if (slugState.status === "taken") {
      setError("slug", { message: slugState.message ?? "هذا الرابط مستخدم" });
      return;
    }
    try {
      const { confirm: _confirm, expectedStudents, ...rest } = data;
      const res = await post<SessionResponse>("/tenants/signup", {
        ...rest,
        expectedStudents: expectedStudents ? Number(expectedStudents) : undefined,
      });
      startSession(res);
      navigate({ to: "/$slug", params: { slug: res.tenant.slug } });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "حدث خطأ غير متوقع، حاول مرة أخرى");
    }
  }

  return (
    <div className="login-page">
      <div className="login-topbar">
        <a className="login-back-btn" href="/">
          <i className="ti ti-arrow-right" />
          <span>الرئيسية</span>
        </a>
        <div style={{ flex: 1 }} />
        <button className="login-theme-btn" onClick={toggleTheme} aria-label="تبديل المظهر">
          <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
        </button>
      </div>

      <div className="login-center">
        <div className="login-card signup-card">
          <div className="login-card-header">
            <h2 className="login-org-name">أنشئ حساب مؤسستك على {PLATFORM_NAME}</h2>
            <p className="login-org-sub">
              تجربة مجانية كاملة لمدة {toAr(TRIAL_DAYS)} أيام — بدون بطاقة دفع
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="signup-section-title"><i className="ti ti-building-community" /> بيانات المؤسسة</div>

            <Field label="اسم المؤسسة" error={errors.orgName?.message}>
              <input className="login-input signup-input" placeholder="مثال: جمعية تحفيظ القرآن بحي النور" {...register("orgName")} />
            </Field>

            <div className="signup-row">
              <Field label="نوع المؤسسة" error={errors.orgType?.message}>
                <select className="login-input signup-input" {...register("orgType")}>
                  {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="عدد الطلاب المتوقع" error={errors.expectedStudents?.message}>
                <input className="login-input signup-input" type="number" min={0} dir="ltr" placeholder="100" {...register("expectedStudents")} />
              </Field>
            </div>

            <div className="signup-row">
              <Field label="الدولة" error={errors.country?.message}>
                <input className="login-input signup-input" placeholder="مصر" {...register("country")} />
              </Field>
              <Field label="المدينة (اختياري)" error={errors.city?.message}>
                <input className="login-input signup-input" placeholder="القاهرة" {...register("city")} />
              </Field>
            </div>

            <Field
              label="رابط مؤسستك"
              error={errors.slug?.message ?? (slugState.status === "taken" ? slugState.message : undefined)}
              hint={
                slugState.status === "ok" ? (
                  <span className="signup-slug-ok"><i className="ti ti-circle-check" /> الرابط متاح</span>
                ) : slugState.status === "checking" ? (
                  <span><i className="ti ti-loader-2 lp-spin" /> جارٍ التحقق…</span>
                ) : (
                  "سيدخل منه معلموك وطلابك وأولياء الأمور — أحرف إنجليزية صغيرة وأرقام وشرطة"
                )
              }
            >
              <div className="signup-slug" dir="ltr">
                <span className="signup-slug-prefix">{origin}/</span>
                <input
                  className="signup-slug-input"
                  placeholder="al-noor"
                  autoComplete="off"
                  spellCheck={false}
                  {...register("slug", {
                    onChange: (e) => setValue("slug", sanitizeSlug(e.target.value)),
                  })}
                />
              </div>
            </Field>

            <div className="signup-section-title"><i className="ti ti-user-shield" /> حساب المدير</div>

            <Field label="الاسم الكامل" error={errors.ownerName?.message}>
              <input className="login-input signup-input" autoComplete="name" {...register("ownerName")} />
            </Field>

            <div className="signup-row">
              <Field label="البريد الإلكتروني" error={errors.email?.message}>
                <input className="login-input signup-input" type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" {...register("email")} />
              </Field>
              <Field label="رقم الجوال (واتساب)" error={errors.phone?.message}>
                <input className="login-input signup-input" type="tel" dir="ltr" autoComplete="tel" placeholder="+20 1xx xxx xxxx" {...register("phone")} />
              </Field>
            </div>

            <div className="signup-row">
              <Field label="كلمة المرور" error={errors.password?.message}>
                <input className="login-input signup-input" type="password" dir="ltr" autoComplete="new-password" placeholder="••••••••" {...register("password")} />
              </Field>
              <Field label="تأكيد كلمة المرور" error={errors.confirm?.message}>
                <input className="login-input signup-input" type="password" dir="ltr" autoComplete="new-password" placeholder="••••••••" {...register("confirm")} />
              </Field>
            </div>

            {serverError && (
              <div className="login-server-error" role="alert">
                <i className="ti ti-alert-triangle" /> {serverError}
              </div>
            )}

            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><i className="ti ti-loader-2 lp-spin" /> جارٍ إنشاء الحساب...</>
              ) : (
                <>ابدأ التجربة المجانية <i className="ti ti-arrow-left" /></>
              )}
            </button>

            <p className="signup-footnote">
              بعد انتهاء التجربة يتواصل معك فريق المبيعات لتفعيل الاشتراك. لديك سؤال؟{" "}
              <a href={salesWhatsappLink()} target="_blank" rel="noreferrer">
                <i className="ti ti-brand-whatsapp" /> <span dir="ltr">{SALES_WHATSAPP_DISPLAY}</span>
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
