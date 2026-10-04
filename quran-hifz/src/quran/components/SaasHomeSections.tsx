import { useEffect, useRef, useState } from "react";
import { toAr } from "../../lib/format";
import { BLOG_POSTS } from "../data/blog";
import { APP_STORE_URL, PLATFORM_LOGO, PLATFORM_NAME, PLAY_STORE_URL, TRIAL_DAYS } from "../config/saas";

/* ── Stats band ─────────────────────────────────────────────────────────── */

/** Facts about the platform itself — not customer counts we can't vouch for. */
const STATS = [
  { num: 5,          label: "بوابات: الإدارة والمشرف والمعلم والطالب وولي الأمر", icon: "ti-layout-grid" },
  { num: 114,        label: "سورة مفهرسة بالآيات لبناء خطط الحفظ",                icon: "ti-book" },
  { num: 30,         label: "جزءاً تُتابَع لكل طالب جزءاً جزءاً",                  icon: "ti-bookmarks" },
  { num: TRIAL_DAYS, label: "أيام تجربة مجانية بكل المزايا",                      icon: "ti-gift" },
];

function useCountUp(target: number, active: boolean): number {
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let start: number | null = null;
    const step = (ts: number) => {
      start ??= ts;
      const p = Math.min((ts - start) / 1600, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [active, target]);
  return val;
}

function StatCard({ num, label, icon }: (typeof STATS)[number]) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const count = useCountUp(num, active);
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true); }, { threshold: 0.4 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className="lnd-stat lnd-reveal">
      <div className="lnd-stat-icon-wrap"><i className={`ti ${icon}`} /></div>
      <div className="lnd-stat-value">{toAr(count)}</div>
      <div className="lnd-stat-label">{label}</div>
    </div>
  );
}

export function StatsBand() {
  return (
    <section className="lnd-stats-section">
      <div className="lnd-stats-inner">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>
    </section>
  );
}

/* ── Reports & charts showcase ──────────────────────────────────────────── */

const REPORT_FEATURES = [
  { icon: "ti-chart-donut",      title: "توزيع الحضور والحفظ",      desc: "نسب الحاضرين والمستأذنين والغائبين، وتوزيع الطلاب على شرائح الإنجاز." },
  { icon: "ti-chart-bar",        title: "ترتيب الحلقات والمعلمين",   desc: "مقارنة الحلقات بمتوسط الحضور والتقييم، وعبء كل معلم." },
  { icon: "ti-alert-triangle",   title: "تنبيهات الطلاب المتعثرين",  desc: "قائمة متابعة لمن تجاوز غيابه الحد أو تراجع تقييمه، قبل أن ينقطع." },
  { icon: "ti-chart-radar",      title: "ملف كل طالب",              desc: "مخطط مهاري (حفظ، تجويد، تلاوة، حضور)، ومنحنى التقدم، والأجزاء المنجزة." },
  { icon: "ti-file-spreadsheet", title: "تصدير بنقرة",               desc: "كل تقرير قابل للتصدير CSV لمجلس الإدارة أو الجهات المانحة." },
];

// Illustrative numbers for the preview only — labelled as such in the UI.
const DEMO_ATTENDANCE = [
  { label: "حاضر",   value: 86, color: "var(--green2)" },
  { label: "مستأذن", value: 8,  color: "var(--gold)" },
  { label: "غائب",   value: 6,  color: "#c0392b" },
];
const DEMO_HALQAT = [
  { name: "حلقة النور",   value: 94 },
  { name: "حلقة الفرقان", value: 88 },
  { name: "حلقة الهدى",   value: 81 },
  { name: "حلقة البيان",  value: 73 },
];
const DEMO_TREND = [6.8, 7.1, 7.0, 7.6, 7.9, 8.1, 8.4];

