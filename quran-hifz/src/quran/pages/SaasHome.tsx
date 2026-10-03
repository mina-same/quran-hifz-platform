import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toAr } from "../../lib/format";
import { hasArabic } from "../../lib/latin";
import { LatinHint } from "../components/LatinHint";
import { SaasNav, SaasFooter } from "../components/SaasChrome";
import { StatsBand, ReportsShowcase, AppDownload, LatestPosts } from "../components/SaasHomeSections";
import { PLATFORM_NAME, PLATFORM_TAGLINE, SALES_WHATSAPP_DISPLAY, TRIAL_DAYS, salesWhatsappLink, PUBLIC_DOMAIN } from "../config/saas";

const FEATURES = [
  { icon: "ti-layout-dashboard", title: "لوحة إدارة شاملة",   desc: "المساجد والحلقات والمسارات والمعلمون والطلاب في مكان واحد، مع مؤشرات أداء وتقارير جاهزة." },
  { icon: "ti-calendar-check",   title: "الحضور والتقييم اليومي", desc: "يسجّل المعلم الحضور ودرجات الحفظ والتجويد في دقيقة، ويُشعَر ولي الأمر تلقائياً." },
  { icon: "ti-book-2",           title: "خطط حفظ ومراجعة ذكية", desc: "خطط بالسور والأجزاء تُوزَّع على الأيام، وتُعاد جدولتها تلقائياً عند الغياب." },
  { icon: "ti-user-heart",       title: "بوابة لولي الأمر",    desc: "يتابع ولي الأمر حضور ابنه وتقدّمه وواجباته ورسائل المعلم من جواله." },
  { icon: "ti-chart-bar",        title: "تقارير وتحليلات",      desc: "تقارير حضور وتقدم لكل طالب وحلقة ومعلم، قابلة للتصدير." },
  { icon: "ti-device-mobile",    title: "يعمل على الجوال",      desc: "واجهة عربية بالكامل، تعمل على الحاسب والجوال، مع وضع ليلي." },
];

const VIDEO_HERO = "/10661535-hd_1920_1080_30fps.mp4";

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

/** Fades `.lnd-reveal` elements in as they scroll into view (instantly under
 *  prefers-reduced-motion). Without it they stay at opacity 0. */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".lnd-reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("lnd-revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("lnd-revealed"); }),
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const STEPS = [
  { icon: "ti-user-plus",       title: "سجّل مؤسستك",          desc: "أدخل بيانات مؤسستك واختر رابطاً خاصاً بها." },
  { icon: "ti-settings",        title: "جهّز حلقاتك",           desc: "أضف المساجد والمعلمين والطلاب، وشارك الرابط معهم." },
  { icon: "ti-gift",            title: `جرّب ${toAr(TRIAL_DAYS)} أيام مجاناً`, desc: "كل المزايا مفتوحة طوال فترة التجربة دون بطاقة دفع." },
  { icon: "ti-brand-whatsapp",  title: "فعّل اشتراكك",          desc: "تواصل مع فريق المبيعات عبر واتساب لتفعيل الاشتراك." },
];

export function SaasHome() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  useScrollReveal();

  function goToOrg(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase();
    if (s && !hasArabic(s)) navigate({ to: "/$slug", params: { slug: s } });
  }

  return (
    <div className="saas">
      <SaasNav />

      {/* Hero — original design: looping video under a dark green overlay. */}
      <section className="lnd-hero saas-video-hero">
        <div className="lnd-hero-bg" aria-hidden="true">
          <video src={VIDEO_HERO} className="lnd-hero-img" autoPlay muted loop playsInline preload="auto" />
          <div className="lnd-hero-overlay" />
        </div>
        <div className="lnd-orb lnd-orb-1" aria-hidden="true" />
        <div className="lnd-orb lnd-orb-2" aria-hidden="true" />
        <div className="lnd-hero-inner">
          <div className="lnd-hero-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <div className="saas-pill"><i className="ti ti-gift" /> تجربة مجانية {toAr(TRIAL_DAYS)} أيام — بدون بطاقة دفع</div>
          <h1 className="lnd-hero-title">
            أدِر حلقات تحفيظ القرآن الكريم
            <br />
            <span className="lnd-hero-accent">بسهولة ومن أي مكان</span>
          </h1>
          <p className="lnd-hero-sub">
            {PLATFORM_TAGLINE} — للجمعيات والمساجد ودور التحفيظ.<br />
            بوابات للإدارة والمعلم والطالب وولي الأمر، برابط خاص لمؤسستك.
          </p>
          <div className="lnd-hero-actions">
            <a className="lnd-cta-primary" href="/signup">
              سجّل مؤسستك الآن <i className="ti ti-arrow-left" />
            </a>
            <a className="lnd-cta-ghost" href={salesWhatsappLink()} target="_blank" rel="noreferrer">
              <i className="ti ti-brand-whatsapp" /> تحدّث مع المبيعات
            </a>
          </div>

          <form className="saas-goto saas-goto-on-video" onSubmit={goToOrg}>
            <label htmlFor="saas-goto-input">لديك حساب؟ ادخل من رابط مؤسستك أو <a href="/login">سجّل الدخول بالبريد</a></label>
            <div className="saas-goto-row" dir="ltr">
              <span className="signup-slug-prefix">{PUBLIC_DOMAIN}/</span>
              <input
                id="saas-goto-input"
                className="signup-slug-input"
                placeholder="al-noor"
                value={slug}
                onChange={(e) => setSlug(hasArabic(e.target.value) ? e.target.value : e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
              />
              <button type="submit" className="saas-goto-btn" aria-label="دخول">
                <i className="ti ti-arrow-right" />
              </button>
            </div>
            <LatinHint value={slug} />
          </form>
        </div>
      </section>

      <StatsBand />

      <section className="saas-section" id="features">
        <h2>كل ما تحتاجه حلقتك في منصة واحدة</h2>
        <div className="saas-grid">
          {FEATURES.map((f) => (
            <div className="saas-card" key={f.title}>
              <div className="saas-card-icon"><i className={`ti ${f.icon}`} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <ReportsShowcase />

      <section className="saas-section" id="how">
        <h2>كيف تبدأ؟</h2>
        <ol className="saas-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="saas-step-num">{toAr(i + 1)}</span>
              <i className={`ti ${s.icon}`} />
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <AppDownload />

      {/* Testimonials — original design */}
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

      <LatestPosts />

      <section className="saas-cta">
        <h2>جاهز لتجربة {PLATFORM_NAME}؟</h2>
        <p>أنشئ حساب مؤسستك في دقيقتين، وابدأ تسجيل الحضور اليوم.</p>
        <div className="saas-hero-ctas">
          <a className="saas-btn saas-btn-light" href="/signup">ابدأ التجربة المجانية</a>
          <a className="saas-btn saas-btn-outline-light" href={salesWhatsappLink()} target="_blank" rel="noreferrer">
            <i className="ti ti-brand-whatsapp" /> <span dir="ltr">{SALES_WHATSAPP_DISPLAY}</span>
          </a>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
}
