import { useTopbar } from "../../context/useTopbar";

type Report = [string, string, "" | "gold" | "blue"];
const REPORTS: Report[] = [
  ["تقرير الحضور الشهري", "ti-calendar", "blue"],
  ["تقرير إنجاز الحفظ", "ti-book", ""],
  ["تقرير مؤشرات الأداء", "ti-target", "gold"],
  ["تقرير المعلمين", "ti-chalkboard", ""],
  ["تقرير الطلاب الموهوبين", "ti-star", "gold"],
  ["تقرير مالي للمجلس", "ti-report-money", "blue"],
];

function colorVar(c: Report[2]) {
  if (c === "gold") return "var(--gold)";
  if (c === "blue") return "var(--text2)";
  return "var(--green)";
}

export function AdminReports() {
  useTopbar(
    "ti-chart-bar",
    "التقارير",
    <button className="topbar-btn btn-primary">
      <i className="ti ti-download" /> تصدير PDF
    </button>,
  );
  return (
    <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
      {REPORTS.map((r) => (
        <div
          key={r[0]}
          className="card"
          style={{ textAlign: "center", cursor: "pointer", padding: 24 }}
        >
          <i
            className={`ti ${r[1]}`}
            style={{ fontSize: 36, color: colorVar(r[2]), marginBottom: 10, display: "block" }}
          />
          <div style={{ fontWeight: 700, fontSize: 13 }}>{r[0]}</div>
          <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
            آخر تحديث: هذا الشهر
          </div>
          <button className="topbar-btn btn-ghost" style={{ marginTop: 12 }}>
            <i className="ti ti-download" /> تحميل
          </button>
        </div>
      ))}
    </div>
  );
}
