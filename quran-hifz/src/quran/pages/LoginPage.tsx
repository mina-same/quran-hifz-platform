import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../lib/api";
import type { PortalKey } from "../config/portals";

const PORTAL_LABELS: Record<PortalKey, string> = {
  student: "بوابة الطالب",
  teacher: "بوابة المعلم",
  admin:   "بوابة الإدارة",
  parent:  "بوابة ولي الأمر",
};
const PORTAL_ICONS: Record<PortalKey, string> = {
  student: "ti-book-2",
  teacher: "ti-chalkboard",
  admin:   "ti-layout-dashboard",
  parent:  "ti-users",
};

const schema = z.object({
  email:    z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});
type FormData = z.infer<typeof schema>;

const LOGO_SRC = "/quran/logo.png";

const DEV_ACCOUNTS = [
  { label: "مدير",      email: "admin@quran-hifz.sa",    password: "admin123",   icon: "ti-shield-check" },
  { label: "معلم",      email: "nasir@quran-hifz.sa",    password: "teacher123", icon: "ti-chalkboard" },
  { label: "طالب",      email: "abdullah@quran-hifz.sa", password: "student123", icon: "ti-user-circle" },
  { label: "ولي أمر",  email: "parent@quran-hifz.sa",   password: "parent123",  icon: "ti-users" },
];

/* Islamic 8-pointed star SVG watermark */
function StarWatermark() {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top: -30,
        left: -30,
        width: 160,
        height: 160,
        opacity: 0.045,
        pointerEvents: "none",
        transform: "rotate(15deg)",
      }}
    >
      <polygon points="100,10 120,80 190,80 135,125 155,195 100,155 45,195 65,125 10,80 80,80" fill="white" />
      <polygon points="100,35 114,75 155,75 122,100 136,140 100,118 64,140 78,100 45,75 86,75" fill="white" transform="rotate(22.5,100,100)" />
    </svg>
  );
}

export function LoginPage({ portalKey, onBack }: { portalKey?: PortalKey; onBack?: () => void }) {
  const { login } = useAuth();
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
    <div id="portal-screen" style={{ padding: "24px 16px", gap: 0 }}>

      {/* Header */}
      <div className="portal-header" style={{ marginBottom: 36 }}>
        <img className="portal-logo" src={LOGO_SRC} alt="شعار الجمعية" />
        <div className="portal-title">الجمعية الخيرية لتحفيظ القرآن الكريم</div>
        <div className="portal-sub" style={{ marginTop: 8, fontSize: 12, letterSpacing: "0.5px", color: "rgba(255,255,255,0.45)" }}>
          بالعماير
        </div>
      </div>

      {/* Glass card */}
      <div className="lp-card">
        <StarWatermark />

        {/* Bismillah */}
        <div className="lp-bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>

        {/* Portal badge */}
        {portalKey ? (
          <div className="lp-badge">
            <i className={`ti ${PORTAL_ICONS[portalKey]}`} />
            {PORTAL_LABELS[portalKey]}
          </div>
        ) : (
          <div className="lp-badge-neutral">تسجيل الدخول</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ marginTop: 28 }}>

          {/* Email */}
          <div className="lp-field">
            <label className="lp-label">البريد الإلكتروني</label>
            <div className="lp-input-wrap">
              <i className="ti ti-mail lp-input-icon" />
              <input
                className="lp-input"
                type="email"
                dir="ltr"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
              />
            </div>
            {errors.email && <span className="lp-error"><i className="ti ti-alert-circle" />{errors.email.message}</span>}
          </div>

          {/* Password */}
          <div className="lp-field">
            <label className="lp-label">كلمة المرور</label>
            <div className="lp-input-wrap">
              <i className="ti ti-lock lp-input-icon" />
              <input
                className="lp-input"
                type={showPassword ? "text" : "password"}
                dir="ltr"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              <button
                type="button"
                className="lp-eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
              </button>
            </div>
            {errors.password && <span className="lp-error"><i className="ti ti-alert-circle" />{errors.password.message}</span>}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="lp-server-error" role="alert">
              <i className="ti ti-shield-x" />
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="lp-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <><i className="ti ti-loader-2 lp-spin" /> جارٍ التحقق...</>
            ) : (
              <>دخول <i className="ti ti-arrow-left" /></>
            )}
          </button>

          {/* Back */}
          {onBack && (
            <button type="button" className="lp-back" onClick={onBack}>
              <i className="ti ti-arrow-right" />
              العودة لاختيار البوابة
            </button>
          )}
        </form>

        {/* Dev accounts */}
        <div className="lp-dev">
          <div className="lp-dev-label">حسابات تجريبية</div>
          <div className="lp-dev-row">
            {DEV_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                className="lp-dev-btn"
                onClick={() => { setValue("email", a.email); setValue("password", a.password); }}
              >
                <i className={`ti ${a.icon}`} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="portal-footer" style={{ position: "relative", bottom: "auto", left: "auto", transform: "none", marginTop: 36 }}>
        منصة تحفيظ القرآن •{" "}
        <a href="https://www.thebrightstation.com" target="_blank" rel="noreferrer">
          The Bright Station
        </a>
      </div>
    </div>
  );
}
