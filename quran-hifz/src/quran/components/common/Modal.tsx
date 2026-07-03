import type { ReactNode, CSSProperties } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 480,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
  footer?: ReactNode;
}) {
  if (!open) return null;

  const sheetStyle: CSSProperties = { maxWidth };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        {title !== undefined && (
          <div className="modal-head">
            <h3>{title}</h3>
            <button className="topbar-btn btn-ghost" style={{ padding: "4px 8px" }} onClick={onClose}>
              <i className="ti ti-x" />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
