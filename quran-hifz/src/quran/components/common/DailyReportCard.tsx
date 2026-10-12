import { forwardRef, useRef, useState } from "react";
import { toast } from "sonner";
import type { DailyReport, ReportLine } from "../../api/daily-reports";
import { toAr } from "../../../lib/format";
import { REPORT_CLOSING, combinedReportText, downloadReportPdf, gregorianAr, hijriDate, reportText, weekdayAr } from "../../lib/dailyReport";

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

type Group = { id: string; title: string; rows: ReportLine[] };

/** A section whose rows are grouped under the halqa they came from. */
function GroupedSection({ icon, title, tone, groups, emptyText }: {
  icon: string; title: string; tone: "warn" | "absent" | "excused"; groups: Group[]; emptyText: string;
}) {
  const count = groups.reduce((n, g) => n + g.rows.length, 0);
  return (
    <section className={`dr-section ${tone}`}>
      <h4><span aria-hidden="true">{icon}</span> {title} <span className="dr-count">{toAr(count)}</span></h4>
      {count === 0 ? (
        <p className="dr-empty">{emptyText}</p>
      ) : (
        groups.filter((g) => g.rows.length).map((g) => (
          <div key={g.id} className="dr-group">
            <div className="dr-group-title">حلقة {g.title} <span className="dr-count">{toAr(g.rows.length)}</span></div>
            <ol>
              {g.rows.map((r) => (
                <li key={r.student}>
                  <b>{r.name}</b>
                  {r.area && <span className="dr-area">{r.area}</span>}
                  {r.note && <span className="dr-note">{r.note}</span>}
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
    </section>
  );
}

/** All of one teacher's reports for a day merged into one sheet. Also the PDF source. */
export const DailyReportCombinedSheet = forwardRef<HTMLDivElement, {
  teacher: string; date: string; reports: DailyReport[]; pending?: string[];
}>(function DailyReportCombinedSheet({ teacher, date, reports, pending = [] }, ref) {
  const present = reports.reduce((n, r) => n + r.presentCount, 0);
  const total = reports.reduce((n, r) => n + r.totalCount, 0);
  const groups = (key: "struggling" | "absent" | "excused") => reports.map((r) => ({ id: r._id ?? r.track, title: r.trackTitle, rows: r[key] }));
  const notes = reports.filter((r) => r.notes);
  return (
    <div className="dr-sheet" ref={ref} dir="rtl">
      <header className="dr-head">
        <div className="dr-title">📖 التَّقْرِيرُ الْيَوْمِيُّ الْمُجَمَّعُ لِحَلَقَاتِ الْمُعَلِّمِ</div>
        <div className="dr-masjid">{teacher}</div>
        <div className="dr-date">
          <span>التاريخ: <b>{toAr(hijriDate(date))} هـ</b></span>
          <span>اليوم: <b>{weekdayAr(date)}</b></span>
          <span className="dr-greg">{gregorianAr(date)}</span>
        </div>
        <div className="dr-stats">
          <span>عدد الحلقات <b>{toAr(reports.length)}</b></span>
          <span>الحضور <b>{toAr(present)}</b> من <b>{toAr(total)}</b></span>
        </div>
        <div className="dr-tracks">
          {reports.map((r) => (
            <span key={r._id ?? r.track}>
              {r.trackTitle}{r.masjidName && !r.trackTitle.includes(r.masjidName) ? ` — ${r.masjidName}` : ""} · {toAr(r.presentCount)}/{toAr(r.totalCount)}
            </span>
          ))}
        </div>
        {pending.length > 0 && <div className="dr-pending">لم تُرسل بعد: {pending.join("، ")}</div>}
      </header>
      <div className="dr-label">البيان</div>
      <GroupedSection icon="⚠️" title="المتعثرون" tone="warn" groups={groups("struggling")} emptyText="لا يوجد متعثرون اليوم" />
      <GroupedSection icon="❌" title="الغائبون" tone="absent" groups={groups("absent")} emptyText="لا يوجد غائبون" />
      <GroupedSection icon="🙋" title="المعتذرون" tone="excused" groups={groups("excused")} emptyText="لا يوجد معتذرون" />
      {notes.map((r) => <p key={r._id ?? r.track} className="dr-notes">📝 <b>{r.trackTitle}:</b> {r.notes}</p>)}
      <p className="dr-closing">{REPORT_CLOSING}</p>
    </div>
  );
});

/** Copy the WhatsApp text / download the PDF of a report sheet. */
export function DailyReportActions({ text, fileName, sheetRef }: {
  text: string; fileName: string; sheetRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [busy, setBusy] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ نص التقرير — الصقه في واتساب");
    } catch {
      toast.error("تعذّر النسخ");
    }
  }
  async function pdf() {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      await downloadReportPdf(sheetRef.current, fileName);
    } catch {
      toast.error("تعذّر إنشاء ملف PDF");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="dr-actions" data-pdf-exclude="true">
      <button type="button" className="topbar-btn btn-ghost" onClick={copy}><i className="ti ti-copy" /> نسخ النص</button>
      <a className="topbar-btn btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
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
      <DailyReportActions text={reportText(report)} fileName={reportFileName(report)} sheetRef={ref} />
    </div>
  );
}

export function reportFileName(r: DailyReport): string {
  return `تقرير-${r.trackTitle}-${r.date}`;
}

/** One teacher's day merged into a single sheet, with its actions. */
export function DailyReportCombinedCard({ teacher, date, reports, pending }: {
  teacher: string; date: string; reports: DailyReport[]; pending?: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="dr-card">
      <DailyReportCombinedSheet ref={ref} teacher={teacher} date={date} reports={reports} pending={pending} />
      <DailyReportActions
        text={combinedReportText(teacher, date, reports, pending)}
        fileName={`تقرير-مجمع-${teacher}-${date}`}
        sheetRef={ref}
      />
    </div>
  );
}
