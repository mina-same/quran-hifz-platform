import { useStudents } from "../../api/students";
import { useTeachers } from "../../api/teachers";
import { useKpis } from "../../api/kpis";
import { useHalqat } from "../../api/halqat";
import { useSpecialTracks } from "../../api/special-tracks";
import { ReportsAnalytics } from "../../components/common/ReportsAnalytics";

/** Admin reports — full school cohort. KPIs + teachers are org-wide widgets
 *  surfaced in addition to the student analytics. */
export function AdminReports() {
  const { data: teachers = [] } = useTeachers();
  const { data: kpis = [] } = useKpis();
  const { data: halqat = [] } = useHalqat();
  const { data: tracks = [] } = useSpecialTracks();
  // Pre-warm the full students query so the StatsRow/KPIs render instantly
  // once the user lands — ReportsAnalytics re-queries under the active scope.
  useStudents();

  return (
    <ReportsAnalytics
      topbarIcon="ti-chart-bar"
      topbarTitle="التقارير والتحليلات"
      baseFilter={{}}
      halqat={halqat}
      tracks={tracks}
      kpis={kpis}
      teachers={teachers}
      showAdmin
      scopeAllLabel="كل طلاب المدرسة"
    />
  );
}
