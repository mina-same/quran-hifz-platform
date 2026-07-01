import { useTheme } from "../context/ThemeContext";

const LOGO_SRC = "/quran/logo.png";

const PORTALS = [
  {
    icon: "ti-book-2",
    title: "بوابة الطالب",
    color: "#1a5c2a",
    features: [
      "خطة الحفظ الشخصية",
      "سجل الحضور والغياب",
      "الواجبات والمراجعة",
      "جدول الحلقة",
      "نقاطي ومتجر المكافآت",
      "الرسائل مع المعلم",
    ],
  },
  {
    icon: "ti-chalkboard",
    title: "بوابة المعلم",
    color: "#2d7a3f",
    features: [
      "إدارة حلقاتي وطلابي",
      "تسجيل الحضور اليومي",
      "تسجيل دروس الحلقة",
      "واجبات الحلقة والتقييم",
      "الخطط الفردية للطلاب",
      "تقارير الأداء",
    ],
  },
  {
    icon: "ti-layout-dashboard",
    title: "بوابة الإدارة",
    color: "#c9952a",
    features: [
      "لوحة تحكم شاملة",
      "إدارة الطلاب والمعلمين",
      "إدارة الحلقات والمساجد",
      "مسارات استثنائية",
      "مؤشرات الأداء (KPIs)",
      "تقارير وإحصائيات",
    ],
  },
  {
    icon: "ti-user-heart",
    title: "بوابة ولي الأمر",
    color: "#1a5c2a",
    features: [
      "مسيرة الحفظ لابني",
      "الدروس المسجّلة",
      "متابعة الواجبات",
      "سجل الحضور",
      "الرسائل مع المعلم",
    ],
  },
];

const STATS = [
  { value: "+٢٠٠", label: "طالب مسجّل",   icon: "ti-users" },
  { value: "+١٥",  label: "حلقة نشطة",    icon: "ti-school" },
  { value: "+١٢",  label: "معلم متخصص",   icon: "ti-chalkboard" },
  { value: "+٥",   label: "مسجد شريك",    icon: "ti-building-arch" },
];

const HOW_IT_WORKS = [
  { step: "١", title: "تسجيل الطالب",  desc: "يسجّل المدير الطالب في النظام ويحدد المسار المناسب له تلقائياً بناءً على مستوى قراءته" },
  { step: "٢", title: "ربط الحلقة",   desc: "يُعيَّن الطالب في حلقته ومسجده ويرتبط بمعلمه ليبدأ رحلة الحفظ" },
  { step: "٣", title: "المتابعة اليومية", desc: "يسجّل المعلم الحضور والواجبات والدروس، ويتابع ولي الأمر كل شيء من بوابته" },
  { step: "٤", title: "التقييم والتقدم", desc: "نقاط تحفيزية، تقارير دورية، ومؤشرات أداء تُظهر تقدم كل طالب في حفظ كتاب الله" },
];

const MASARAT = [
  { name: "حفظ كامل",     desc: "ختم القرآن الكريم كاملاً ٣٠ جزءاً",          color: "#c9952a" },
  { name: "عشرون جزءاً", desc: "حفظ الجزء الأول حتى العشرين",               color: "#1a5c2a" },
  { name: "عشرة أجزاء",  desc: "المبتدئون والذين يسعون لحفظ عشرة أجزاء",    color: "#2d7a3f" },
  { name: "خمسة أجزاء",  desc: "مسار المبتدئين وصغار السن",                  color: "#3d9952" },
];

