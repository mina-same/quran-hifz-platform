import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ApiError, get } from "../../lib/api";
import { PLATFORM_NAME, PLATFORM_LOGO } from "../config/saas";
import { LoginIntro } from "../components/LoginIntro";

const schema = z.object({
  email:    z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});
type FormData = z.infer<typeof schema>;


type TenantBranding = { name: string; slug: string };

/** Sign-in for one organisation, reached at /<slug>. */
export function LoginPage({ slug, onBack }: { slug: string; onBack?: () => void }) {
  const { login } = useAuth();
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setNotFound(false);
    get<{ tenant: TenantBranding }>(`/tenants/by-slug/${encodeURIComponent(slug)}`)
      .then((res) => setBranding(res.tenant))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      });
  }, [slug]);
  const { theme, toggleTheme } = useTheme();
  const [serverError,  setServerError]  = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      await login(data.email, data.password, slug);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "حدث خطأ غير متوقع، حاول مرة أخرى");
    }
  }

  return (
    <div className="login-page">
      {/* Header bar */}
      <div className="login-topbar">
        {onBack && (
          <button className="login-back-btn" onClick={onBack}>
            <i className="ti ti-arrow-right" />
            <span>العودة</span>
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="login-theme-btn" onClick={toggleTheme} aria-label="تبديل المظهر">
          <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
        </button>
      </div>

      {/* Intro panel + login card, side by side. Under RTL the FIRST flex item
          lands on the right, so the card carries order:1 and the intro order:2
          to put the intro on the left — see .login-split in quran.css. On a
          narrow screen they stack with the card first, since signing in is the
          reason the visitor is here. */}
      <div className="login-center">
        <div className="login-split">
          <div className="login-card">
          {/* Logo + org name */}
          <div className="login-card-header">
            <div className="login-logo-wrap">
              <img src={PLATFORM_LOGO} alt="" className="login-logo" />
            </div>
            <div className="login-bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
            <h2 className="login-org-name">{branding?.name ?? (notFound ? "رابط غير معروف" : "…")}</h2>
            <p className="login-org-sub" dir="ltr">/{slug}</p>
          </div>

          {notFound ? (
            <div className="login-server-error" role="alert">
              <i className="ti ti-building-off" /> لا توجد مؤسسة مسجَّلة بهذا الرابط على {PLATFORM_NAME}.
              تأكد من الرابط أو <a href="/signup">سجّل مؤسستك الآن</a>.
            </div>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email */}
            <div className="login-field">
              <label className="login-label">البريد الإلكتروني</label>
              <div className="login-input-wrap">
                <i className="ti ti-mail login-input-icon" />
                <input
                  className="login-input"
                  type="email"
                  dir="ltr"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <span className="login-field-error">
                  <i className="ti ti-alert-circle" /> {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label">كلمة المرور</label>
              <div className="login-input-wrap">
                <i className="ti ti-lock login-input-icon" />
                <input
                  className="login-input"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "إخفاء" : "إظهار"}
                >
                  <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
                </button>
              </div>
              {errors.password && (
                <span className="login-field-error">
                  <i className="ti ti-alert-circle" /> {errors.password.message}
                </span>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="login-server-error" role="alert">
                <i className="ti ti-shield-x" /> {serverError}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><i className="ti ti-loader-2 lp-spin" /> جارٍ التحقق...</>
              ) : (
                <>دخول <i className="ti ti-arrow-left" /></>
              )}
            </button>
            </form>
          )}
          </div>

          <LoginIntro />
        </div>
      </div>
    </div>
  );
}
