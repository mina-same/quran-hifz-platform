import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { useKpis } from "../../api/kpis";
import { downloadCsv } from "../../../lib/csv";

const RATING_TONE: Record<string, BadgeTone> = {
  ممتاز: "green",
  جيد: "green",
  مقبول: "gold",
  ضعيف: "red",
};

const RATING_LABEL: Record<string, string> = {
  ممتاز: "محقق",
  جيد: "محقق",
  مقبول: "قريب من الهدف",
  ضعيف: "دون الهدف",
};

export function AdminKpis() {
  const { data: kpis = [], isLoading, error } = useKpis();

  function exportCsv() {
    downloadCsv("تقرير مؤشرات الأداء.csv", ["المؤشر", "المستهدف", "الفعلي", "التقييم"],
      kpis.map((k) => [k.indicator, k.target, k.actual, RATING_LABEL[k.rating] ?? k.rating]));
  }

  useTopbar(
    "ti-target",
    "مؤشرات الأداء",
    <button className="topbar-btn btn-ghost" onClick={exportCsv} disabled={kpis.length === 0}>
      <i className="ti ti-download" /> تصدير
    </button>,
  );

  return (
    <Card icon="ti-target" title="المؤشرات السنوية">
      {isLoading && <SkeletonTable cols={4} rows={5} />}
      {error && (
        <div style={{ color: "var(--red, #c0392b)", padding: 12, fontSize: 13 }}>
          تعذّر تحميل المؤشرات
        </div>
      )}
      {!isLoading && !error && kpis.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)", fontSize: 14 }}>
          <i className="ti ti-target" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
          لا توجد مؤشرات أداء مسجلة بعد
        </div>
      )}
      {!isLoading && !error && kpis.length > 0 && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>المؤشر</th>
                <th>المستهدف</th>
                <th>الفعلي</th>
                <th>التقييم</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr key={k._id}>
                  <td>{k.indicator}</td>
                  <td style={{ color: "var(--text2)" }}>{k.target}</td>
                  <td style={{ fontWeight: 700, color: "var(--green)" }}>{k.actual}</td>
                  <td>
                    <Badge tone={RATING_TONE[k.rating] ?? "green"}>{RATING_LABEL[k.rating] ?? "محقق"}</Badge>
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
