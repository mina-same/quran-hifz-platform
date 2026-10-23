import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTopbar } from "../../context/useTopbar";
import { useTracks, type Track } from "../../api/tracks";
import { useDailyReports, type DailyReport } from "../../api/daily-reports";
import { DailyReportCard, DailyReportCombinedCard, DailyReportSheet } from "../../components/common/DailyReportCard";
import { ScopeTabs } from "../../components/common/ScopeTabs";
import { ReportChangesBox } from "../../components/common/ReportChangesBox";
import { Modal } from "../../components/common/Modal";
import { Alert } from "../../components/common/Alert";
import { downloadReportPdf, gregorianAr, hijriDate, shiftDay, todayKey, weekdayAr } from "../../lib/dailyReport";
import { toAr } from "../../../lib/format";

function masjidOf(t: Track): { id: string; name: string } {
  return typeof t.masjid === "string" ? { id: t.masjid, name: "" } : { id: t.masjid._id, name: t.masjid.name };
}

function teacherNamesOf(t: Track): string[] {
  return t.teachers.flatMap((x) => (typeof x === "string" || !x.name ? [] : [x.name]));
}

/** One line per report — opens the full sheet on click. */
function ReportSummary({ report: r, onOpen }: { report: DailyReport; onOpen: () => void }) {
  return (
    <button type="button" className="drl-item" onClick={onOpen}>
      <div className="drl-item-head">
        <b>{r.trackTitle}</b>
        <i className="ti ti-chevron-left" aria-hidden="true" />
      </div>
      {r.changes && (
        <span className="drl-item-edited"><i className="ti ti-alert-triangle" /> عُدّل بعد الإرسال</span>
      )}
      <div className="drl-item-meta">
        {r.masjidName && <span><i className="ti ti-building-mosque" /> {r.masjidName}</span>}
        {r.teacherName && <span><i className="ti ti-user" /> {r.teacherName}</span>}
      </div>
      <div className="drl-item-counts">
        <span className="present">الحضور {toAr(r.presentCount)}/{toAr(r.totalCount)}</span>
        <span className={`warn ${r.struggling.length ? "" : "zero"}`}>⚠️ {toAr(r.struggling.length)}</span>
        <span className={`absent ${r.absent.length ? "" : "zero"}`}>❌ {toAr(r.absent.length)}</span>
        <span className={`excused ${r.excused.length ? "" : "zero"}`}>🙋 {toAr(r.excused.length)}</span>
      </div>
    </button>
  );
}

/**
 * «التقارير اليومية» — the supervisor's / admin's view of the reports teachers
 * send after each session, by date. Supervisor scoping (gender) happens on the
 * server for both the reports and the track list.
 */
