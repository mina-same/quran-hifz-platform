import type { ReactNode, CSSProperties } from "react";

export function Card({
  title,
  icon,
  headerExtra,
  children,
  style,
  className,
}: {
  title?: ReactNode;
  icon?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div className={`card ${className ?? ""}`} style={style}>
      {title !== undefined && (
        <div className="card-header">
          <div className="card-title">
            {icon && <i className={`ti ${icon}`} />} {title}
          </div>
          {headerExtra}
        </div>
      )}
      {children}
    </div>
  );
}
