import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";

export function TeacherReports() {
  useTopbar(
    "ti-chart-bar",
    "تقارير الطلاب",
    <button className="topbar-btn btn-ghost">
      <i className="ti ti-download" /> تصدير
    </button>,
  );
  return (
    <Card>
      <p style={{ color: "var(--text2)", textAlign: "center", padding: 40, fontSize: 14 }}>
        <i
          className="ti ti-chart-bar"
          style={{ fontSize: 40, display: "block", marginBottom: 10, color: "var(--green-pale)" }}
        />
        التقارير التفصيلية لحلقاتك ستظهر هنا
      </p>
    </Card>
  );
}