export function LandingPage({ onLogin }: { onLogin: () => void }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="lnd">
      {/* ── Header ── */}
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

      {/* ── Hero ── */}
      <section className="lnd-hero">
        <div className="lnd-hero-inner">
          <div className="lnd-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <h1 className="lnd-hero-title">
            منصة متكاملة لإدارة<br />حلقات تحفيظ القرآن
          </h1>
          <p className="lnd-hero-sub">
            تجمع الطلاب والمعلمين وأولياء الأمور والإدارة في منظومة رقمية واحدة<br />
            لخدمة كتاب الله عز وجل وتيسير مسيرة الحفظ
          </p>
          <div className="lnd-hero-actions">
            <button className="lnd-cta-primary" onClick={onLogin}>
              ابدأ الآن
              <i className="ti ti-arrow-left" />
            </button>
          </div>
        </div>
        <div className="lnd-hero-pattern" aria-hidden="true" />
      </section>

      {/* ── Stats ── */}
      <section className="lnd-stats">
        {STATS.map((s) => (
          <div key={s.label} className="lnd-stat">
            <i className={`ti ${s.icon} lnd-stat-icon`} />
            <div className="lnd-stat-value">{s.value}</div>
            <div className="lnd-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Portals / Features ── */}
      <section className="lnd-section lnd-portals-section">
        <div className="lnd-section-head">
          <h2 className="lnd-section-title">بوابات المنصة</h2>
          <p className="lnd-section-sub">كل مستخدم يجد ما يحتاجه في بوابته المخصصة</p>
        </div>
        <div className="lnd-cards">
          {PORTALS.map((p) => (
            <div key={p.title} className="lnd-card" onClick={onLogin} style={{ cursor: "pointer" }}>
              <div className="lnd-card-icon" style={{ color: p.color }}>
                <i className={`ti ${p.icon}`} />
              </div>
              <h3 className="lnd-card-title">{p.title}</h3>
              <ul className="lnd-card-features">
                {p.features.map((f) => (
                  <li key={f}>
                    <i className="ti ti-check" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="lnd-card-cta" style={{ color: p.color }}>
                دخول البوابة <i className="ti ti-arrow-left" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Learning Tracks ── */}
      <section className="lnd-section lnd-tracks-section">
        <div className="lnd-section-head">
          <h2 className="lnd-section-title">مسارات الحفظ</h2>
          <p className="lnd-section-sub">يُحدَّد المسار تلقائياً بناءً على مستوى الطالب</p>
        </div>
        <div className="lnd-tracks">
          {MASARAT.map((m) => (
            <div key={m.name} className="lnd-track" style={{ borderTopColor: m.color }}>
              <div className="lnd-track-name" style={{ color: m.color }}>{m.name}</div>
              <div className="lnd-track-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lnd-section lnd-how-section">
        <div className="lnd-section-head">
          <h2 className="lnd-section-title">كيف تعمل المنصة؟</h2>
          <p className="lnd-section-sub">أربع خطوات بسيطة من التسجيل إلى التقدم</p>
        </div>
        <div className="lnd-steps">
          {HOW_IT_WORKS.map((h, i) => (
            <div key={h.step} className="lnd-step">
              <div className="lnd-step-num">{h.step}</div>
              {i < HOW_IT_WORKS.length - 1 && <div className="lnd-step-line" />}
              <h4 className="lnd-step-title">{h.title}</h4>
              <p className="lnd-step-desc">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="lnd-cta-banner">
        <div className="lnd-cta-banner-inner">
          <div className="lnd-bismillah" style={{ opacity: 0.7, marginBottom: 16 }}>
            ﴿ وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ ﴾
          </div>
          <h2 className="lnd-cta-banner-title">انضم إلى منصة التحفيظ اليوم</h2>
          <p className="lnd-cta-banner-sub">سجّل دخولك واستمتع بتجربة إدارة متكاملة لحلقة تحفيظ القرآن</p>
          <button className="lnd-cta-primary" onClick={onLogin}>
            تسجيل الدخول
            <i className="ti ti-login-2" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lnd-footer">
        <div className="lnd-footer-brand">
          <img src={LOGO_SRC} alt="شعار" className="lnd-footer-logo" />
          <span>الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير</span>
        </div>
        <div className="lnd-footer-copy">منصة تحفيظ القرآن الكريم • جميع الحقوق محفوظة</div>
      </footer>
    </div>
  );
}
