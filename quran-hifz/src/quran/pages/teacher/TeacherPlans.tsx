import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";

type Row = [string, string, string, number, string];
const ROWS: Row[] = [
  ["عبدالله الحميداني", "ختم القرآن", "٢٠ جزءاً", 67, "في المسار"],
  ["يوسف الزهراني", "١٠ أجزاء", "٦ أجزاء", 60, "في المسار"],
  ["أحمد الشهري", "٥ أجزاء", "٢ جزء", 40, "يحتاج متابعة"],
  ["فارس العسيري", "١٥ جزءاً", "٤ أجزاء", 27, "يحتاج متابعة"],
];

export function TeacherPlans() {
  useTopbar(
    "ti-target",
    "الخطط الفردية",
    <button className="topbar-btn btn-primary">
      <i className="ti ti-plus" /> خطة جديدة
    </button>,
  );
  return (
    <Card>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>الطالب</th>
              <th>الهدف السنوي</th>
              <th>المنجز</th>
              <th>التقدم</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r[0]}>
                <td style={{ fontWeight: 600 }}>{r[0]}</td>
                <td>{r[1]}</td>
                <td>{r[2]}</td>
                <td style={{ minWidth: 110 }}>
                  <ProgressBar pct={r[3]} />
                  <span style={{ fontSize: 10, color: "var(--text2)" }}>{r[3]}٪</span>
                </td>
                <td>
                  <Badge tone={r[3] >= 50 ? "green" : "gold"}>{r[4]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
