import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";

const LOGO_SRC = "/quran/logo.png";
const IMG_HERO    = "https://images.unsplash.com/photo-1609743522653-52354461eb27?w=1600&q=80&auto=format";
const IMG_STUDY   = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=900&q=80&auto=format";
const IMG_QURAN   = "https://images.unsplash.com/photo-1585036156171-384164a8c675?w=900&q=80&auto=format";

const PORTALS = [
  {
    icon: "ti-book-2",
    title: "بوابة الطالب",
    color: "#1a5c2a",
    features: ["خطة الحفظ الشخصية","سجل الحضور والغياب","الواجبات والمراجعة","جدول الحلقة","نقاطي ومتجر المكافآت","الرسائل مع المعلم"],
  },
  {
    icon: "ti-chalkboard",
    title: "بوابة المعلم",
    color: "#2d7a3f",
    features: ["إدارة حلقاتي وطلابي","تسجيل الحضور اليومي","تسجيل دروس الحلقة","واجبات الحلقة والتقييم","الخطط الفردية للطلاب","تقارير الأداء"],
  },
  {
    icon: "ti-layout-dashboard",
    title: "بوابة الإدارة",
    color: "#c9952a",
    features: ["لوحة تحكم شاملة","إدارة الطلاب والمعلمين","إدارة الحلقات والمساجد","مسارات استثنائية","مؤشرات الأداء (KPIs)","تقارير وإحصائيات"],
  },
  {
    icon: "ti-user-heart",
    title: "بوابة ولي الأمر",
    color: "#1a5c2a",
    features: ["مسيرة الحفظ لابني","الدروس المسجّلة","متابعة الواجبات","سجل الحضور","الرسائل مع المعلم"],
  },
];

const STATS = [
  { num: 200, label: "طالب مسجّل",   icon: "ti-users" },
  { num: 15,  label: "حلقة نشطة",    icon: "ti-school" },
  { num: 12,  label: "معلم متخصص",   icon: "ti-chalkboard" },
  { num: 5,   label: "مسجد شريك",    icon: "ti-building-arch" },
];

const MASARAT = [
  { name: "حفظ كامل",     desc: "ختم القرآن الكريم كاملاً ٣٠ جزءاً",       color: "#c9952a", icon: "ti-star" },
  { name: "عشرون جزءاً", desc: "حفظ الجزء الأول حتى العشرين",              color: "#1a5c2a", icon: "ti-bookmark" },
  { name: "عشرة أجزاء",  desc: "المبتدئون الساعون لحفظ عشرة أجزاء",        color: "#2d7a3f", icon: "ti-book" },
  { name: "خمسة أجزاء",  desc: "مسار المبتدئين وصغار السن",                color: "#3d9952", icon: "ti-seedling" },
];

const HOW_IT_WORKS = [
  { step: "١", title: "تسجيل الطالب",     desc: "يسجّل المدير الطالب ويحدد المسار المناسب بناءً على مستواه", icon: "ti-user-plus" },
  { step: "٢", title: "ربط الحلقة",       desc: "يُعيَّن الطالب في حلقته ومسجده ويرتبط بمعلمه", icon: "ti-link" },
  { step: "٣", title: "المتابعة اليومية", desc: "يسجّل المعلم الحضور والواجبات، ويتابع ولي الأمر من بوابته", icon: "ti-calendar-check" },
  { step: "٤", title: "التقييم والتقدم",  desc: "نقاط تحفيزية وتقارير دورية تُظهر تقدم كل طالب", icon: "ti-trophy" },
];

const TESTIMONIALS = [
  {
    name: "أحمد عبدالله السهلي",
    role: "ولي أمر طالب",
    icon: "ti-user-circle",
    quote: "المنصة غيّرت طريقة متابعتي لابني. أرى تقدمه يومياً من جوالي دون الحاجة للتواصل المستمر مع المعلم.",
  },
  {
    name: "الشيخ نصر محمد",
    role: "معلم قرآن — حلقة النور",
    icon: "ti-chalkboard",
    quote: "وفّرت عليّ ساعات في تسجيل الحضور وإعداد التقارير. أنصح بها كل معلم يريد التركيز على التعليم.",
  },
  {
    name: "عبدالله خالد",
    role: "طالب — مسار حفظ كامل",
    icon: "ti-book-2",
    quote: "نقاط المكافآت حفّزتني على الاجتهاد يوماً بعد يوم. وصلت للجزء العشرين بفضل الله ثم بهذا النظام!",
  },
];

function useScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".lnd-reveal, .lnd-reveal-left, .lnd-reveal-right")
        .forEach((el) => el.classList.add("lnd-revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("lnd-revealed"); }),
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    );
    document.querySelectorAll(".lnd-reveal, .lnd-reveal-left, .lnd-reveal-right")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useCountUp(target: number, active: boolean) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const duration = 1800;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target]);
  return val;
}

function StatCard({ num, label, icon }: { num: number; label: string; icon: string }) {
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
      <div className="lnd-stat-value">+{count}</div>
      <div className="lnd-stat-label">{label}</div>
    </div>
  );
}

