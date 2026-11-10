import { useTopbar } from "../../context/useTopbar";
import { PromoReportSection } from "../../components/common/PromoReportSection";

/** Admin / supervisor reports — the page IS «تقرير الإنجاز والتميّز»: section +
 *  period filters, the report pages at full size, and the PDF download. */
export function AdminReports() {
  useTopbar("ti-chart-bar", "التقارير");
  return <PromoReportSection />;
}
