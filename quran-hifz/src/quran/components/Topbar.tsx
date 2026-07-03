import { usePortal } from "../context/PortalContext";

export function Topbar() {
  const { topbar, toggleSidebar } = usePortal();
  return (
    <div className="topbar">
      <div className="topbar-title">
        <button className="sidebar-toggle-btn" onClick={toggleSidebar} title="القائمة" aria-label="القائمة">
          <i className="ti ti-menu-2" />
        </button>
        <i className={`ti ${topbar.icon}`} />
        <span>{topbar.title}</span>
      </div>
      <div className="topbar-actions">{topbar.actions}</div>
    </div>
  );
}
