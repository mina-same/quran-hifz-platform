import { usePortal } from "../../context/PortalContext";
import { useTracks } from "../../api/tracks";
import { ReportsDashboard } from "../../components/common/ReportsDashboard";

/** Teacher reports — scoped to the tracks the teacher teaches.
 *  No KPI/teacher scorecards (those are org-wide admin views). */
export function TeacherReports() {
  const { user } = usePortal();
  const { data: tracks = [] } = useTracks(undefined, user?.profileId as string | undefined);

  // baseFilter = all of this teacher's track students (empty string = no
  // students when they have none yet, which is handled by the empty state).
  const baseFilter =
    tracks.length > 0 ? { track: tracks.map((t) => t._id).join(",") } : { track: "__none__" };

  return (
    <ReportsDashboard
      topbarIcon="ti-chart-bar"
      topbarTitle="تقارير طلابي"
      baseFilter={baseFilter}
      tracks={tracks}
      scopeAllLabel="كل مساراتي"
    />
  );
}
