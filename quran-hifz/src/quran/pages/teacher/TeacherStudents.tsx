import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { useStudents } from "../../api/students";
import { useTracks } from "../../api/tracks";
import { SkeletonTable } from "../../components/common/Skeleton";
import { Pagination } from "../../components/common/Pagination";
import { SortTh, TableToolbar, TableFilter } from "../../components/common/TableTools";
import { useTableControls } from "../../lib/useTableControls";

const HW_TONE: Record<string, BadgeTone> = {
  submitted: "green",
  pending: "gold",
  late: "red",
};
const HW_LABEL: Record<string, string> = {
  submitted: "سُجِّل",
  pending: "لم يُسجَّل",
  late: "لم يُسجَّل",
};

type Row = {
  id: string;
  name: string;
  trackId: string | null;
  trackName: string;
  guardian: string;
  guardianContact: string;
  lastMemorization: string;
  homeworkStatus: string | null;
};

export function TeacherStudents() {
  const { user } = usePortal();

  const { data: myTracks = [], isLoading: loadingTracks } = useTracks(undefined, user?.profileId as string | undefined);
  const trackIds = myTracks.map((t) => t._id);
  const { data: students = [], isLoading: loadingStudents } = useStudents(
    { track: trackIds.join(",") },
    { enabled: !loadingTracks && trackIds.length > 0 },
  );

  const rows: Row[] = students.map((s) => {
    const trackId = typeof s.track === "object" ? s.track._id : s.track;
    return {
      id: s._id,
      name: s.name,
      trackId: trackId || null,
      trackName: typeof s.track === "object" ? s.track.title : "",
      guardian: s.parentName || s.guardian || "—",
      guardianContact: s.parentEmail || s.guardianPhone || "—",
      lastMemorization: s.lastMemorization || "—",
      homeworkStatus: s.homeworkStatus,
    };
  });

  const t = useTableControls(rows, {
    search: (r) => [r.name, r.trackName, r.guardian, r.guardianContact, r.lastMemorization],
    sorters: {
      name: (r) => r.name,
      track: (r) => r.trackName,
      guardian: (r) => (r.guardian === "—" ? "" : r.guardian),
      contact: (r) => (r.guardianContact === "—" ? "" : r.guardianContact),
      last: (r) => (r.lastMemorization === "—" ? "" : r.lastMemorization),
      homework: (r) => (r.homeworkStatus ? (r.homeworkStatus === "submitted" ? 0 : 1) : null),
    },
    filters: {
      track: (r, v) => r.trackId === v,
      homework: (r, v) =>
        v === "submitted" ? r.homeworkStatus === "submitted"
        : v === "none" ? !r.homeworkStatus
        : !!r.homeworkStatus && r.homeworkStatus !== "submitted",
    },
  });

  useTopbar("ti-users", "طلابي");

  const loading = loadingTracks || loadingStudents;
  const hasAny = myTracks.length > 0;

  return (
    <Card>
      {!loading && !hasAny && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text3)", fontSize: 13 }}>
          <i className="ti ti-school-off" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
          لا توجد مسارات مسندة لهذا المعلم
        </div>
      )}

      {loading && <SkeletonTable cols={7} rows={5} />}

      {!loading && hasAny && (
        <>
          <TableToolbar
            t={t}
            placeholder="البحث باسم الطالب أو المسار أو ولي الأمر..."
            noun="طالب"
            sortOptions={[
              { key: "name", label: "الطالب" },
              { key: "track", label: "المسار" },
              { key: "guardian", label: "ولي الأمر" },
              { key: "last", label: "آخر حفظ" },
              { key: "homework", label: "الدرس" },
            ]}
          >
            <TableFilter
              t={t}
              k="track"
              label="كل المسارات"
              options={myTracks.map((tr) => ({ value: tr._id, label: tr.title }))}
            />
            <TableFilter
              t={t}
              k="homework"
              label="الدرس: الكل"
              options={[
                { value: "submitted", label: "سُجِّل" },
                { value: "pending", label: "لم يُسجَّل" },
                { value: "none", label: "بدون درس" },
              ]}
            />
          </TableToolbar>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <SortTh t={t} k="name">الطالب</SortTh>
                  <SortTh t={t} k="track">المسار</SortTh>
                  <SortTh t={t} k="guardian">ولي الأمر</SortTh>
                  <SortTh t={t} k="contact">التواصل</SortTh>
                  <SortTh t={t} k="last">آخر حفظ</SortTh>
                  <SortTh t={t} k="homework">الدرس</SortTh>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {t.pageRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.trackName ? <Badge tone="green">{r.trackName}</Badge> : "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.guardian}</td>
                    <td style={{ fontSize: 12, color: "var(--text2)", direction: "ltr", textAlign: "right" }}>{r.guardianContact}</td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.lastMemorization}</td>
                    <td>
                      {r.homeworkStatus ? (
                        <Badge tone={HW_TONE[r.homeworkStatus] ?? "gold"}>
                          {HW_LABEL[r.homeworkStatus] ?? "لم يُسجَّل"}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td>
                      <button className="topbar-btn btn-primary" style={{ fontSize: 11, padding: "5px 10px" }}>
                        <i className="ti ti-microphone" /> سجّل
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
                {rows.length > 0 && t.total === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا توجد نتائج مطابقة لبحثك
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="tbl-pager">
            <Pagination page={t.page} pageSize={t.pageSize} total={t.total} onChange={t.setPage} />
          </div>
        </>
      )}
    </Card>
  );
}
