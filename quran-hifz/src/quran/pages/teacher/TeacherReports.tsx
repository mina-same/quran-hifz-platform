import { usePortal } from "../../context/PortalContext";
import { useHalqat } from "../../api/halqat";
import { useSpecialTracks } from "../../api/special-tracks";
import { ReportsDashboard } from "../../components/common/ReportsDashboard";

/** Teacher reports — scoped to the teacher's own halqat (and tracks they teach).
 *  No KPI/teacher scorecards (those are org-wide admin views). */
export function TeacherReports() {
  const { user } = usePortal();
  const { data: halqat = [] } = useHalqat({ teacher: user?.profileId });
  const { data: tracks = [] } = useSpecialTracks(undefined, user?.profileId as string | undefined);

  // baseFilter = all of this teacher's halqat students (empty string = no
  // students when they have none yet, which is handled by the empty state).
  const baseFilter =
    halqat.length > 0 ? { halqa: halqat.map((h) => h._id).join(",") } : { halqa: "__none__" };

  return (
    <ReportsDashboard
      topbarIcon="ti-chart-bar"
      topbarTitle="تقارير طلابي"
      baseFilter={baseFilter}
      halqat={halqat}
      tracks={tracks}
      scopeAllLabel="كل حلقاتي"
    />
  );
}
