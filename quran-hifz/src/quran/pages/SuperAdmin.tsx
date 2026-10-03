import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, get, patch, post } from "../../lib/api";
import { toAr } from "../../lib/format";
import { hasArabic } from "../../lib/latin";
import { useTheme } from "../context/ThemeContext";
import { LatinHint } from "../components/LatinHint";
import { PLATFORM_LOGO, PLATFORM_NAME, PUBLIC_DOMAIN } from "../config/saas";

/**
 * `/super` — the platform owner's console (super admin). Separate account,
 * separate token (scope 'platform'), stored under its own key so it never
 * mixes with an organisation session in the same browser.
 */

const TOKEN_KEY = "qh_platform_token";

function readToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function writeToken(t: string | null): void {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
}
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

type OrgType = "association" | "masjid" | "school" | "center" | "individual";
type TenantRow = {
  _id: string;
  name: string;
  slug: string;
  orgType: OrgType;
  ownerName: string;
  email: string;
  phone: string;
  country: string;
  city?: string;
  expectedStudents?: number;
  status: "trial" | "active" | "suspended";
  trialEndsAt: string;
  paidUntil?: string;
  notes?: string;
  createdAt: string;
  hasAccess: boolean;
  users: number;
  students: number;
};
type Summary = { total: number; trial: number; expired: number; active: number; suspended: number; students: number; newThisWeek: number };

const ORG_TYPE_LABEL: Record<OrgType, string> = {
  association: "جمعية", masjid: "مسجد", school: "دار تحفيظ", center: "مركز", individual: "معلم مستقل",
};

type Filter = "all" | "trial" | "expired" | "active" | "suspended";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "كل المؤسسات" },
  { value: "trial", label: "في التجربة" },
  { value: "expired", label: "انتهت صلاحيتها" },
  { value: "active", label: "مشتركة" },
  { value: "suspended", label: "موقوفة" },
];

function stateOf(t: TenantRow): Exclude<Filter, "all"> {
  if (t.status === "suspended") return "suspended";
  if (!t.hasAccess) return "expired";
  return t.status === "active" ? "active" : "trial";
}

function fmtDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}

function StatusBadge({ t }: { t: TenantRow }) {
  const s = stateOf(t);
  if (s === "trial") {
    const d = daysUntil(t.trialEndsAt);
    return <span className="sa-badge trial">تجربة — باقي {toAr(d)} {d <= 10 ? "أيام" : "يوماً"}</span>;
  }
  if (s === "active") return <span className="sa-badge active">مشترك {t.paidUntil ? `حتى ${fmtDate(t.paidUntil)}` : "— مفتوح"}</span>;
  if (s === "suspended") return <span className="sa-badge suspended">موقوف</span>;
  return <span className="sa-badge expired">{t.status === "active" ? "انتهى الاشتراك" : "انتهت التجربة"}</span>;
}

/* ── Login ──────────────────────────────────────────────────────────────── */

