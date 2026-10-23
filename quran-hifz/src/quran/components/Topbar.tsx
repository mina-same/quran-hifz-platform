import { usePortal, useTopbarValue } from "../context/PortalContext";
import { ParentChildSwitch } from "./ParentChildSwitch";

export function Topbar() {
  const { toggleSidebar, portal } = usePortal();
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
      <div className="topbar-actions">
        {portal === "parent" && <ParentChildSwitch />}
        {topbar.actions}
      </div>
    </div>
  );
}
