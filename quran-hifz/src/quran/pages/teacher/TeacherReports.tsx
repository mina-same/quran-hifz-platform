import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { useHalqat } from "../../api/halqat";
import { useStudents } from "../../api/students";
import { downloadCsv } from "../../../lib/csv";

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
  const halqaIds = halqat.map((h) => h._id);
  const { data: students = [], isLoading: studentsLoading } = useStudents(
    { halqa: halqaIds.join(",") },
    { enabled: !halqatLoading && halqaIds.length > 0 },
  );
  const loading = halqatLoading || studentsLoading;

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
    <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
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
  );
}
