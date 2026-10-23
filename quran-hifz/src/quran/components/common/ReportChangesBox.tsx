import type { ReportChanges } from "../../api/daily-reports";
import { toAr } from "../../../lib/format";

const SECTION: Record<ReportChanges["sections"][number]["key"], string> = {
  struggling: "المتعثرون",
  absent: "الغائبون",
  excused: "المعتذرون",
};

/** «عُدّلت التقييمات بعد الإرسال» — what changed in the records since the
 *  report was sent. Not part of the report itself (left out of the PDF). */
export function ReportChangesBox({ changes, children }: { changes: ReportChanges; children?: React.ReactNode }) {
  return (
    <div className="drc" data-pdf-exclude="true" role="status">
      <b>
        <i className="ti ti-alert-triangle" /> عُدّلت التقييمات أو الحضور بعد إرسال التقرير
      </b>
      <ul>
        {changes.sections.map((s) => (
          <li key={s.key}>
            <span className="drc-section">{SECTION[s.key]}:</span>
            {s.added.map((n) => <span key={`a${n}`} className="drc-add">+ أُضيف {n}</span>)}
            {s.removed.map((n) => <span key={`r${n}`} className="drc-del">− خرج {n}</span>)}
            {s.changed.map((c) => (
              <span key={`c${c.name}`} className="drc-chg">
                {c.name}: {c.from || "—"} ← {c.to || "—"}
              </span>
            ))}
          </li>
        ))}
        {changes.present && (
          <li>
            <span className="drc-section">الحضور:</span>
            <span className="drc-chg">
              {toAr(changes.present.from)} ← {toAr(changes.present.to)}
            </span>
          </li>
        )}
      </ul>
      {children}
    </div>
  );
}
