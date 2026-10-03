import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useRedirectIfSignedIn } from "../context/useRedirectIfSignedIn";
import { useTheme } from "../context/ThemeContext";
import { ApiError } from "../../lib/api";
import { hasArabic } from "../../lib/latin";
import { LatinHint } from "../components/LatinHint";
import { LoginIntro } from "../components/LoginIntro";
import { PLATFORM_LOGO, PLATFORM_NAME, PUBLIC_DOMAIN } from "../config/saas";

/**
 * `/login` — sign in without knowing your organisation's link. The server
 * resolves the organisation from the email; only when the same email exists
 * in several organisations do we ask for the link (slug).
 */
export function SignInPage() {
  const { login } = useAuth();
  const redirecting = useRedirectIfSignedIn();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [needSlug, setNeedSlug] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const invalid = !email || !password || hasArabic(email) || hasArabic(password) || hasArabic(slug) || (needSlug && !slug);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setBusy(true);
    setError("");
    try {
      const res = await login(email.trim(), password, needSlug ? slug.trim().toLowerCase() : undefined);
      navigate({ to: "/$slug", params: { slug: res.tenant.slug } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNeedSlug(true);
        setError("هذا البريد مسجَّل في أكثر من مؤسسة — أدخل رابط مؤسستك للمتابعة.");
      } else {
        setError(err instanceof ApiError ? err.message : "حدث خطأ غير متوقع، حاول مرة أخرى");
      }
      setBusy(false);
    }
  }

  if (redirecting) return null;

  return (
    <div className="login-page">
      <div className="login-topbar">
        <a className="login-back-btn" href="/"><i className="ti ti-arrow-right" /><span>الرئيسية</span></a>
        <div style={{ flex: 1 }} />
        <button className="login-theme-btn" onClick={toggleTheme} aria-label="تبديل المظهر">
          <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
        </button>
      </div>

      <div className="login-center">
        <div className="login-split">
          <form className="login-card" onSubmit={submit} noValidate>
            <div className="login-card-header">
              <div className="login-logo-wrap"><img src={PLATFORM_LOGO} alt="" className="login-logo" /></div>
              <h1 className="login-org-name">تسجيل الدخول</h1>
              <p className="login-org-sub">إلى {PLATFORM_NAME} — للإدارة والمعلمين والطلاب وأولياء الأمور</p>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="si-email">البريد الإلكتروني</label>
              <div className="login-input-wrap">
                <i className="ti ti-mail login-input-icon" />
                <input id="si-email" className="login-input" type="email" dir="ltr" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <LatinHint value={email} />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="si-pass">كلمة المرور</label>
              <div className="login-input-wrap">
                <i className="ti ti-lock login-input-icon" />
                <input id="si-pass" className="login-input" type={showPassword ? "text" : "password"} dir="ltr" placeholder="••••••••" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="login-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "إخفاء" : "إظهار"}>
                  <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
                </button>
              </div>
              <LatinHint value={password} />
            </div>

            {needSlug && (
              <div className="login-field">
                <label className="login-label" htmlFor="si-slug">رابط مؤسستك</label>
                <div className="signup-slug" dir="ltr">
                  <span className="signup-slug-prefix">{PUBLIC_DOMAIN}/</span>
                  <input id="si-slug" className="signup-slug-input" placeholder="al-noor" autoComplete="off" spellCheck={false} value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
                <LatinHint value={slug} />
              </div>
            )}

            {error && <div className="login-server-error" role="alert"><i className="ti ti-shield-x" /> {error}</div>}

            <button type="submit" className="login-submit" disabled={busy || invalid}>
              {busy ? <><i className="ti ti-loader-2 lp-spin" /> جارٍ التحقق...</> : <>دخول <i className="ti ti-arrow-left" /></>}
            </button>

            <p className="signin-switch">
              ليس لمؤسستك حساب بعد؟ <a href="/signup">سجّل مؤسستك مجاناً</a>
            </p>
          </form>

          <LoginIntro />
        </div>
      </div>
    </div>
  );
}
