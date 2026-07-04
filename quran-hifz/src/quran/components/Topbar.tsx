import { usePortal, useTopbarValue } from "../context/PortalContext";

export function Topbar() {
  const { toggleSidebar } = usePortal();
  const topbar = useTopbarValue();
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