export function LandingPage({ onLogin }: { onLogin: () => void }) {
  const { theme, toggleTheme } = useTheme();
  useScrollReveal();

  return (
    <div className="lnd">

      {/* ── HEADER ── */}
      <header className="lnd-header">
        <div className="lnd-header-inner">
          <div className="lnd-brand">
            <img src={LOGO_SRC} alt="شعار الجمعية" className="lnd-logo" />
            <div className="lnd-brand-text">
              <span className="lnd-brand-main">الجمعية الخيرية لتحفيظ القرآن الكريم</span>
              <span className="lnd-brand-sub">بالعماير</span>
            </div>
          </div>
          <div className="lnd-header-actions">
            <button className="lnd-theme-btn" onClick={toggleTheme} aria-label="تبديل المظهر">
              <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
            </button>
            <button className="lnd-login-btn" onClick={onLogin}>
              <i className="ti ti-login-2" />
              تسجيل الدخول
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lnd-hero">
        <div className="lnd-hero-bg" aria-hidden="true">
          <img src={IMG_HERO} alt="" className="lnd-hero-img" loading="eager" />
          <div className="lnd-hero-overlay" />
        </div>
        <div className="lnd-orb lnd-orb-1" aria-hidden="true" />
        <div className="lnd-orb lnd-orb-2" aria-hidden="true" />
        <div className="lnd-hero-inner">
          <div className="lnd-hero-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <h1 className="lnd-hero-title">
            منصة متكاملة لإدارة
            <br />
            <span className="lnd-hero-accent">حلقات تحفيظ القرآن</span>
          </h1>
          <p className="lnd-hero-sub">
            تجمع الطلاب والمعلمين وأولياء الأمور والإدارة<br />
            في منظومة رقمية واحدة لخدمة كتاب الله
          </p>
          <div className="lnd-hero-actions">
            <button className="lnd-cta-primary" onClick={onLogin}>
              ابدأ الآن
              <i className="ti ti-arrow-left" />
            </button>
            <button
              className="lnd-cta-ghost"
              onClick={() => document.getElementById("lnd-portals")?.scrollIntoView({ behavior: "smooth" })}
            >
              اعرف أكثر
              <i className="ti ti-chevron-down" />
            </button>
          </div>
        </div>
        <div className="lnd-scroll-indicator" aria-hidden="true">
          <div className="lnd-scroll-mouse">
            <div className="lnd-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lnd-stats-section">
        <div className="lnd-stats-inner">
          {STATS.map((s) => (
            <StatCard key={s.label} num={s.num} label={s.label} icon={s.icon} />
          ))}
        </div>
      </section>

      {/* ── FEATURE ROW 1 ── */}
      <section className="lnd-feature-section">
        <div className="lnd-feature-wrap">
          <div className="lnd-feature-row">
            <div className="lnd-feature-img-col lnd-reveal-right">
              <img src={IMG_STUDY} alt="طلاب يتعلمون القرآن" className="lnd-feature-img" loading="lazy" />
              <div className="lnd-feature-badge">
                <i className="ti ti-trending-up" />
                متابعة يومية
              </div>
            </div>
            <div className="lnd-feature-text lnd-reveal-left">
              <span className="lnd-eyebrow">للطالب وولي الأمر</span>
              <h2 className="lnd-feature-title">تابع رحلة حفظك<br />خطوة بخطوة</h2>
              <p className="lnd-feature-desc">
                من أول حزب تحفظه حتى ختم القرآن، المنصة ترصد كل خطوة في مسيرتك.
                يرى ولي الأمر تقدم ابنه فور تسجيل المعلم.
              </p>
              <ul className="lnd-feature-points">
                <li><i className="ti ti-check" /> خطة حفظ شخصية تناسب مستواك</li>
                <li><i className="ti ti-check" /> إشعارات الواجبات والمراجعة</li>
                <li><i className="ti ti-check" /> نقاط تحفيزية ومتجر مكافآت</li>
                <li><i className="ti ti-check" /> التواصل مع المعلم مباشرة</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE ROW 2 ── */}
      <section className="lnd-feature-section lnd-feature-alt">
        <div className="lnd-feature-wrap">
          <div className="lnd-feature-row lnd-feature-row-rev">
            <div className="lnd-feature-img-col lnd-reveal-left">
              <img src={IMG_QURAN} alt="القرآن الكريم" className="lnd-feature-img" loading="lazy" />
              <div className="lnd-feature-badge lnd-feature-badge-gold">
                <i className="ti ti-report-analytics" />
                تقارير فورية
              </div>
            </div>
            <div className="lnd-feature-text lnd-reveal-right">
              <span className="lnd-eyebrow">للمعلم والإدارة</span>
              <h2 className="lnd-feature-title">إدارة ذكية<br />توفّر وقتك</h2>
              <p className="lnd-feature-desc">
                سجّل الحضور، أضف الواجبات، وأصدر التقارير بنقرات قليلة.
                المدير يرى كل شيء من لوحة تحكم واحدة شاملة.
              </p>
              <ul className="lnd-feature-points">
                <li><i className="ti ti-check" /> تسجيل الحضور بكبسة واحدة</li>
                <li><i className="ti ti-check" /> تقارير أداء تلقائية</li>
                <li><i className="ti ti-check" /> مؤشرات KPI لكل حلقة</li>
                <li><i className="ti ti-check" /> إدارة عدة مساجد من مكان واحد</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTALS ── */}
      <section id="lnd-portals" className="lnd-portals-section">
        <div className="lnd-inner">
          <div className="lnd-section-head lnd-reveal">
            <span className="lnd-eyebrow">بوابات المنصة</span>
            <h2 className="lnd-section-title">كل مستخدم يجد ما يحتاجه</h2>
            <p className="lnd-section-sub">أربع بوابات متخصصة، كل منها مصممة خصيصاً لاحتياجات مستخدمها</p>
          </div>
          <div className="lnd-cards lnd-reveal-stagger">
            {PORTALS.map((p) => (
              <div key={p.title} className="lnd-card lnd-reveal" onClick={onLogin}>
                <div className="lnd-card-icon" style={{ color: p.color }}>
                  <i className={`ti ${p.icon}`} />
                </div>
                <h3 className="lnd-card-title">{p.title}</h3>
                <ul className="lnd-card-features">
                  {p.features.map((f) => (
                    <li key={f}><i className="ti ti-check" />{f}</li>
                  ))}
                </ul>
                <div className="lnd-card-cta" style={{ color: p.color }}>
                  دخول البوابة <i className="ti ti-arrow-left" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACKS ── */}
      <section className="lnd-tracks-section">
        <div className="lnd-inner">
          <div className="lnd-section-head lnd-reveal">
            <span className="lnd-eyebrow">مسارات الحفظ</span>
            <h2 className="lnd-section-title">المسار المناسب لكل طالب</h2>
            <p className="lnd-section-sub">يُحدَّد مسار الطالب تلقائياً بناءً على مستواه وهدفه</p>
          </div>
          <div className="lnd-tracks lnd-reveal-stagger">
            {MASARAT.map((m) => (
              <div key={m.name} className="lnd-track lnd-reveal">
                <div className="lnd-track-icon" style={{ background: `${m.color}18`, color: m.color }}>
                  <i className={`ti ${m.icon}`} />
                </div>
                <div className="lnd-track-name" style={{ color: m.color }}>{m.name}</div>
                <div className="lnd-track-desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lnd-how-section">
        <div className="lnd-inner">
          <div className="lnd-section-head lnd-reveal">
            <span className="lnd-eyebrow">كيف تعمل المنصة</span>
            <h2 className="lnd-section-title">أربع خطوات للبداية</h2>
            <p className="lnd-section-sub">من التسجيل إلى التقدم في كتاب الله</p>
          </div>
          <div className="lnd-steps lnd-reveal-stagger">
            {HOW_IT_WORKS.map((h, i) => (
              <div key={h.step} className="lnd-step lnd-reveal">
                <div className="lnd-step-top">
                  <div className="lnd-step-num">{h.step}</div>
                  {i < HOW_IT_WORKS.length - 1 && <div className="lnd-step-line" aria-hidden="true" />}
                </div>
                <div className="lnd-step-icon"><i className={`ti ${h.icon}`} /></div>
                <h4 className="lnd-step-title">{h.title}</h4>
                <p className="lnd-step-desc">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="lnd-testimonials-section">
        <div className="lnd-inner">
          <div className="lnd-section-head lnd-reveal">
            <span className="lnd-eyebrow">آراء المستخدمين</span>
            <h2 className="lnd-section-title">ماذا يقولون عن المنصة؟</h2>
          </div>
          <div className="lnd-testimonials lnd-reveal-stagger">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="lnd-testimonial lnd-reveal">
                <div className="lnd-testimonial-stars">
                  {[...Array(5)].map((_, i) => <i key={i} className="ti ti-star-filled" />)}
                </div>
                <p className="lnd-testimonial-quote">"{t.quote}"</p>
                <div className="lnd-testimonial-author">
                  <div className="lnd-testimonial-avatar">
                    <i className={`ti ${t.icon}`} />
                  </div>
                  <div>
                    <div className="lnd-testimonial-name">{t.name}</div>
                    <div className="lnd-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="lnd-cta-banner">
        <div className="lnd-cta-inner lnd-reveal">
          <div className="lnd-cta-ayah">﴿ وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ ﴾</div>
          <h2 className="lnd-cta-title">انضم إلى منصة التحفيظ اليوم</h2>
          <p className="lnd-cta-sub">سجّل دخولك واستمتع بتجربة إدارة متكاملة لحلقة تحفيظ القرآن</p>
          <button className="lnd-cta-primary lnd-cta-gold" onClick={onLogin}>
            ابدأ الآن
            <i className="ti ti-login-2" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lnd-footer">
        <div className="lnd-footer-inner">
          <img src={LOGO_SRC} alt="شعار" className="lnd-footer-logo" />
          <div>
            <div className="lnd-footer-name">الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير</div>
            <div className="lnd-footer-copy">منصة تحفيظ القرآن الكريم • جميع الحقوق محفوظة</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
