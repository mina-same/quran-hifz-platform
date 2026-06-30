import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { useKpis } from "../../api/kpis";

const RATING_TONE: Record<string, BadgeTone> = {
  ممتاز: "green",
  جيد: "blue",
  مقبول: "gold",
  ضعيف: "red",
};

export function AdminKpis() {
  const { data: kpis = [], isLoading, error } = useKpis();

  useTopbar(
    "ti-target",
    "مؤشرات الأداء",
    <button className="topbar-btn btn-ghost">
      <i className="ti ti-download" /> تصدير
    </button>,
  );

  return (
    <Card icon="ti-target" title="المؤشرات السنوية">
      {isLoading && (
        <div className="page-loading">
          <i className="ti ti-loader-2" /> جارٍ التحميل...
        </div>
      )}
      {error && (
        <div style={{ color: "var(--red, #c0392b)", padding: 12, fontSize: 13 }}>
          تعذّر تحميل المؤشرات
        </div>
      )}
      {!isLoading && !error && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>المؤشر</th>
                <th>المستهدف</th>
                <th>الفعلي</th>
                <th>الفترة</th>
                <th>التقييم</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr key={k._id}>
                  <td>{k.indicator}</td>
                  <td style={{ color: "var(--text2)" }}>{k.target}</td>
                  <td style={{ fontWeight: 700, color: "var(--green)" }}>{k.actual}</td>
                  <td style={{ fontSize: 12, color: "var(--text3)" }}>{k.period}</td>
                  <td>
                    <Badge tone={RATING_TONE[k.rating] ?? "blue"}>{k.rating}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