function SuperLogin({ onToken }: { onToken: (t: string) => void }) {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (hasArabic(email) || hasArabic(password)) return;
    setBusy(true);
    setError("");
    try {
      const res = await post<{ token: string }>("/platform/login", { email, password });
      writeToken(res.token);
      onToken(res.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذّر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }

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
        <form className="login-card" onSubmit={submit} noValidate>
          <div className="login-card-header">
            <div className="login-logo-wrap"><img src={PLATFORM_LOGO} alt="" className="login-logo" /></div>
            <h1 className="login-org-name">لوحة مالك المنصة</h1>
            <p className="login-org-sub">{PLATFORM_NAME} — دخول المشرف العام</p>
          </div>
          <div className="login-field">
            <label className="login-label" htmlFor="sa-email">البريد الإلكتروني</label>
            <div className="login-input-wrap">
              <i className="ti ti-mail login-input-icon" />
              <input id="sa-email" className="login-input" type="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <LatinHint value={email} />
          </div>
          <div className="login-field">
            <label className="login-label" htmlFor="sa-pass">كلمة المرور</label>
            <div className="login-input-wrap">
              <i className="ti ti-lock login-input-icon" />
              <input id="sa-pass" className="login-input" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <LatinHint value={password} />
          </div>
          {error && <div className="login-server-error" role="alert"><i className="ti ti-shield-x" /> {error}</div>}
          <button type="submit" className="login-submit" disabled={busy || !email || !password}>
            {busy ? <><i className="ti ti-loader-2 lp-spin" /> جارٍ التحقق...</> : <>دخول <i className="ti ti-arrow-left" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Action dialog ──────────────────────────────────────────────────────── */

type Action =
  | { kind: "activate"; t: TenantRow }
  | { kind: "extend"; t: TenantRow }
  | { kind: "suspend"; t: TenantRow }
  | { kind: "unsuspend"; t: TenantRow }
  | { kind: "note"; t: TenantRow };

function ActionDialog({ action, onClose, onDone, token }: { action: Action; onClose: () => void; onDone: () => void; token: string }) {
  const [months, setMonths] = useState(12);
  const [days, setDays] = useState(7);
  const [notes, setNotes] = useState(action.t.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const copy: Record<Action["kind"], { title: string; confirm: string; danger?: boolean }> = {
    activate: { title: `تفعيل اشتراك «${action.t.name}»`, confirm: "تفعيل الاشتراك" },
    extend: { title: `تمديد تجربة «${action.t.name}»`, confirm: "تمديد التجربة" },
    suspend: { title: `إيقاف «${action.t.name}»`, confirm: "إيقاف المؤسسة", danger: true },
    unsuspend: { title: `إلغاء إيقاف «${action.t.name}»`, confirm: "إلغاء الإيقاف" },
    note: { title: `ملاحظات «${action.t.name}»`, confirm: "حفظ الملاحظات" },
  };
  const c = copy[action.kind];

  async function confirm() {
    setBusy(true);
    setError("");
    const body =
      action.kind === "activate" ? { action: "activate", months }
      : action.kind === "extend" ? { action: "extendTrial", days }
      : action.kind === "note" ? { action: "note", notes }
      : { action: action.kind };
    try {
      await patch(`/platform/tenants/${action.t._id}`, body, auth(token));
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذّر الحفظ");
      setBusy(false);
    }
  }

  return (
    <div className="sa-dialog-backdrop" onClick={onClose}>
      <div className="sa-dialog" role="dialog" aria-modal="true" aria-label={c.title} onClick={(e) => e.stopPropagation()}>
        <h3>{c.title}</h3>
        {action.kind === "activate" && (
          <label className="sa-dialog-field">
            مدة الاشتراك
            <select className="form-input" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              <option value={1}>شهر واحد</option>
              <option value={3}>٣ أشهر</option>
              <option value={6}>٦ أشهر</option>
              <option value={12}>سنة</option>
              <option value={0}>بدون تاريخ انتهاء</option>
            </select>
            <small>يُضاف إلى الاشتراك الحالي إن كان سارياً.</small>
          </label>
        )}
        {action.kind === "extend" && (
          <label className="sa-dialog-field">
            عدد الأيام الإضافية
            <select className="form-input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{toAr(d)} {d <= 10 ? "أيام" : "يوماً"}</option>)}
            </select>
            <small>تُحسب من نهاية التجربة الحالية، أو من اليوم إن كانت قد انتهت.</small>
          </label>
        )}
        {action.kind === "suspend" && <p>سيُمنع جميع مستخدمي المؤسسة من الوصول إلى البيانات فوراً، وتبقى البيانات محفوظة.</p>}
        {action.kind === "unsuspend" && <p>تعود المؤسسة إلى حالتها السابقة (اشتراك أو تجربة) إن كانت لا تزال سارية.</p>}
        {action.kind === "note" && (
          <textarea className="form-input sa-notes" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات داخلية لفريق المبيعات — لا يراها العميل" />
        )}
        {error && <div className="login-server-error" role="alert">{error}</div>}
        <div className="sa-dialog-actions">
          <button className="sa-btn ghost" onClick={onClose} disabled={busy}>إلغاء</button>
          <button className={`sa-btn ${c.danger ? "danger" : "primary"}`} onClick={confirm} disabled={busy}>
            {busy ? <i className="ti ti-loader-2 lp-spin" /> : null} {c.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Console ────────────────────────────────────────────────────────────── */

function SuperConsole({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [admin, setAdmin] = useState<{ name: string } | null>(null);
  const [rows, setRows] = useState<TenantRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [action, setAction] = useState<Action | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const [me, data] = await Promise.all([
        get<{ admin: { name: string } }>("/platform/me", auth(token)),
        get<{ tenants: TenantRow[]; summary: Summary }>("/platform/tenants", auth(token)),
      ]);
      setAdmin(me.admin);
      setRows(data.tenants);
      setSummary(data.summary);
      setLoadError("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLogout();
      else setLoadError(err instanceof ApiError ? err.message : "تعذّر تحميل البيانات");
    }
  }, [token, onLogout]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((t) =>
      (filter === "all" || stateOf(t) === filter) &&
      (!needle || [t.name, t.slug, t.ownerName, t.email, t.phone, t.city ?? "", t.country].some((v) => v.toLowerCase().includes(needle))),
    );
  }, [rows, q, filter]);

  const tiles: { label: string; value?: number; icon: string; tone: string; f?: Filter }[] = [
    { label: "إجمالي المؤسسات", value: summary?.total, icon: "ti-building-community", tone: "green", f: "all" },
    { label: "في التجربة", value: summary?.trial, icon: "ti-hourglass-high", tone: "gold", f: "trial" },
    { label: "مشتركة", value: summary?.active, icon: "ti-rosette-discount-check", tone: "green", f: "active" },
    { label: "انتهت صلاحيتها", value: summary?.expired, icon: "ti-hourglass-off", tone: "red", f: "expired" },
    { label: "موقوفة", value: summary?.suspended, icon: "ti-ban", tone: "gray", f: "suspended" },
    { label: "إجمالي الطلاب", value: summary?.students, icon: "ti-users", tone: "blue" },
    { label: "جديدة هذا الأسبوع", value: summary?.newThisWeek, icon: "ti-sparkles", tone: "gold" },
  ];

  return (
    <div className="sa-page">
      <header className="sa-topbar">
        <a className="saas-brand" href="/"><img src={PLATFORM_LOGO} alt="" width={34} height={34} /><span>{PLATFORM_NAME}</span></a>
        <span className="sa-chip"><i className="ti ti-crown" /> مالك المنصة</span>
        <div style={{ flex: 1 }} />
        {admin && <span className="sa-admin-name">{admin.name}</span>}
        <button className="login-theme-btn" onClick={toggleTheme} aria-label="تبديل المظهر">
          <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
        </button>
        <button className="sa-btn ghost sm" onClick={onLogout}><i className="ti ti-logout" /> خروج</button>
      </header>

      <main className="sa-main">
        <div className="sa-title">
          <h1>المؤسسات المشتركة</h1>
          <button className="sa-btn ghost sm" onClick={() => void load()}><i className="ti ti-refresh" /> تحديث</button>
        </div>

        <div className="sa-tiles">
          {tiles.map((t) => (
            <button
              key={t.label}
              className={`sa-tile ${t.tone} ${t.f && filter === t.f ? "on" : ""}`}
              onClick={() => t.f && setFilter(t.f)}
              disabled={!t.f}
            >
              <i className={`ti ${t.icon}`} />
              <b>{t.value === undefined ? "…" : toAr(t.value)}</b>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="sa-toolbar">
          <div className="sa-search">
            <i className="ti ti-search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الرابط أو المالك أو الجوال…" />
          </div>
          <select className="form-input" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="تصفية حسب الحالة">
            {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {loadError && <div className="login-server-error" role="alert">{loadError}</div>}

        {rows === null ? (
          <div className="sa-empty"><i className="ti ti-loader-2 lp-spin" /> جارٍ التحميل…</div>
        ) : visible.length === 0 ? (
          <div className="sa-empty"><i className="ti ti-building-off" /> لا توجد مؤسسات مطابقة</div>
        ) : (
          <div className="sa-list">
            {visible.map((t) => {
              const s = stateOf(t);
              return (
                <article key={t._id} className={`sa-row ${s}`}>
                  <div className="sa-org">
                    <div className="sa-avatar">{t.name.trim()[0]}</div>
                    <div>
                      <h2>{t.name}</h2>
                      <a href={`/${t.slug}`} target="_blank" rel="noreferrer" dir="ltr">{PUBLIC_DOMAIN}/{t.slug}</a>
                      <span className="sa-muted">{ORG_TYPE_LABEL[t.orgType]} · {[t.city, t.country].filter(Boolean).join("، ")}</span>
                    </div>
                  </div>

                  <div className="sa-owner">
                    <b>{t.ownerName}</b>
                    <span dir="ltr">{t.email}</span>
                    <a
                      className="sa-wa"
                      href={waLink(t.phone, `السلام عليكم ${t.ownerName}، معك فريق ${PLATFORM_NAME} بخصوص حساب ${t.name}`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="ti ti-brand-whatsapp" /> <span dir="ltr">{t.phone}</span>
                    </a>
                  </div>

                  <div className="sa-state">
                    <StatusBadge t={t} />
                    <span className="sa-muted">سجّل {fmtDate(t.createdAt)}</span>
                    {t.notes && <span className="sa-note" title={t.notes}><i className="ti ti-note" /> {t.notes}</span>}
                  </div>

                  <div className="sa-usage">
                    <div><b>{toAr(t.students)}</b><span>طالب</span></div>
                    <div><b>{toAr(t.users)}</b><span>مستخدم</span></div>
                    {t.expectedStudents ? <div><b>{toAr(t.expectedStudents)}</b><span>متوقع</span></div> : null}
                  </div>

                  <div className="sa-actions">
                    <button className="sa-btn primary sm" onClick={() => setAction({ kind: "activate", t })}><i className="ti ti-rosette-discount-check" /> تفعيل</button>
                    {t.status !== "active" && (
                      <button className="sa-btn ghost sm" onClick={() => setAction({ kind: "extend", t })}><i className="ti ti-clock-plus" /> تمديد</button>
                    )}
                    {t.status === "suspended" ? (
                      <button className="sa-btn ghost sm" onClick={() => setAction({ kind: "unsuspend", t })}><i className="ti ti-player-play" /> إلغاء الإيقاف</button>
                    ) : (
                      <button className="sa-btn ghost sm danger-text" onClick={() => setAction({ kind: "suspend", t })}><i className="ti ti-ban" /> إيقاف</button>
                    )}
                    <button className="sa-btn ghost sm icon" onClick={() => setAction({ kind: "note", t })} aria-label="ملاحظات" title="ملاحظات"><i className="ti ti-notes" /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {action && (
        <ActionDialog
          action={action}
          token={token}
          onClose={() => setAction(null)}
          onDone={() => { setAction(null); void load(); }}
        />
      )}
    </div>
  );
}

export function SuperAdmin() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setToken(readToken()); setReady(true); }, []);
  const logout = useCallback(() => { writeToken(null); setToken(null); }, []);
  if (!ready) return null;
  return token ? <SuperConsole token={token} onLogout={logout} /> : <SuperLogin onToken={setToken} />;
}
