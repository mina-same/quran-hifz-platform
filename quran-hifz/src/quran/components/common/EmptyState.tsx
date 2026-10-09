import type { ReactNode } from "react";

/**
 * The one empty-state look for the whole app: an icon in a soft green circle,
 * a title, an optional hint and an optional action. `compact` is for table
 * cells, small cards and lists inside a card; the default is for a page or a
 * whole section. Use it for "this list/section has nothing in it" — not for
 * inline field notes ("— لا يوجد حساب بعد") or <option> labels.
 */
export function EmptyState({
  icon = "ti-inbox",
  title,
  description,
  action,
  compact = false,
  tone = "default",
}: {
  icon?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  /** "search" = filters/search matched nothing (neutral icon tint). */
  tone?: "default" | "search";
}) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""} ${tone === "search" ? "search" : ""}`} role="status">
      <div className="empty-state-icon" aria-hidden="true"><i className={`ti ${icon}`} /></div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

/** EmptyState as a full-width table row. */
export function EmptyRow({ colSpan, ...props }: { colSpan: number } & Parameters<typeof EmptyState>[0]) {
  return (
    <tr className="empty-state-row">
      <td colSpan={colSpan}>
        <EmptyState compact {...props} />
      </td>
    </tr>
  );
}
