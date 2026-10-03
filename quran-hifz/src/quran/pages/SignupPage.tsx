import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type SessionResponse } from "../context/AuthContext";
import { useRedirectIfSignedIn } from "../context/useRedirectIfSignedIn";
import { useTheme } from "../context/ThemeContext";
import { ApiError, get, post } from "../../lib/api";
import { toAr } from "../../lib/format";
import { hasArabic, LATIN_ONLY_MESSAGE } from "../../lib/latin";
import { LatinHint } from "../components/LatinHint";
import {
  PLATFORM_LOGO,
  PLATFORM_NAME,
  PUBLIC_DOMAIN,
  SALES_WHATSAPP_DISPLAY,
  TRIAL_DAYS,
  salesWhatsappLink,
} from "../config/saas";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

const ORG_TYPES = [
  { value: "association", label: "جمعية تحفيظ",  icon: "ti-building-community" },
  { value: "masjid",      label: "مسجد / جامع",  icon: "ti-building-mosque" },
  { value: "school",      label: "دار تحفيظ",    icon: "ti-school" },
  { value: "center",      label: "مركز تعليمي",  icon: "ti-building" },
  { value: "individual",  label: "معلم مستقل",   icon: "ti-user" },
] as const;

const COUNTRIES = ["مصر", "السعودية", "الإمارات", "الكويت", "قطر", "البحرين", "عُمان", "الأردن", "المغرب", "الجزائر", "تونس", "ليبيا", "السودان", "العراق", "اليمن", "فلسطين", "لبنان", "سوريا"];

const BENEFITS = [
  `تجربة كاملة ${toAr(TRIAL_DAYS)} أيام بكل المزايا — بدون بطاقة دفع`,
  "رابط خاص لمؤسستك يدخل منه المعلمون والطلاب وأولياء الأمور",
  "الحضور والتقييم وخطط الحفظ والتقارير جاهزة من اليوم الأول",
  "تطبيق جوال للمعلم والطالب وولي الأمر",
];

const schema = z
  .object({
    orgName:          z.string().trim().min(3, "اسم المؤسسة مطلوب (٣ أحرف على الأقل)"),
    orgType:          z.enum(["association", "masjid", "school", "center", "individual"]),
    slug:             z.string().refine((v) => !hasArabic(v), LATIN_ONLY_MESSAGE).pipe(z.string().regex(SLUG_RE, "من ٣ إلى ٣٢ حرفاً إنجليزياً صغيراً أو رقماً أو شرطة (-)")),
    country:          z.string().trim().min(2, "الدولة مطلوبة"),
    city:             z.string().trim().optional(),
    expectedStudents: z.string().optional(),
    ownerName:        z.string().trim().min(3, "الاسم مطلوب (٣ أحرف على الأقل)"),
    email:            z.string().trim().refine((v) => !hasArabic(v), LATIN_ONLY_MESSAGE).pipe(z.string().email("بريد إلكتروني غير صحيح")),
    phone:            z.string().trim().regex(/^\+?[0-9\s-]{8,20}$/, "رقم جوال غير صحيح"),
    password:         z.string().refine((v) => !hasArabic(v), LATIN_ONLY_MESSAGE).pipe(z.string().min(8, "كلمة المرور ٨ أحرف على الأقل")),
    confirm:          z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "كلمتا المرور غير متطابقتين" });
type FormData = z.infer<typeof schema>;

const STEP_ONE_FIELDS: (keyof FormData)[] = ["orgName", "orgType", "country", "city", "expectedStudents", "slug"];

type SlugState = { status: "idle" | "checking" | "ok" | "taken"; message?: string };

/** Lower-case, spaces → dashes, drop anything a URL slug can't hold. */
function sanitizeSlug(v: string): string {
  // Arabic is left in place on purpose: the field then shows the "switch your
  // keyboard" hint instead of the letters silently disappearing.
  if (hasArabic(v)) return v.slice(0, 32);
  return v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").slice(0, 32);
}

