import type { Halqa } from "../../api/halqat";
import type { SpecialTrack } from "../../api/special-tracks";

/** Unified shape for "teaching context" — either a Halqa or a SpecialTrack. */
export type TeachingContext = {
  kind: "halqa" | "specialTrack";
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

export function halqaToContext(h: Halqa): TeachingContext {
  return {
    kind: "halqa",
    id: h._id,
    title: h.name,
    subtitle: getName(h.masjid),
    scheduleLabel: [h.days, h.time].filter(Boolean).join(" | "),
    studentCount: h.studentCount,
  };
}

export function trackToContext(t: SpecialTrack): TeachingContext {
  return {
    kind: "specialTrack",
    id: t._id,
    title: t.title,
    subtitle: t.isOnline ? "أونلاين" : t.location,
    scheduleLabel: [t.daysPerWeek, t.timeSlot].filter(Boolean).join(" | "),
    studentCount: t.enrolledStudents.length,
  };
}

/** Grid of selectable context cards (halqat + special tracks combined). */
export function ContextPicker({
  contexts,
  onSelect,
  emptyLabel,
}: {
  contexts: TeachingContext[];
  onSelect: (ctx: TeachingContext) => void;
  emptyLabel?: string;
}) {
  if (contexts.length === 0) {
    return (
      <div className="page-loading">{emptyLabel ?? "لا توجد حلقات أو مسارات مسجلة"}</div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      {contexts.map((ctx) => (
        <div
          key={`${ctx.kind}-${ctx.id}`}
          className="card"
          style={{ cursor: "pointer", border: "2px solid transparent", transition: "border .15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
          onClick={() => onSelect(ctx)}
        >
          <div className="card-header">
            <div className="card-title">
              <i className={`ti ${ctx.kind === "halqa" ? "ti-school" : "ti-calendar-event"}`} /> {ctx.title}
            </div>
          </div>
          {ctx.subtitle && (
            <div className="halqa-row">
              <span className="lbl">{ctx.kind === "halqa" ? "المسجد" : "المكان"}</span>
              <span className="val">{ctx.subtitle}</span>
            </div>
          )}
          {ctx.scheduleLabel && (
            <div className="halqa-row">
              <span className="lbl">المواعيد</span>
              <span className="val" style={{ fontSize: 11 }}>{ctx.scheduleLabel}</span>
            </div>
          )}
          <div className="halqa-row">
            <span className="lbl">الطلاب</span>
            <span className="val">{ctx.studentCount ?? "—"} طالب</span>
          </div>
          <button
            className="topbar-btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
            onClick={(e) => { e.stopPropagation(); onSelect(ctx); }}
          >
            <i className={`ti ${ctx.kind === "halqa" ? "ti-school" : "ti-calendar-event"}`} />
            {ctx.kind === "halqa" ? "اختيار الحلقة" : "اختيار المسار"}
          </button>
        </div>
      ))}
    </div>
  );
}
