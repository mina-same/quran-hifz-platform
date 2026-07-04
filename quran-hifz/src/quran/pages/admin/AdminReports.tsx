import { useTopbar } from "../../context/useTopbar";
import { useStudents } from "../../api/students";
import { useTeachers } from "../../api/teachers";
import { useKpis } from "../../api/kpis";
import { downloadCsv } from "../../../lib/csv";

const GIFTED_THRESHOLD = 85;

const KPI_RATING_LABEL: Record<string, string> = {
  ممتاز: "محقق",
  جيد: "محقق",
  مقبول: "قريب من الهدف",
  ضعيف: "دون الهدف",
};

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return typeof v === "string" ? v : "";
}

function colorVar(c: "" | "gold" | "blue") {
  if (c === "gold") return "var(--gold)";
  if (c === "blue") return "var(--text2)";
  return "var(--green)";
}

export function AdminReports() {
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { data: teachers = [], isLoading: teachersLoading } = useTeachers();
  const { data: kpis = [], isLoading: kpisLoading } = useKpis();

  const gifted = students.filter((s) => s.progressPct >= GIFTED_THRESHOLD);

  function exportAttendance() {
    downloadCsv("تقرير الحضور الشهري.csv", ["الطالب", "الحلقة", "نسبة الحضور"],
      students.map((s) => [s.name, getName(s.halqa), `${s.attendancePct}%`]));
  }
  function exportHifz() {
    downloadCsv("تقرير إنجاز الحفظ.csv", ["الطالب", "الحلقة", "الصفحات المنجزة", "إجمالي الصفحات", "النسبة"],
      students.map((s) => [s.name, getName(s.halqa), s.progressPages, s.totalPages, `${s.progressPct}%`]));
  }
  function exportKpis() {
    downloadCsv("تقرير مؤشرات الأداء.csv", ["المؤشر", "المستهدف", "الفعلي", "التقييم"],
      kpis.map((k) => [k.indicator, k.target, k.actual, KPI_RATING_LABEL[k.rating] ?? k.rating]));
  }
  function exportTeachers() {
    downloadCsv("تقرير المعلمين.csv", ["الاسم", "التخصص", "الهاتف", "التقييم", "عدد الحلقات", "عدد الطلاب"],
      teachers.map((t) => [t.name, t.specialty, t.phone, t.rating, t.halqatCount ?? 0, t.studentCount ?? 0]));
  }
  function exportGifted() {
    downloadCsv("تقرير الطلاب الموهوبين.csv", ["الطالب", "الحلقة", "نسبة الإنجاز", "نسبة الحضور"],
      [...gifted].sort((a, b) => b.progressPct - a.progressPct)
        .map((s) => [s.name, getName(s.halqa), `${s.progressPct}%`, `${s.attendancePct}%`]));
  }

  const REPORTS = [
    {
      title: "تقرير الحضور الشهري", icon: "ti-calendar", color: "blue" as const,
      count: `${students.length} طالب`, onDownload: exportAttendance,
      loading: studentsLoading, disabled: students.length === 0,
    },
    {
      title: "تقرير إنجاز الحفظ", icon: "ti-book", color: "" as const,
      count: `${students.length} طالب`, onDownload: exportHifz,
      loading: studentsLoading, disabled: students.length === 0,
    },
    {
      title: "تقرير مؤشرات الأداء", icon: "ti-target", color: "gold" as const,
      count: `${kpis.length} مؤشر`, onDownload: exportKpis,
      loading: kpisLoading, disabled: kpis.length === 0,
    },
    {
      title: "تقرير المعلمين", icon: "ti-chalkboard", color: "" as const,
      count: `${teachers.length} معلم`, onDownload: exportTeachers,
      loading: teachersLoading, disabled: teachers.length === 0,
    },
    {
      title: "تقرير الطلاب الموهوبين", icon: "ti-star", color: "gold" as const,
      count: `${gifted.length} طالب`, onDownload: exportGifted,
      loading: studentsLoading, disabled: gifted.length === 0,
    },
  ];

  function exportAll() {
    if (students.length) { exportAttendance(); exportHifz(); }
    if (kpis.length) exportKpis();
    if (teachers.length) exportTeachers();
    if (gifted.length) exportGifted();
  }

  useTopbar(
    "ti-chart-bar",
    "التقارير",
    <button className="topbar-btn btn-primary" onClick={exportAll}>
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

      {/* لا يوجد نظام مالي في المنصة بعد، فلا يمكن ربط هذا التقرير ببيانات حقيقية */}
      <div className="card" style={{ textAlign: "center", padding: 24, opacity: 0.6 }}>
        <i className="ti ti-report-money" style={{ fontSize: 36, color: "var(--text2)", marginBottom: 10, display: "block" }} />
        <div style={{ fontWeight: 700, fontSize: 13 }}>تقرير مالي للمجلس</div>
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>قريباً</div>
      </div>
    </div>
  );
}
