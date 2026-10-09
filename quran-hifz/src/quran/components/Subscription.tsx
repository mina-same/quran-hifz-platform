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

/** Remaining ms until `iso`, refreshed every 30s (null until mounted, so
 *  SSR and the first client render agree). */
function useRemaining(iso: string): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, new Date(iso).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);
  return left;
}

/** Arabic count + noun with the right plural form (١ يوم، يومان، ٣ أيام، ١١ يوماً). */
function countWord(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${toAr(n)} ${few}`;
  return `${toAr(n)} ${many}`;
}
const daysWord = (n: number) => countWord(n, "يوم واحد", "يومان", "أيام", "يوماً");
const hoursWord = (n: number) => countWord(n, "ساعة", "ساعتان", "ساعات", "ساعة");
const minutesWord = (n: number) => countWord(n, "دقيقة", "دقيقتان", "دقائق", "دقيقة");

/** «٦ أيام و٢٣ ساعة» — or, on the last day, «٥ ساعات و٢٠ دقيقة». */
function remainingText(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return hours > 0 ? `${daysWord(days)} و${hoursWord(hours)}` : daysWord(days);
  if (hours > 0) return minutes > 0 ? `${hoursWord(hours)} و${minutesWord(minutes)}` : hoursWord(hours);
  return minutes > 0 ? minutesWord(minutes) : "أقل من دقيقة";
}

/** «اليوم الساعة ١٠:٣٠ م» / «غداً الساعة …» / «الجمعة، ١٦ أكتوبر». */
function endLabel(end: Date): string {
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = end.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
  if (dayKey(end) === dayKey(new Date())) return `اليوم الساعة ${time}`;
  if (dayKey(end) === dayKey(tomorrow)) return `غداً الساعة ${time}`;
  return end.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
}

/** Sidebar card: how much of the free trial is left, in words. */
export function TrialCountdown() {
  const { tenant, user } = useAuth();
  const left = useRemaining(tenant?.trialEndsAt ?? new Date(0).toISOString());
  if (!tenant || tenant.status !== "trial" || left === null) return null;

  const remaining = Math.min(1, left / (TRIAL_DAYS * 86_400_000));
  const lastDay = left < 86_400_000;
  const ended = left === 0;
  const endsOn = endLabel(new Date(tenant.trialEndsAt));
  const message = `السلام عليكم، أرغب في تفعيل اشتراك ${tenant.name} (/${tenant.slug}) في ${PLATFORM_NAME}`;

  return (
    <div className={`trial-cd ${lastDay ? "urgent" : ""}`} role="status">
      <div className="trial-cd-top">
        <span className="trial-cd-label"><i className={`ti ${lastDay ? "ti-hourglass-low" : "ti-hourglass-high"}`} /> الفترة التجريبية</span>
        {user?.role === "admin" && (
          <a className="trial-cd-cta" href={salesWhatsappLink(message)} target="_blank" rel="noreferrer" title="فعّل الاشتراك عبر واتساب">
            اشترك <i className="ti ti-arrow-left" />
          </a>
        )}
      </div>
      <div className="trial-cd-left">{ended ? "انتهت الفترة التجريبية" : <>متبقٍّ <b>{remainingText(left)}</b></>}</div>
      <div className="trial-cd-bar" aria-hidden="true"><i style={{ width: `${remaining * 100}%` }} /></div>
      {!ended && <div className="trial-cd-end">تنتهي {endsOn}</div>}
    </div>
  );
}
