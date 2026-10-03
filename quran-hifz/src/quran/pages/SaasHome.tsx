import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toAr } from "../../lib/format";
import { SaasNav, SaasFooter, useHost } from "../components/SaasChrome";
import { PLATFORM_NAME, PLATFORM_TAGLINE, SALES_WHATSAPP_DISPLAY, TRIAL_DAYS, salesWhatsappLink } from "../config/saas";

const FEATURES = [
  { icon: "ti-layout-dashboard", title: "لوحة إدارة شاملة",   desc: "المساجد والحلقات والمسارات والمعلمون والطلاب في مكان واحد، مع مؤشرات أداء وتقارير جاهزة." },
  { icon: "ti-calendar-check",   title: "الحضور والتقييم اليومي", desc: "يسجّل المعلم الحضور ودرجات الحفظ والتجويد في دقيقة، ويُشعَر ولي الأمر تلقائياً." },
  { icon: "ti-book-2",           title: "خطط حفظ ومراجعة ذكية", desc: "خطط بالسور والأجزاء تُوزَّع على الأيام، وتُعاد جدولتها تلقائياً عند الغياب." },
  { icon: "ti-user-heart",       title: "بوابة لولي الأمر",    desc: "يتابع ولي الأمر حضور ابنه وتقدّمه وواجباته ورسائل المعلم من جواله." },
  { icon: "ti-chart-bar",        title: "تقارير وتحليلات",      desc: "تقارير حضور وتقدم لكل طالب وحلقة ومعلم، قابلة للتصدير." },
  { icon: "ti-device-mobile",    title: "يعمل على الجوال",      desc: "واجهة عربية بالكامل، تعمل على الحاسب والجوال، مع وضع ليلي." },
];

const STEPS = [
  { icon: "ti-user-plus",       title: "سجّل مؤسستك",          desc: "أدخل بيانات مؤسستك واختر رابطاً خاصاً بها." },
  { icon: "ti-settings",        title: "جهّز حلقاتك",           desc: "أضف المساجد والمعلمين والطلاب، وشارك الرابط معهم." },
  { icon: "ti-gift",            title: `جرّب ${toAr(TRIAL_DAYS)} أيام مجاناً`, desc: "كل المزايا مفتوحة طوال فترة التجربة دون بطاقة دفع." },
  { icon: "ti-brand-whatsapp",  title: "فعّل اشتراكك",          desc: "تواصل مع فريق المبيعات عبر واتساب لتفعيل الاشتراك." },
];

export function SaasHome() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const host = useHost();

  function goToOrg(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase();
    if (s) navigate({ to: "/$slug", params: { slug: s } });
  }

  return (
    <div className="saas">
      <SaasNav />

      <section className="saas-hero">
        <div className="saas-pill"><i className="ti ti-gift" /> تجربة مجانية {toAr(TRIAL_DAYS)} أيام — بدون بطاقة دفع</div>
        <h1>أدِر حلقات تحفيظ القرآن الكريم<br />بسهولة ومن أي مكان</h1>
        <p>{PLATFORM_TAGLINE} — للجمعيات والمساجد ودور التحفيظ. بوابات للإدارة والمعلم والطالب وولي الأمر، برابط خاص لمؤسستك.</p>
        <div className="saas-hero-ctas">
          <a className="saas-btn saas-btn-primary" href="/signup">
            سجّل مؤسستك الآن <i className="ti ti-arrow-left" />
          </a>
          <a className="saas-btn saas-btn-ghost" href={salesWhatsappLink()} target="_blank" rel="noreferrer">
            <i className="ti ti-brand-whatsapp" /> تحدّث مع المبيعات
          </a>
        </div>

        <form className="saas-goto" onSubmit={goToOrg}>
          <label htmlFor="saas-goto-input">لديك حساب؟ ادخل من رابط مؤسستك</label>
          <div className="saas-goto-row" dir="ltr">
            <span className="signup-slug-prefix">{host}/</span>
            <input
              id="saas-goto-input"
              className="signup-slug-input"
              placeholder="al-noor"
              value={slug}
              onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
            />
            <button type="submit" className="saas-goto-btn" aria-label="دخول">
              <i className="ti ti-arrow-right" />
            </button>
          </div>
        </form>
      </section>

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
