import { usePortal } from "../context/PortalContext";

export function Topbar() {
  const { topbar } = usePortal();
  return (
    <div className="topbar">
      <div className="topbar-title">
        <i className={`ti ${topbar.icon}`} />
        <span>{topbar.title}</span>
      </div>
      <div className="topbar-actions">{topbar.actions}</div>
    </div>
  );
}
