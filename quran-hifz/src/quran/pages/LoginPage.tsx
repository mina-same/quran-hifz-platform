import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ApiError } from "../../lib/api";

const schema = z.object({
  email:    z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});
type FormData = z.infer<typeof schema>;

const LOGO_SRC = "/quran/logo.png";

const DEV_ACCOUNTS = [
  { label: "مدير",     email: "admin@quran-hifz.sa",    password: "admin123",   icon: "ti-shield-check" },
  { label: "معلم",     email: "nasir@quran-hifz.sa",    password: "teacher123", icon: "ti-chalkboard" },
  { label: "طالب",     email: "abdullah@quran-hifz.sa", password: "student123", icon: "ti-user-circle" },
  { label: "ولي أمر", email: "parent@quran-hifz.sa",   password: "parent123",  icon: "ti-users" },
];

export function LoginPage({ onBack }: { onBack?: () => void }) {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [serverError,  setServerError]  = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      await login(data.email, data.password);
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

      {/* Centered card */}
      <div className="login-center">
        <div className="login-card">
          {/* Logo + org name */}
          <div className="login-card-header">
            <div className="login-logo-wrap">
              <img src={LOGO_SRC} alt="شعار الجمعية" className="login-logo" />
            </div>
            <div className="login-bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
            <h2 className="login-org-name">الجمعية الخيرية لتحفيظ القرآن الكريم</h2>
            <p className="login-org-sub">بالعماير</p>
          </div>

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

          {/* Dev accounts */}
          <div className="login-dev">
            <div className="login-dev-label">حسابات تجريبية</div>
            <div className="login-dev-row">
              {DEV_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  className="login-dev-btn"
                  onClick={() => { setValue("email", a.email); setValue("password", a.password); }}
                >
                  <i className={`ti ${a.icon}`} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
