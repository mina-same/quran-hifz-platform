import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDailyReportDraft, useSendDailyReport, type DailyReport, type ReportLine } from "../../api/daily-reports";
import { DailyReportActions, DailyReportSheet } from "./DailyReportCard";
import { Alert } from "./Alert";
import { toAr } from "../../../lib/format";

type ListKey = "struggling" | "absent" | "excused";

const AREAS = ["الحفظ", "المراجعة", "التجويد", "التلاوة"];

const SECTIONS: { key: ListKey; icon: string; title: string; notePlaceholder: string }[] = [
  { key: "struggling", icon: "⚠️", title: "المتعثرون", notePlaceholder: "ملاحظة (اختياري)" },
  { key: "absent", icon: "❌", title: "الغائبون", notePlaceholder: "سبب الغياب — مثال: مريض" },
  { key: "excused", icon: "🙋", title: "المعتذرون", notePlaceholder: "سبب الاعتذار" },
];

function LineEditor({ list, line, onChange, onRemove, notePlaceholder }: {
  list: ListKey; line: ReportLine; onChange: (l: ReportLine) => void; onRemove: () => void; notePlaceholder: string;
}) {
  const areas = (line.area ?? "").split("،").map((a) => a.trim()).filter(Boolean);
  const toggleArea = (a: string) => {
    const next = areas.includes(a) ? areas.filter((x) => x !== a) : [...areas, a];
    onChange({ ...line, area: next.join("، ") || undefined });
  };
  return (
    <div className="dre-line">
      <div className="dre-line-head">
        <b>{line.name}</b>
        <button type="button" className="dre-remove" onClick={onRemove} aria-label={`إزالة ${line.name}`}><i className="ti ti-x" /></button>
      </div>
      {list === "struggling" && (
        <div className="dre-areas">
          {AREAS.map((a) => (
            <button type="button" key={a} className={`dre-chip ${areas.includes(a) ? "on" : ""}`} onClick={() => toggleArea(a)}>{a}</button>
          ))}
        </div>
      )}
      <input
        className="form-input dre-note"
        value={line.note ?? ""}
        placeholder={notePlaceholder}
        maxLength={300}
        onChange={(e) => onChange({ ...line, note: e.target.value || undefined })}
      />
      {list === "struggling" && areas.length === 0 && <span className="dre-warn">اختر مجال التعثر</span>}
    </div>
  );
}

/**
 * The daily report editor + live preview + send button for one (track, date).
 * Pre-filled from that day's attendance/evaluations (or the already-sent
 * report). Used by the «التقرير اليومي» page and by the pop-up that opens on
 * the halqa / attendance pages once every student has been recorded.
 */
export function DailyReportComposer({ trackId, date, onSent, onGoRecord }: {
  trackId: string;
  date: string;
  onSent?: (r: DailyReport) => void;
  /** Shown as a link when nothing was recorded for the day yet. */
  onGoRecord?: () => void;
}) {
  const { data, isLoading, isError, error } = useDailyReportDraft(trackId || undefined, date);
  const send = useSendDailyReport();
  const [report, setReport] = useState<DailyReport | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Start from the saved report when the day was already sent, else the draft.
  useEffect(() => {
    if (data) setReport(data.saved ?? data.draft);
  }, [data]);

  const listed = useMemo(() => {
    const s = new Set<string>();
    if (report) for (const k of ["struggling", "absent", "excused"] as ListKey[]) for (const l of report[k]) s.add(l.student);
    return s;
  }, [report]);
  const addable = (data?.students ?? []).filter((s) => !listed.has(s._id));

  const updateList = (k: ListKey, fn: (rows: ReportLine[]) => ReportLine[]) =>
    setReport((r) => (r ? { ...r, [k]: fn(r[k]) } : r));

  function submit() {
    if (!report) return;
    if (report.struggling.some((l) => !l.area)) {
      toast.error("حدد مجال التعثر لكل طالب في قائمة المتعثرين");
      return;
    }
    const { struggling, absent, excused, presentCount, totalCount, notes } = report;
    send.mutate(
      { track: trackId, date, struggling, absent, excused, presentCount, totalCount, notes: notes?.trim() || undefined },
      {
        onSuccess: (saved) => {
          toast.success("تم إرسال التقرير للمشرف والإدارة");
          onSent?.(saved);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  if (isError) return <Alert tone="danger">{(error as Error).message}</Alert>;
  if (isLoading || !report) {
    return <div className="card dre-loading"><i className="ti ti-loader-2 lp-spin" /> جارٍ تجهيز التقرير…</div>;
  }

  return (
    <div className="dre-composer">
      {data?.saved && (
        <div className="dre-sent"><i className="ti ti-circle-check" /> أُرسل التقرير — يمكنك تعديله وإعادة الإرسال</div>
      )}
      {data && !data.recorded && !data.saved && (
        <Alert tone="warning">
          لم يُسجَّل الحضور والتقييم لهذا اليوم بعد، فالتقرير فارغ.
          {onGoRecord && <> <button type="button" className="dre-link" onClick={onGoRecord}>سجّل الحضور والتقييم أولاً</button></>}
          {" "}أو أضف الطلاب يدوياً.
        </Alert>
      )}

      <div className="dre-grid">
        <div className="dre-editor">
          {SECTIONS.map((sec) => (
            <div className="card dre-section" key={sec.key}>
              <div className="dre-section-head">
                <h3><span aria-hidden="true">{sec.icon}</span> {sec.title} <span className="dr-count">{toAr(report[sec.key].length)}</span></h3>
                {addable.length > 0 && (
                  <select
                    className="form-input dre-add"
                    value=""
                    aria-label={`إضافة طالب إلى ${sec.title}`}
                    onChange={(e) => {
                      const st = addable.find((s) => s._id === e.target.value);
                      if (st) updateList(sec.key, (rows) => [...rows, { student: st._id, name: st.name }]);
                    }}
                  >
                    <option value="">+ إضافة طالب</option>
                    {addable.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                )}
              </div>
              {report[sec.key].length === 0 ? (
                <p className="dre-empty">لا يوجد</p>
              ) : (
                report[sec.key].map((line, i) => (
                  <LineEditor
                    key={line.student}
                    list={sec.key}
                    line={line}
                    notePlaceholder={sec.notePlaceholder}
                    onChange={(l) => updateList(sec.key, (rows) => rows.map((x, j) => (j === i ? l : x)))}
                    onRemove={() => updateList(sec.key, (rows) => rows.filter((_, j) => j !== i))}
                  />
                ))
              )}
            </div>
          ))}

          <div className="card dre-section">
            <h3>📝 ملاحظات عامة (اختياري)</h3>
            <textarea
              className="form-input dre-notes"
              rows={3}
              maxLength={1000}
              value={report.notes ?? ""}
              placeholder="أي ملاحظة للمشرف عن حلقة اليوم"
              onChange={(e) => setReport({ ...report, notes: e.target.value })}
            />
          </div>

          <button type="button" className="login-submit dre-send" onClick={submit} disabled={send.isPending || !trackId}>
            {send.isPending
              ? <><i className="ti ti-loader-2 lp-spin" /> جارٍ الإرسال…</>
              : <><i className="ti ti-send" /> {data?.saved ? "تحديث التقرير" : "إرسال التقرير للمشرف والإدارة"}</>}
          </button>
        </div>

        <div className="dre-preview">
          <div className="dre-preview-label">معاينة التقرير</div>
          <DailyReportSheet ref={sheetRef} report={report} />
          <DailyReportActions report={report} sheetRef={sheetRef} />
        </div>
      </div>
    </div>
  );
}