export function AdminDailyReports() {
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [masjid, setMasjid] = useState("");
  const [teacher, setTeacher] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  // Only meaningful with a teacher picked: their reports side by side, or merged into one sheet.
  const [view, setView] = useState<"split" | "combined">("split");
  const { data: reports = [], isLoading, isError, error } = useDailyReports({ date });
  const { data: tracks = [] } = useTracks("active");
  const allRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useTopbar("ti-report", "التقارير اليومية للحلقات");

  const masajid = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tracks) { const x = masjidOf(t); if (x.name) m.set(x.id, x.name); }
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "ar"));
  }, [tracks]);

  // Reports only carry the teacher's name, so the filter keys on names.
  const teachers = useMemo(() => {
    const names = new Set<string>();
    for (const t of tracks) for (const n of teacherNamesOf(t)) names.add(n);
    for (const r of reports) if (r.teacherName) names.add(r.teacherName);
    return [...names].sort((a, b) => a.localeCompare(b, "ar"));
  }, [tracks, reports]);

  const masjidName = masajid.find(([id]) => id === masjid)?.[1];
  const visible = reports.filter((r) =>
    (!masjid || r.masjidName === masjidName) && (!teacher || r.teacherName === teacher));
  const reportedTracks = new Set(reports.map((r) => r.track));
  const missing = tracks.filter((t) =>
    !reportedTracks.has(t._id)
    && (!masjid || masjidOf(t).id === masjid)
    && (!teacher || teacherNamesOf(t).includes(teacher)));
  const combined = !!teacher && view === "combined";
  const opened = visible.find((r) => (r._id ?? r.track) === openId);

  const totals = visible.reduce(
    (a, r) => ({ s: a.s + r.struggling.length, ab: a.ab + r.absent.length, ex: a.ex + r.excused.length }),
    { s: 0, ab: 0, ex: 0 },
  );

  async function downloadAll() {
    if (!allRef.current) return;
    setPdfBusy(true);
    try {
      await downloadReportPdf(allRef.current, `التقارير-اليومية-${date}`);
    } catch {
      toast.error("تعذّر إنشاء ملف PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="drl-page">
      <div className="card drl-bar">
        <div className="dre-date">
          <button type="button" className="topbar-btn btn-ghost" onClick={() => setDate(shiftDay(date, -1))} aria-label="اليوم السابق"><i className="ti ti-chevron-right" /></button>
          <input className="form-input" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button type="button" className="topbar-btn btn-ghost" onClick={() => setDate(shiftDay(date, 1))} disabled={date >= today} aria-label="اليوم التالي"><i className="ti ti-chevron-left" /></button>
          {date !== today && <button type="button" className="topbar-btn btn-ghost" onClick={() => setDate(today)}>اليوم</button>}
        </div>
        <div className="drl-day">
          <b>{weekdayAr(date)}</b> {toAr(hijriDate(date))} هـ <span>· {gregorianAr(date)}</span>
        </div>
        <select className="form-input drl-masjid" value={masjid} onChange={(e) => setMasjid(e.target.value)} aria-label="تصفية حسب المسجد">
          <option value="">كل المساجد</option>
          {masajid.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className="form-input drl-masjid" value={teacher} onChange={(e) => setTeacher(e.target.value)} aria-label="تصفية حسب المعلم">
          <option value="">كل المعلمين</option>
          {teachers.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {teacher && (
          <ScopeTabs
            value={view}
            onChange={(v) => setView(v as "split" | "combined")}
            options={[
              { value: "split", label: "كل تقرير منفصل", icon: "ti-layout-grid" },
              { value: "combined", label: "تقرير مجمّع", icon: "ti-file-text" },
            ]}
          />
        )}
        {visible.length > 0 && !combined && (
          <button type="button" className="topbar-btn btn-ghost" onClick={downloadAll} disabled={pdfBusy}>
            <i className={`ti ${pdfBusy ? "ti-loader-2 lp-spin" : "ti-file-type-pdf"}`} /> تحميل الكل PDF
          </button>
        )}
      </div>

      <div className="drl-tiles">
        <div className="drl-tile"><b>{toAr(visible.length)}</b><span>تقرير مُرسل من {toAr(visible.length + missing.length)} حلقة</span></div>
        <div className="drl-tile warn"><b>{toAr(totals.s)}</b><span>⚠️ متعثرون</span></div>
        <div className="drl-tile absent"><b>{toAr(totals.ab)}</b><span>❌ غائبون</span></div>
        <div className="drl-tile excused"><b>{toAr(totals.ex)}</b><span>🙋 معتذرون</span></div>
      </div>

      {isError && <Alert tone="danger">{(error as Error).message}</Alert>}

      {missing.length > 0 && (
        <div className="card drl-missing">
          <b><i className="ti ti-clock-exclamation" /> لم تُرسل تقريرها بعد ({toAr(missing.length)})</b>
          <div className="drl-missing-list">
            {missing.map((t) => (
              <span key={t._id} className="drl-pill">{t.title}{masjidOf(t).name ? ` — ${masjidOf(t).name}` : ""}</span>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card dre-loading"><i className="ti ti-loader-2 lp-spin" /> جارٍ التحميل…</div>
      ) : visible.length === 0 ? (
        <div className="card drl-empty"><i className="ti ti-report-off" /> لا توجد تقارير مرسلة في هذا اليوم</div>
      ) : combined ? (
        <div className="drl-combined">
          <DailyReportCombinedCard teacher={teacher} date={date} reports={visible} pending={missing.map((t) => t.title)} />
        </div>
      ) : (
        <div className="drl-grid">
          {visible.map((r) => <ReportSummary key={r._id ?? r.track} report={r} onOpen={() => setOpenId(r._id ?? r.track)} />)}
        </div>
      )}

      {/* Full sheets, off-screen — the source for «تحميل الكل PDF». */}
      {visible.length > 0 && !combined && (
        <div className="drl-pdf-source" ref={allRef} aria-hidden="true">
          {visible.map((r) => <DailyReportSheet key={r._id ?? r.track} report={r} />)}
        </div>
      )}

      <Modal open={!!opened} onClose={() => setOpenId(null)} title={opened?.trackTitle} maxWidth={620}>
        {opened?.changes && <ReportChangesBox changes={opened.changes} />}
        {opened && <DailyReportCard report={opened} />}
      </Modal>
    </div>
  );
}