/** 0–4: ≥8 chars, letters + digits, a symbol, ≥12 chars. */
function passwordScore(p: string): number {
  if (!p) return 0;
  let s = p.length >= 8 ? 1 : 0;
  if (/[a-zA-Z]/.test(p) && /\d/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  if (p.length >= 12) s++;
  return s;
}
const STRENGTH = ["ضعيفة جداً", "ضعيفة", "متوسطة", "جيدة", "قوية"];

function Field({ label, icon, error, hint, children }: { label: string; icon?: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="login-field">
      <label className="login-label">{label}</label>
      <div className={`su-input ${error ? "has-error" : ""}`}>
        {icon && <i className={`ti ${icon} su-input-icon`} />}
        {children}
      </div>
      {error ? (
        <span className="login-field-error"><i className="ti ti-alert-circle" /> {error}</span>
      ) : (
        hint && <span className="signup-hint">{hint}</span>
      )}
    </div>
  );
}

export function SignupPage() {
  const { startSession } = useAuth();
  const redirecting = useRedirectIfSignedIn();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState("");
  const [slugState, setSlugState] = useState<SlugState>({ status: "idle" });
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, watch, setValue, setError, trigger, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { orgType: "association", country: "" },
      mode: "onTouched",
    });

  const slug = watch("slug") ?? "";
  const orgType = watch("orgType");
  const password = watch("password") ?? "";
  const email = watch("email") ?? "";
  const confirm = watch("confirm") ?? "";
  const score = passwordScore(password);

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

  async function next() {
    if (!(await trigger(STEP_ONE_FIELDS))) return;
    if (slugState.status === "taken") {
      setError("slug", { message: slugState.message ?? "هذا الرابط مستخدم" });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      const { confirm: _confirm, expectedStudents, ...rest } = data;
      const res = await post<SessionResponse>("/tenants/signup", {
        ...rest,
        expectedStudents: expectedStudents ? Number(expectedStudents) : undefined,
      });
      startSession(res);
      navigate({ to: "/$slug", params: { slug: res.tenant.slug } });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "حدث خطأ غير متوقع، حاول مرة أخرى";
      // A slug taken in the meantime belongs to step 1 — send the user back to it.
      if (err instanceof ApiError && err.status === 409 && /الرابط/.test(message)) {
        setError("slug", { message });
        setStep(1);
        return;
      }
      setServerError(message);
    }
  }

  const slugHint =
    slugState.status === "ok" ? (
      <span className="signup-slug-ok"><i className="ti ti-circle-check" /> الرابط متاح</span>
    ) : slugState.status === "checking" ? (
      <span><i className="ti ti-loader-2 lp-spin" /> جارٍ التحقق…</span>
    ) : (
      "أحرف إنجليزية صغيرة وأرقام وشرطة — مثل al-noor"
    );

  if (redirecting) return null;

  return (
    <div className="su-page">
      <header className="su-topbar">
        <a className="saas-brand" href="/">
          <img src={PLATFORM_LOGO} alt="" width={34} height={34} />
          <span>{PLATFORM_NAME}</span>
        </a>
        <div style={{ flex: 1 }} />
        <span className="su-have-account">لديك حساب؟</span>
        <a className="su-login-link" href="/login">تسجيل الدخول</a>
        <button className="login-theme-btn" onClick={toggleTheme} aria-label="تبديل المظهر">
          <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
        </button>
      </header>

      <main className="su-layout">
        {/* Brand / benefits panel */}
        <aside className="su-aside">
          <div className="su-aside-inner">
            <span className="su-badge"><i className="ti ti-gift" /> {toAr(TRIAL_DAYS)} أيام مجاناً</span>
            <h1>ابدأ إدارة حلقاتك رقمياً في دقيقتين</h1>
            <p>أنشئ حساب مؤسستك واحصل على رابطها الخاص فوراً.</p>
            <ul className="su-benefits">
              {BENEFITS.map((b) => <li key={b}><i className="ti ti-circle-check" /> {b}</li>)}
            </ul>
            <figure className="su-quote">
              <blockquote>«وفّرت عليّ ساعات في تسجيل الحضور وإعداد التقارير. أنصح بها كل معلم يريد التركيز على التعليم.»</blockquote>
              <figcaption><i className="ti ti-chalkboard" /> الشيخ نصر محمد — معلم قرآن</figcaption>
            </figure>
            <a className="su-help" href={salesWhatsappLink()} target="_blank" rel="noreferrer">
              <i className="ti ti-brand-whatsapp" />
              <span>تحتاج مساعدة في التسجيل؟<b dir="ltr">{SALES_WHATSAPP_DISPLAY}</b></span>
            </a>
          </div>
        </aside>

        {/* Form */}
        <section className="su-card">
          <ol className="su-steps" aria-label="خطوات التسجيل">
            <li className={step === 1 ? "active" : "done"}>
              <span>{step > 1 ? <i className="ti ti-check" /> : toAr(1)}</span> بيانات المؤسسة
            </li>
            <li className="su-steps-line" aria-hidden="true" />
            <li className={step === 2 ? "active" : ""}>
              <span>{toAr(2)}</span> حساب المدير
            </li>
          </ol>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {step === 1 ? (
              <>
                <h2 className="su-title">عرّفنا بمؤسستك</h2>

                <Field label="اسم المؤسسة" icon="ti-building-community" error={errors.orgName?.message}>
                  <input className="su-control" placeholder="مثال: جمعية تحفيظ القرآن بحي النور" {...register("orgName")} />
                </Field>

                <div className="login-field">
                  <label className="login-label">نوع المؤسسة</label>
                  <div className="su-types" role="radiogroup">
                    {ORG_TYPES.map((t) => (
                      <label key={t.value} className={`su-type ${orgType === t.value ? "selected" : ""}`}>
                        <input type="radio" value={t.value} {...register("orgType")} />
                        <i className={`ti ${t.icon}`} />
                        <span>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="signup-row">
                  <Field label="الدولة" icon="ti-world" error={errors.country?.message}>
                    <input className="su-control" list="su-countries" placeholder="اختر أو اكتب" {...register("country")} />
                    <datalist id="su-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
                  </Field>
                  <Field label="المدينة (اختياري)" icon="ti-map-pin" error={errors.city?.message}>
                    <input className="su-control" placeholder="القاهرة" {...register("city")} />
                  </Field>
                </div>

                <Field label="عدد الطلاب المتوقع (اختياري)" icon="ti-users" error={errors.expectedStudents?.message}>
                  <input className="su-control" type="number" min={0} inputMode="numeric" placeholder="مثال: 100" {...register("expectedStudents")} />
                </Field>

                <Field
                  label="رابط مؤسستك"
                  error={errors.slug?.message ?? (slugState.status === "taken" ? slugState.message : undefined)}
                  hint={slugHint}
                >
                  <div className="su-slug" dir="ltr">
                    <span className="signup-slug-prefix">{PUBLIC_DOMAIN}/</span>
                    <input
                      className="signup-slug-input"
                      placeholder="al-noor"
                      autoComplete="off"
                      spellCheck={false}
                      {...register("slug", { onChange: (e) => setValue("slug", sanitizeSlug(e.target.value)) })}
                    />
                  </div>
                </Field>

                <LatinHint value={slug} />
                {slugState.status === "ok" && (
                  <div className="su-link-preview">
                    <i className="ti ti-world-www" />
                    <span>سيدخل معلموك وطلابك من: <b dir="ltr">{PUBLIC_DOMAIN}/{slug}</b></span>
                  </div>
                )}

                <button type="button" className="login-submit" onClick={next}>
                  التالي: حساب المدير <i className="ti ti-arrow-left" />
                </button>
              </>
            ) : (
              <>
                <h2 className="su-title">أنشئ حساب المدير</h2>
                <p className="su-subtitle">ستدخل به إلى لوحة إدارة <b>{watch("orgName")}</b>، ويمكنك إضافة المعلمين والمشرفين لاحقاً.</p>

                <Field label="الاسم الكامل" icon="ti-user" error={errors.ownerName?.message}>
                  <input className="su-control" autoComplete="name" placeholder="الاسم كما سيظهر في المنصة" {...register("ownerName")} />
                </Field>

                <div className="signup-row">
                  <Field label="البريد الإلكتروني" icon="ti-mail" error={errors.email?.message}>
                    <input className="su-control" type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" {...register("email")} />
                  </Field>
                  <Field label="رقم الجوال (واتساب)" icon="ti-brand-whatsapp" error={errors.phone?.message}>
                    <input className="su-control" type="tel" dir="ltr" autoComplete="tel" placeholder="+20 1xx xxx xxxx" {...register("phone")} />
                  </Field>
                </div>

                <LatinHint value={email} />

                <Field label="كلمة المرور" icon="ti-lock" error={errors.password?.message}>
                  <input
                    className="su-control"
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    autoComplete="new-password"
                    placeholder="٨ أحرف على الأقل"
                    {...register("password")}
                  />
                  <button type="button" className="su-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "إخفاء" : "إظهار"}>
                    <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
                  </button>
                </Field>
                <LatinHint value={password} />
                {password && !hasArabic(password) && (
                  <div className={`su-strength s${score}`} aria-live="polite">
                    <div className="su-strength-bars">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= score ? "on" : ""} />)}</div>
                    <span>قوة كلمة المرور: {STRENGTH[score]}</span>
                  </div>
                )}

                <Field label="تأكيد كلمة المرور" icon="ti-lock-check" error={errors.confirm?.message}>
                  <input
                    className="su-control"
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    autoComplete="new-password"
                    placeholder="أعد كتابة كلمة المرور"
                    {...register("confirm")}
                  />
                </Field>
                <LatinHint value={confirm} />

                {serverError && (
                  <div className="login-server-error" role="alert">
                    <i className="ti ti-alert-triangle" /> {serverError}
                  </div>
                )}

                <div className="su-actions">
                  <button type="button" className="su-back" onClick={() => setStep(1)}>
                    <i className="ti ti-arrow-right" /> السابق
                  </button>
                  <button type="submit" className="login-submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><i className="ti ti-loader-2 lp-spin" /> جارٍ إنشاء الحساب...</>
                    ) : (
                      <>أنشئ الحساب وابدأ التجربة <i className="ti ti-arrow-left" /></>
                    )}
                  </button>
                </div>
              </>
            )}

            <p className="signin-switch">لديك حساب بالفعل؟ <a href="/login">سجّل الدخول</a></p>
            <p className="signup-footnote">
              <i className="ti ti-shield-lock" /> بياناتك محفوظة ولا تُشارَك مع أي جهة. بعد انتهاء التجربة يتواصل معك فريق المبيعات لتفعيل الاشتراك.
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
