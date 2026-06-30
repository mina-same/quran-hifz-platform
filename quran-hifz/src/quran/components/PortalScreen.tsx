import type { PortalKey } from "../config/portals";

const LOGO_SRC = "/quran/logo.png";

const CARDS: { id: PortalKey; icon: string; title: string; desc: string }[] = [
  { id: "student", icon: "ti-book-2",        title: "بوابة الطالب",    desc: "متابعة الحفظ والواجبات والمواعيد" },
  { id: "teacher", icon: "ti-chalkboard",    title: "بوابة المعلم",    desc: "إدارة الحلقات والطلاب والتقييم" },
  { id: "admin",   icon: "ti-layout-dashboard", title: "بوابة الإدارة", desc: "الإشراف الكامل والتقارير والإعدادات" },
  { id: "parent",  icon: "ti-users",         title: "بوابة ولي الأمر", desc: "متابعة أداء الطالب وتسجيلاته" },
];

export function PortalScreen({ onSelect }: { onSelect: (key: PortalKey) => void }) {
  return (
    <div id="portal-screen">
      <div className="portal-header">
        <img className="portal-logo" src={LOGO_SRC} alt="شعار الجمعية" />
        <div className="portal-title">الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير</div>
        <div className="portal-sub">اختر البوابة المناسبة للدخول</div>
      </div>
      <div className="portal-cards">
        {CARDS.map((c) => (
          <div key={c.id} className="portal-card" onClick={() => onSelect(c.id)}>
            <i className={`ti ${c.icon}`} />
            <div className="portal-card-title">{c.title}</div>
            <div className="portal-card-desc">{c.desc}</div>
          </div>
        ))}
      </div>
      <div className="portal-footer">
        منصة تحفيظ القرآن • مصممة بواسطة{" "}
        <a href="https://www.thebrightstation.com" target="_blank" rel="noreferrer">
          The Bright Station
        </a>
      </div>
    </div>
  );
}
