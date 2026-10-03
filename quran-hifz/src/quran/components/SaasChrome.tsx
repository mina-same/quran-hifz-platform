import { useTheme } from "../context/ThemeContext";
import { toAr } from "../../lib/format";
import { PLATFORM_LOGO, PLATFORM_NAME, SALES_WHATSAPP_DISPLAY, salesWhatsappLink } from "../config/saas";

/** Sticky header shared by the public pages (home, blog). */
export function SaasNav() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="saas-nav">
      <a className="saas-brand" href="/">
        <img src={PLATFORM_LOGO} alt="" width={36} height={36} />
        <span>{PLATFORM_NAME}</span>
      </a>
      <div style={{ flex: 1 }} />
      <a className="saas-nav-link" href="/#features">المزايا</a>
      <a className="saas-nav-link" href="/#reports">التقارير</a>
      <a className="saas-nav-link" href="/#mobile-app">التطبيق</a>
      <a className="saas-nav-link" href="/blog">المدونة</a>
      <button className="login-theme-btn" onClick={toggleTheme} aria-label="تبديل المظهر">
        <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
      </button>
      <a className="saas-nav-login" href="/login">تسجيل الدخول</a>
      <a className="saas-btn saas-btn-primary saas-btn-sm" href="/signup">ابدأ مجاناً</a>
    </header>
  );
}

export function SaasFooter() {
  return (
    <footer className="saas-footer">
      <nav className="saas-footer-links">
        <a href="/">الرئيسية</a>
        <a href="/blog">المدونة</a>
        <a href="/signup">سجّل مؤسستك</a>
        <a href="/login">تسجيل الدخول</a>
        <a href={salesWhatsappLink()} target="_blank" rel="noreferrer">
          <i className="ti ti-brand-whatsapp" /> <span dir="ltr">{SALES_WHATSAPP_DISPLAY}</span>
        </a>
      </nav>
      © {toAr(new Date().getFullYear())} {PLATFORM_NAME}
    </footer>
  );
}
