import type { Track } from "../../api/tracks";

/** Unified shape for "teaching context" — always a Track now that Halqa is
 * gone and every track has direct students via `Student.track`. */
export type TeachingContext = {
  id: string;
  title: string;
  subtitle?: string;
  scheduleLabel?: string;
  studentCount?: number;
};

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return typeof v === "string" ? v : "";
}

export function trackToContext(t: Track): TeachingContext {
  return {
    id: t._id,
    title: t.title,
    subtitle: t.isOnline ? "أونلاين" : getName(t.masjid),
    scheduleLabel: [t.daysPerWeek, t.timeSlot].filter(Boolean).join(" | "),
    studentCount: t.studentCount,
  };
}

/** Grid of selectable context cards (tracks). */
export function ContextPicker({
  contexts,
  onSelect,
  emptyLabel,
  heading,
  actionLabel,
  actionIcon,
}: {
  contexts: TeachingContext[];
  onSelect: (ctx: TeachingContext) => void;
  emptyLabel?: string;
  /** Short line above the grid stating what selecting a card will do (e.g. "اختر المسار لأخذ الحضور"). Keeps otherwise-identical picker screens across pages visually distinguishable. */
  heading?: string;
  /** Overrides the default "اختيار المسار" button text with an action-specific label (e.g. "أخذ الحضور"). */
  actionLabel?: string;
  /** Overrides the button icon (defaults to ti-calendar-event). */
  actionIcon?: string;
}) {
  if (contexts.length === 0) {
    return <div className="page-loading">{emptyLabel ?? "لا توجد مسارات مسجلة"}</div>;
  }

  return (
    <>
      {heading && (
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text2)" }}>{heading}</p>
      )}
      <div
        className="grid-collapse"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
      >
        {contexts.map((ctx) => (
          <div
            key={ctx.id}
            className="card"
            style={{
              cursor: "pointer",
              border: "2px solid transparent",
              transition: "border .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
            onClick={() => onSelect(ctx)}
          >
            <div className="card-header">
              <div className="card-title">
                <i className="ti ti-calendar-event" /> {ctx.title}
              </div>
            </div>
            {ctx.subtitle && (
              <div className="halqa-row">
                <span className="lbl">المسجد</span>
                <span className="val">{ctx.subtitle}</span>
              </div>
            )}
            {ctx.scheduleLabel && (
              <div className="halqa-row">
                <span className="lbl">المواعيد</span>
                <span className="val" style={{ fontSize: 11 }}>
                  {ctx.scheduleLabel}
                </span>
              </div>
            )}
            <div className="halqa-row">
              <span className="lbl">الطلاب</span>
              <span className="val">{ctx.studentCount ?? "—"} طالب</span>
            </div>
            <button
              className="topbar-btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(ctx);
              }}
            >
              <i className={`ti ${actionIcon ?? "ti-calendar-event"}`} />
              {actionLabel ?? "اختيار المسار"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
