import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { useHalqat } from "../../api/halqat";
import { useSpecialTracks } from "../../api/special-tracks";
import { useStudents } from "../../api/students";
import { downloadCsv } from "../../../lib/csv";
import { Card } from "../../components/common/Card";
import { StudentReportPanel } from "../../components/common/StudentReportPanel";

const GIFTED_THRESHOLD = 85;

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return typeof v === "string" ? v : "";
}

function colorVar(c: "" | "gold" | "blue") {
  if (c === "gold") return "var(--gold)";
  if (c === "blue") return "var(--text2)";
  return "var(--green)";
}

export function TeacherReports() {
  const { user } = usePortal();
  const { data: halqat = [], isLoading: halqatLoading } = useHalqat({ teacher: user?.profileId });
  const { data: tracks = [] } = useSpecialTracks(undefined, user?.profileId as string | undefined);
  const halqaIds = halqat.map((h) => h._id);
  const { data: students = [], isLoading: studentsLoading } = useStudents(
    { halqa: halqaIds.join(",") },
    { enabled: !halqatLoading && halqaIds.length > 0 },
  );
  const loading = halqatLoading || studentsLoading;

  // Detailed report (StudentReportPanel) filter — "من فين الطلاب" — teachers
  // often have several halqat and tracks, so the CSV cards above stay scoped
  // to "all my halqat" but the detailed panel below lets picking exactly one.
  const [pickedContext, setPickedContext] = useState("");
  // "" means "all my halqat" — only a sensible default when halqat actually
  // exist; a teacher with only special tracks (no halqat) defaults to their
  // first track instead of silently resolving to an empty student list.
  const reportContext = pickedContext || (halqaIds.length > 0 ? "" : tracks[0] ? `track:${tracks[0]._id}` : "");
  const reportHalqa = halqat.find((h) => `halqa:${h._id}` === reportContext);
  const reportTrack = tracks.find((t) => `track:${t._id}` === reportContext);
  const reportFilter = reportHalqa ? { halqa: reportHalqa._id } : reportTrack ? { specialTrack: reportTrack._id } : { halqa: halqaIds.join(",") };
  const { data: reportStudents = [] } = useStudents(reportFilter, { enabled: !!(reportFilter.halqa || reportFilter.specialTrack) });

  const gifted = students.filter((s) => s.progressPct >= GIFTED_THRESHOLD);

  function exportAttendance() {
    downloadCsv("تقرير حضور طلابي.csv", ["الطالب", "الحلقة", "نسبة الحضور"],
      students.map((s) => [s.name, getName(s.halqa), `${s.attendancePct}%`]));
  }
  function exportHifz() {
    downloadCsv("تقرير إنجاز الحفظ.csv", ["الطالب", "الحلقة", "الصفحات المنجزة", "إجمالي الصفحات", "النسبة"],
      students.map((s) => [s.name, getName(s.halqa), s.progressPages, s.totalPages, `${s.progressPct}%`]));
  }
  function exportGifted() {
    downloadCsv("تقرير الطلاب المتميزين.csv", ["الطالب", "الحلقة", "نسبة الإنجاز", "نسبة الحضور"],
      [...gifted].sort((a, b) => b.progressPct - a.progressPct)
        .map((s) => [s.name, getName(s.halqa), `${s.progressPct}%`, `${s.attendancePct}%`]));
  }

  const REPORTS = [
    {
      title: "تقرير الحضور", icon: "ti-calendar", color: "blue" as const,
      count: `${students.length} طالب`, onDownload: exportAttendance,
      loading, disabled: students.length === 0,
    },
    {
      title: "تقرير إنجاز الحفظ", icon: "ti-book", color: "" as const,
      count: `${students.length} طالب`, onDownload: exportHifz,
      loading, disabled: students.length === 0,
    },
    {
      title: "تقرير الطلاب المتميزين", icon: "ti-star", color: "gold" as const,
      count: `${gifted.length} طالب`, onDownload: exportGifted,
      loading, disabled: gifted.length === 0,
    },
  ];

  function exportAll() {
    if (students.length) { exportAttendance(); exportHifz(); }
    if (gifted.length) exportGifted();
  }

  useTopbar(
    "ti-chart-bar",
    "تقارير الطلاب",
    <button className="topbar-btn btn-primary" onClick={exportAll} disabled={loading || students.length === 0}>
      <i className="ti ti-download" /> تصدير الكل
    </button>,
  );

  return (
    <>
    <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
      {REPORTS.map((r) => (
        <div
          key={r.title}
          className="card"
          style={{ textAlign: "center", padding: 24, cursor: r.disabled ? "default" : "pointer", opacity: r.disabled ? 0.6 : 1 }}
          onClick={() => !r.disabled && !r.loading && r.onDownload()}
        >
          <i className={`ti ${r.icon}`} style={{ fontSize: 36, color: colorVar(r.color), marginBottom: 10, display: "block" }} />
          <div style={{ fontWeight: 700, fontSize: 13 }}>{r.title}</div>
          <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
            {r.loading ? "جارٍ التحميل..." : r.disabled ? "لا توجد بيانات بعد" : r.count}
          </div>
          <button
            className="topbar-btn btn-ghost"
            style={{ marginTop: 12 }}
            onClick={(e) => { e.stopPropagation(); r.onDownload(); }}
            disabled={r.loading || r.disabled}
          >
            <i className="ti ti-download" /> تحميل CSV
          </button>
        </div>
      ))}
    </div>

    <Card icon="ti-report-analytics" title="تقارير مفصّلة">
      <div className="form-group" style={{ marginBottom: 16, maxWidth: 320 }}>
        <label className="form-label">الحلقة أو المسار الاستثنائي</label>
        <select className="form-input" value={reportContext} onChange={(e) => setPickedContext(e.target.value)}>
          {halqaIds.length > 0 && <option value="">كل حلقاتي</option>}
          {halqat.length > 0 && (
            <optgroup label="الحلقات">
              {halqat.map((h) => <option key={h._id} value={`halqa:${h._id}`}>{h.name}</option>)}
            </optgroup>
          )}
          {tracks.length > 0 && (
            <optgroup label="المسارات الاستثنائية">
              {tracks.map((t) => <option key={t._id} value={`track:${t._id}`}>{t.title}</option>)}
            </optgroup>
          )}
        </select>
      </div>
      <StudentReportPanel
        students={reportStudents}
        aggregateFilter={reportFilter}
        aggregateTitle={reportHalqa ? `مقارنة طلاب ${reportHalqa.name}` : reportTrack ? `مقارنة طلاب ${reportTrack.title}` : "متوسط الدرجات لكل طلاب حلقاتي"}
      />
    </Card>
    </>
  );
}
