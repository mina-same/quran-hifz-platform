import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { useStudents } from "../../api/students";
import { useTracks } from "../../api/tracks";
import { SkeletonTable } from "../../components/common/Skeleton";

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
  const [filter, setFilter] = useState<string>("all"); // "all" | "track:<id>"

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

  const visibleRows = rows.filter((r) => {
    if (filter === "all") return true;
    return r.trackId === filter.slice(6);
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>تصفية الطلاب</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--surface)", color: "var(--text)", fontSize: 13,
              }}
            >
              <option value="all">كل الطلاب ({rows.length})</option>
              {myTracks.length > 0 && (
                <optgroup label="المسارات">
                  {myTracks.map((t) => (
                    <option key={t._id} value={`track:${t._id}`}>{t.title}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>المسار</th>
                  <th>ولي الأمر</th>
                  <th>التواصل</th>
                  <th>آخر حفظ</th>
                  <th>الدرس</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
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
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
