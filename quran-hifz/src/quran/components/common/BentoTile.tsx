import type { ReactNode } from "react";

/** Bento-grid tile: a flatter, lighter-weight alternative to `Card` — small
 *  uppercase eyebrow label instead of a bordered `.card-header`, so a page
 *  built from these doesn't read as "another stack of identical cards."
 *  Combine with `span="2"|"4"` and `tall` to vary tile size across a
 *  `.bento-grid` container instead of every tile being the same footprint. */
export function BentoTile({
  label,
  icon,
  span,
  tall,
  badge,
  children,
  className,
}: {
  label?: ReactNode;
  icon?: string;
  span?: "2" | "4";
  tall?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bento-tile ${span ? `span-${span}` : ""} ${tall ? "row-2" : ""} ${className ?? ""}`}
    >
      {label !== undefined && (
        <div className="bento-tile-head">
          {icon && <i className={`ti ${icon}`} />}
          <span className="bento-tile-label">{label}</span>
          {badge}
        </div>
      )}
      <div className="bento-tile-body">{children}</div>
    </div>
  );
}
