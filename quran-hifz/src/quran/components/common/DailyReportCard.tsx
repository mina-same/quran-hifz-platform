import { forwardRef, useRef, useState } from "react";
import { toast } from "sonner";
import type { DailyReport, ReportLine } from "../../api/daily-reports";
import { toAr } from "../../../lib/format";
import { REPORT_CLOSING, downloadReportPdf, gregorianAr, hijriDate, reportText, weekdayAr } from "../../lib/dailyReport";

function Section({ icon, title, tone, rows, emptyText }: {
  icon: string; title: string; tone: "warn" | "absent" | "excused"; rows: ReportLine[]; emptyText: string;
}) {
  return (
    <section className={`dr-section ${tone}`}>
      <h4><span aria-hidden="true">{icon}</span> {title} <span className="dr-count">{toAr(rows.length)}</span></h4>
      {rows.length === 0 ? (
        <p className="dr-empty">{emptyText}</p>
      ) : (
        <ol>
          {rows.map((r) => (
            <li key={r.student}>
              <b>{r.name}</b>
              {r.area && <span className="dr-area">{r.area}</span>}
              {r.note && <span className="dr-note">{r.note}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** The report itself — same layout as the WhatsApp text. Also the PDF source. */
export const DailyReportSheet = forwardRef<HTMLDivElement, { report: DailyReport }>(function DailyReportSheet({ report: r }, ref) {
  return (
    <div className="dr-sheet" ref={ref} dir="rtl">
      <header className="dr-head">
        <div className="dr-title">📖 التَّقْرِيرُ الْيَوْمِيُّ لِحَلْقَةِ {r.trackTitle}</div>
        {r.masjidName && <div className="dr-masjid">في {r.masjidName}</div>}
        <div className="dr-date">
          <span>التاريخ: <b>{toAr(hijriDate(r.date))} هـ</b></span>
          <span>اليوم: <b>{weekdayAr(r.date)}</b></span>
          <span className="dr-greg">{gregorianAr(r.date)}</span>
        </div>
        <div className="dr-stats">
          <span>الحضور <b>{toAr(r.presentCount)}</b> من <b>{toAr(r.totalCount)}</b></span>
          {r.teacherName && <span>المعلم: <b>{r.teacherName}</b></span>}
        </div>
      </header>
      <div className="dr-label">البيان</div>
      <Section icon="⚠️" title="المتعثرون" tone="warn" rows={r.struggling} emptyText="لا يوجد متعثرون اليوم" />
      <Section icon="❌" title="الغائبون" tone="absent" rows={r.absent} emptyText="لا يوجد غائبون" />
      <Section icon="🙋" title="المعتذرون" tone="excused" rows={r.excused} emptyText="لا يوجد معتذرون" />
      {r.notes && <p className="dr-notes">📝 {r.notes}</p>}
      <p className="dr-closing">{REPORT_CLOSING}</p>
    </div>
  );
});

/** Copy the WhatsApp text / download the PDF for one report. */
export function DailyReportActions({ report, sheetRef }: { report: DailyReport; sheetRef: React.RefObject<HTMLDivElement | null> }) {
  const [busy, setBusy] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(reportText(report));
      toast.success("تم نسخ نص التقرير — الصقه في واتساب");
    } catch {
      toast.error("تعذّر النسخ");
    }
  }
  async function pdf() {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      await downloadReportPdf(sheetRef.current, `تقرير-${report.trackTitle}-${report.date}`);
    } catch {
      toast.error("تعذّر إنشاء ملف PDF");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="dr-actions" data-pdf-exclude="true">
      <button type="button" className="topbar-btn btn-ghost" onClick={copy}><i className="ti ti-copy" /> نسخ النص</button>
      <a className="topbar-btn btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(reportText(report))}`} target="_blank" rel="noreferrer">
        <i className="ti ti-brand-whatsapp" /> واتساب
      </a>
      <button type="button" className="topbar-btn btn-ghost" onClick={pdf} disabled={busy}>
        <i className={`ti ${busy ? "ti-loader-2 lp-spin" : "ti-file-type-pdf"}`} /> تحميل PDF
      </button>
    </div>
  );
}

/** A report with its actions — used in the supervisor/admin list. */
export function DailyReportCard({ report }: { report: DailyReport }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="dr-card">
      <DailyReportSheet ref={ref} report={report} />
      <DailyReportActions report={report} sheetRef={ref} />
    </div>
  );
}
