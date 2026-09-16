import { usePortal } from "../context/PortalContext";
import { PORTALS } from "../config/portals";
import { useTheme } from "../context/ThemeContext";
import type { GenderScope } from "../lib/genderScope";

const LOGO_SRC = "/quran/logo.png";

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

export function Sidebar() {
  const { portal, page, user, showPage, logout, closeSidebar, genderScope, setGenderScope } = usePortal();
  const { theme, toggleTheme } = useTheme();
  if (!portal) return null;
  const cfg = PORTALS[portal];

  const displayName = user?.name ?? cfg.user.name;
  const displayRole = cfg.user.role;
  const displayInitials = user ? getInitials(user.name) : cfg.user.initials;

  return (
    <>
      <div className="sidebar-overlay" onClick={closeSidebar} />
      <div className="sidebar">
      <div className="sidebar-brand">
        <img className="sidebar-logo" src={LOGO_SRC} alt="شعار" />
        <div className="sidebar-name">جمعية تحفيظ القرآن الكريم بالعماير</div>
        <span className="sidebar-portal-badge">{cfg.badge}</span>
      </div>
      {portal === "admin" && (
        <div className="sidebar-gender-scope">
          <label htmlFor="sidebar-gender-scope-select" className="sidebar-gender-scope-label">النطاق</label>
          <select
            id="sidebar-gender-scope-select"
            className="sidebar-gender-scope-select"
            value={genderScope}
            onChange={(e) => setGenderScope(e.target.value as GenderScope)}
          >
            <option value="all">الكل</option>
            <option value="male">بنين</option>
            <option value="female">بنات</option>
          </select>
        </div>
      )}
      <nav className="sidebar-nav">
        {cfg.nav.map((g) => (
          <div key={g.group}>
            <div className="nav-group-label">{g.group}</div>
            {g.items.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => showPage(item.id)}
              >
                <i className={`ti ${item.icon}`} />
                <span>{item.label}</span>
                {item.dot && <span className="badge-dot" />}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-avatar">{displayInitials}</div>
        <div className="user-info">
          <div className="user-name">{displayName}</div>
          <div className="user-role">{displayRole}</div>
        </div>
        <div className="sidebar-footer-actions">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "وضع النهار" : "وضع الليل"}
          >
            <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
          </button>
          <i className="ti ti-logout logout-btn" title="خروج" onClick={logout} />
        </div>
      </div>
      </div>
    </>
  );
}