function DemoDonut() {
  const r = 38;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="rp-donut">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
        {DEMO_ATTENDANCE.map((s) => {
          const len = (s.value / 100) * c;
          const el = (
            <circle
              key={s.label} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="12"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="rp-donut-center"><b>{toAr(DEMO_ATTENDANCE[0].value)}٪</b><span>حضور</span></div>
      <ul className="rp-legend">
        {DEMO_ATTENDANCE.map((s) => (
          <li key={s.label}><i style={{ background: s.color }} />{s.label} <b>{toAr(s.value)}٪</b></li>
        ))}
      </ul>
    </div>
  );
}

function DemoTrend() {
  const w = 220, h = 70, min = 6, max = 9;
  const pts = DEMO_TREND.map((v, i) => [(i / (DEMO_TREND.length - 1)) * w, h - ((v - min) / (max - min)) * h] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg className="rp-trend" viewBox={`0 -6 ${w} ${h + 12}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,${h} ${line} ${w},${h}`} fill="var(--green-pale)" />
      <polyline points={line} fill="none" stroke="var(--green2)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5} fill="var(--green2)" />)}
    </svg>
  );
}

export function ReportsShowcase() {
  return (
    <section className="saas-section saas-reports" id="reports">
      <div className="saas-split">
        <div className="saas-split-text lnd-reveal">
          <span className="lnd-eyebrow">التقارير والتحليلات</span>
          <h2>بياناتك تتحول إلى قرارات</h2>
          <p className="saas-split-lead">
            كل حضور يُسجَّل وكل تقييم يُدخَل يظهر فوراً في لوحات تحليلية جاهزة — دون جداول يدوية ولا انتظار نهاية الشهر.
          </p>
          <ul className="saas-feature-list">
            {REPORT_FEATURES.map((f) => (
              <li key={f.title}>
                <span className="saas-feature-icon"><i className={`ti ${f.icon}`} /></span>
                <div><b>{f.title}</b><p>{f.desc}</p></div>
              </li>
            ))}
          </ul>
        </div>

        <figure className="rp-preview lnd-reveal" aria-label="معاينة توضيحية للوحة التقارير">
          <div className="rp-preview-bar">
            <span className="rp-dot" /><span className="rp-dot" /><span className="rp-dot" />
            <span className="rp-preview-title"><i className="ti ti-chart-bar" /> لوحة التقارير</span>
            <span className="rp-demo-tag">بيانات توضيحية</span>
          </div>
          <div className="rp-kpis">
            <div><span>متوسط الحضور</span><b>{toAr(91)}٪</b><em className="up">▲ {toAr(4)}٪</em></div>
            <div><span>متوسط التقييم</span><b>{toAr("8.4")}<small>/{toAr(10)}</small></b><em className="up">▲ {toAr("0.3")}</em></div>
            <div><span>أجزاء منجزة</span><b>{toAr(37)}</b><em>هذا الفصل</em></div>
          </div>
          <div className="rp-grid">
            <div className="rp-panel">
              <h4>توزيع الحضور</h4>
              <DemoDonut />
            </div>
            <div className="rp-panel">
              <h4>ترتيب الحلقات بالحضور</h4>
              <ul className="rp-bars">
                {DEMO_HALQAT.map((h) => (
                  <li key={h.name}>
                    <span>{h.name}</span>
                    <div className="rp-bar"><i style={{ width: `${h.value}%` }} /></div>
                    <b>{toAr(h.value)}٪</b>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rp-panel rp-panel-wide">
              <h4>متوسط التقييم الأسبوعي</h4>
              <DemoTrend />
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}

/* ── Mobile app download ────────────────────────────────────────────────── */

const APP_FEATURES = [
  { icon: "ti-bell-ringing",   text: "إشعار فوري لولي الأمر عند الغياب" },
  { icon: "ti-checklist",      text: "تسجيل الحضور والتقييم من الجوال داخل الحلقة" },
  { icon: "ti-fingerprint",    text: "دخول آمن بالبصمة أو بصمة الوجه" },
  { icon: "ti-moon-stars",     text: "واجهة عربية بالكامل مع وضع ليلي" },
];

function StoreBadge({ href, store }: { href: string; store: "apple" | "google" }) {
  const isApple = store === "apple";
  const content = (
    <>
      <i className={`ti ${isApple ? "ti-brand-apple" : "ti-brand-google-play"}`} />
      <span className="store-badge-text" dir="ltr">
        <small>{href ? (isApple ? "Download on the" : "GET IT ON") : "قريباً على"}</small>
        <b>{isApple ? "App Store" : "Google Play"}</b>
      </span>
    </>
  );
  return href ? (
    <a className="store-badge" href={href} target="_blank" rel="noreferrer">{content}</a>
  ) : (
    <span className="store-badge is-soon" aria-disabled="true">{content}</span>
  );
}

export function AppDownload() {
  return (
    <section className="saas-app" id="mobile-app">
      <div className="saas-split saas-app-inner">
        <div className="saas-split-text lnd-reveal">
          <span className="lnd-eyebrow saas-eyebrow-light">تطبيق الجوال</span>
          <h2>{PLATFORM_NAME} في جيبك</h2>
          <p className="saas-split-lead">
            تطبيق للمعلم والطالب وولي الأمر على أجهزة آيفون وأندرويد، متصل بالبيانات نفسها لحظة بلحظة.
          </p>
          <ul className="saas-app-list">
            {APP_FEATURES.map((f) => <li key={f.text}><i className={`ti ${f.icon}`} />{f.text}</li>)}
          </ul>
          <div className="store-badges">
            <StoreBadge store="apple" href={APP_STORE_URL} />
            <StoreBadge store="google" href={PLAY_STORE_URL} />
          </div>
        </div>

        <div className="phone lnd-reveal" aria-hidden="true">
          <div className="phone-notch" />
          <div className="phone-screen">
            <div className="phone-head">
              <img src={PLATFORM_LOGO} alt="" />
              <div><b>السلام عليكم</b><span>خطة اليوم جاهزة</span></div>
            </div>
            <img className="phone-art" src="/quran/onboarding/2.png" alt="" />
            <div className="phone-card">
              <span>ورد اليوم — حفظ</span>
              <b>سورة الملك ١ – ١٥</b>
              <div className="rp-bar"><i style={{ width: "62%" }} /></div>
            </div>
            <div className="phone-row">
              <div><i className="ti ti-calendar-check" /><b>{toAr(96)}٪</b><span>الحضور</span></div>
              <div><i className="ti ti-star" /><b>{toAr("9.2")}</b><span>التقييم</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Latest blog posts ──────────────────────────────────────────────────── */

export function LatestPosts() {
  const posts = BLOG_POSTS.slice(0, 3);
  return (
    <section className="saas-section" id="blog">
      <div className="lnd-section-head lnd-reveal">
        <span className="lnd-eyebrow">من المدونة</span>
        <h2 className="lnd-section-title">مقالات تساعدك في إدارة حلقاتك</h2>
      </div>
      <div className="saas-posts">
        {posts.map((p) => (
          <a key={p.slug} className="saas-post lnd-reveal" href={`/blog/${p.slug}`}>
            <div className="saas-post-cover">
              <img src={p.cover.src} alt={p.cover.alt} title={p.cover.title} width={p.cover.width} height={p.cover.height} loading="lazy" decoding="async" />
            </div>
            <div className="saas-post-body">
              <span className="blog-tag">{p.tag}</span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <span className="blog-more">اقرأ المقال <i className="ti ti-arrow-left" /></span>
            </div>
          </a>
        ))}
      </div>
      <div className="saas-posts-all">
        <a className="saas-btn saas-btn-ghost" href="/blog">كل المقالات <i className="ti ti-arrow-left" /></a>
      </div>
    </section>
  );
}
