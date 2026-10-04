import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { toAr } from "../../lib/format";
import { PLATFORM_NAME, SALES_WHATSAPP_DISPLAY, TRIAL_DAYS, salesWhatsappLink, trialDaysLeft } from "../config/saas";

function dayWord(n: number): string {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  if (n <= 10) return `${toAr(n)} أيام`;
  return `${toAr(n)} يوماً`;
}

/** Thin strip above the page content while the organisation is on trial.
 *  Admins get the "subscribe" call to action; other roles just see the notice. */
export function TrialBanner() {
  const { tenant, user } = useAuth();
  if (!tenant || tenant.status !== "trial") return null;

  const left = trialDaysLeft(tenant);
  const urgent = left <= 2;
  // The sidebar countdown carries the trial the rest of the time.
  if (!urgent) return null;
  const message = `السلام عليكم، أرغب في تفعيل اشتراك ${tenant.name} (/${tenant.slug}) في ${PLATFORM_NAME}`;

  return (
    <div className={`trial-banner ${urgent ? "urgent" : ""}`} role="status">
      <i className={`ti ${urgent ? "ti-hourglass-low" : "ti-gift"}`} />
      <span>
        أنت في الفترة التجريبية المجانية — {left > 0 ? <>متبقٍّ <b>{dayWord(left)}</b></> : <b>تنتهي اليوم</b>}
      </span>
      {user?.role === "admin" && (
        <a className="trial-banner-cta" href={salesWhatsappLink(message)} target="_blank" rel="noreferrer">
          <i className="ti ti-brand-whatsapp" /> اشترك الآن
        </a>
      )}
    </div>
  );
}

/** Full-screen replacement for the app once the trial/subscription has ended. */
export function SubscriptionEnded() {
  const { tenant, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.role === "admin";
  const message = tenant
    ? `السلام عليكم، انتهت الفترة التجريبية لـ ${tenant.name} (/${tenant.slug}) وأرغب في تفعيل الاشتراك في ${PLATFORM_NAME}`
    : undefined;

  return (
    <div className="login-page">
      <div className="login-topbar">
        <button className="login-back-btn" onClick={logout}>
          <i className="ti ti-logout" />
          <span>تسجيل الخروج</span>
        </button>
        <div style={{ flex: 1 }} />
        <button className="login-theme-btn" onClick={toggleTheme} aria-label="تبديل المظهر">
          <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
        </button>
      </div>
      <div className="login-center">
        <div className="login-card sub-ended-card">
          <div className="sub-ended-icon"><i className="ti ti-hourglass-off" /></div>
          <h2 className="login-org-name">
            {tenant?.status === "suspended" ? "الحساب موقوف مؤقتاً" : "انتهت الفترة التجريبية"}
          </h2>
          <p className="sub-ended-text">
            {isAdmin ? (
              <>
                شكراً لتجربتك {PLATFORM_NAME}. بياناتك محفوظة كما هي — تواصل مع فريق المبيعات
                لتفعيل اشتراك <b>{tenant?.name}</b> والعودة للعمل فوراً.
              </>
            ) : (
              <>
                اشتراك <b>{tenant?.name}</b> غير مفعَّل حالياً. يرجى التواصل مع إدارة المؤسسة لتفعيله.
              </>
            )}
          </p>
          {isAdmin && (
            <>
              <a className="login-submit sub-ended-cta" href={salesWhatsappLink(message)} target="_blank" rel="noreferrer">
                <i className="ti ti-brand-whatsapp" /> تواصل مع المبيعات عبر واتساب
              </a>
              <p className="signup-footnote" dir="ltr">{SALES_WHATSAPP_DISPLAY}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Remaining ms until `iso`, refreshed every second (null until mounted, so
 *  SSR and the first client render agree). */
function useRemaining(iso: string): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, new Date(iso).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return left;
}

const pad = (n: number) => toAr(String(n).padStart(2, "0"));

/** Sidebar: compact live countdown to the end of the free trial — a progress
 *  ring with the days left, and the hours:minutes:seconds beside it. */
export function TrialCountdown() {
  const { tenant, user } = useAuth();
  const left = useRemaining(tenant?.trialEndsAt ?? new Date(0).toISOString());
  if (!tenant || tenant.status !== "trial" || left === null) return null;

  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const remaining = Math.min(1, left / (TRIAL_DAYS * 86_400_000));
  const urgent = left <= 2 * 86_400_000;
  const message = `السلام عليكم، أرغب في تفعيل اشتراك ${tenant.name} (/${tenant.slug}) في ${PLATFORM_NAME}`;

  const R = 19;
  const C = 2 * Math.PI * R;

  return (
    <div className={`trial-cd ${urgent ? "urgent" : ""}`} role="timer" aria-label={`متبقٍّ على الفترة التجريبية ${days} يوم و${hours} ساعة`}>
      <div className="trial-cd-ring" aria-hidden="true">
        <svg viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={R} className="track" />
          <circle cx="22" cy="22" r={R} className="fill" strokeDasharray={C} strokeDashoffset={C * (1 - remaining)} />
        </svg>
        <span>{toAr(days)}</span>
      </div>
      <div className="trial-cd-text">
        <span className="trial-cd-label">{days > 0 ? "متبقٍّ على التجربة" : "آخر يوم في التجربة"}</span>
        <span className="trial-cd-time" dir="ltr">{pad(hours)}:{pad(minutes)}:{pad(seconds)}</span>
      </div>
      {user?.role === "admin" && (
        <a className="trial-cd-cta" href={salesWhatsappLink(message)} target="_blank" rel="noreferrer" title="فعّل الاشتراك عبر واتساب">
          اشترك <i className="ti ti-arrow-left" />
        </a>
      )}
    </div>
  );
}
