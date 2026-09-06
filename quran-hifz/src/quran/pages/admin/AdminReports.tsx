import { useStudents } from "../../api/students";
import { useTeachers } from "../../api/teachers";
import { useKpis } from "../../api/kpis";
import { useTracks } from "../../api/tracks";
import { ReportsDashboard } from "../../components/common/ReportsDashboard";

/** Admin reports — full school cohort. KPIs + teachers are org-wide widgets
 *  surfaced in addition to the student analytics. */
export function AdminReports() {
  const { data: teachers = [] } = useTeachers();
  const { data: kpis = [] } = useKpis();
  const { data: tracks = [] } = useTracks();
  // Pre-warm the full students query so the StatsRow/KPIs render instantly
  // once the user lands — ReportsDashboard re-queries under the active scope.
  useStudents();

  return (
    <ReportsDashboard
      topbarIcon="ti-chart-bar"
      topbarTitle="التقارير والتحليلات"
      baseFilter={{}}
      tracks={tracks}
      kpis={kpis}
      teachers={teachers}
      showAdmin
      scopeAllLabel="كل طلاب المدرسة"
    />
  );
}
