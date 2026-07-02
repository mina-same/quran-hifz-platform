import { useState, type CSSProperties } from "react";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { useStudents } from "../../api/students";
import { useHalqat } from "../../api/halqat";
import { useSpecialTracks, type EnrolledStudent } from "../../api/special-tracks";
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

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "";
}
function getEnrolledName(v: EnrolledStudent | string): string {
  return typeof v === "object" ? v.name : v;
}
function getEnrolledId(v: EnrolledStudent | string): string {
  return typeof v === "object" ? v._id : v;
}

export function TeacherStudents() {
  const { user } = usePortal();
  const [tab, setTab] = useState<"halqa" | "tracks">("halqa");

  const { data: halqat = [] } = useHalqat({ teacher: user?.profileId });
  const firstHalqaId = halqat[0]?._id;
  const { data: students = [], isLoading: loadingStudents } = useStudents({ halqa: firstHalqaId });

  const { data: myTracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, user?.profileId as string | undefined);

  // Aggregate unique enrolled students across all teacher's tracks
  const trackStudentsMap = new Map<string, { name: string; tracks: string[] }>();
  for (const track of myTracks) {
    for (const s of track.enrolledStudents) {
      const id = getEnrolledId(s);
      const name = getEnrolledName(s);
      if (!trackStudentsMap.has(id)) {
        trackStudentsMap.set(id, { name, tracks: [] });
      }
      trackStudentsMap.get(id)!.tracks.push(track.title);
    }
  }
  const trackStudents = Array.from(trackStudentsMap.entries()).map(([id, v]) => ({ id, ...v }));

  useTopbar("ti-users", "طلابي");

  const TAB_BTN = (active: boolean): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 16px",
    border: "none", borderBottom: `2.5px solid ${active ? "var(--green)" : "transparent"}`,
    cursor: "pointer", background: "transparent",
    fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? "var(--green)" : "var(--text2)",
    transition: "all .18s",
    marginBottom: -1,
  });

  return (
    <Card>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        <button style={TAB_BTN(tab === "halqa")} onClick={() => setTab("halqa")}>
          <i className="ti ti-school" />
          طلاب الحلقة
        </button>
        <button style={TAB_BTN(tab === "tracks")} onClick={() => setTab("tracks")}>
          <i className="ti ti-star" />
          المسارات الاستثنائية
          {trackStudents.length > 0 && (
            <span style={{
              background: tab === "tracks" ? "var(--green)" : "var(--border2)",
              color: tab === "tracks" ? "#fff" : "var(--text2)",
              borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 700,
              transition: "all .18s",
            }}>
              {trackStudents.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Halqa Students Tab ── */}
      {tab === "halqa" && (
        <>
          {loadingStudents && (
            <SkeletonTable cols={6} rows={5} />
          )}
          {!loadingStudents && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الحلقة</th>
                    <th>آخر حفظ</th>
                    <th>الواجب القادم</th>
                    <th>الدرس</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{getName(s.halqa)}</td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>{s.lastMemorization || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>—</td>
                      <td>
                        <Badge tone={HW_TONE[s.homeworkStatus] ?? "gold"}>
                          {HW_LABEL[s.homeworkStatus] ?? "لم يُسجَّل"}
                        </Badge>
                      </td>
                      <td>
                        <button className="topbar-btn btn-primary" style={{ fontSize: 11, padding: "5px 10px" }}>
                          <i className="ti ti-microphone" /> سجّل
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                        لا توجد بيانات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Special Track Students Tab ── */}
      {tab === "tracks" && (
        <>
          {loadingTracks && (
            <SkeletonTable cols={3} rows={5} />
          )}
          {!loadingTracks && trackStudents.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text3)", fontSize: 13 }}>
              <i className="ti ti-calendar-off" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
              لا يوجد طلاب في مساراتك الاستثنائية
            </div>
          )}
          {!loadingTracks && trackStudents.length > 0 && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الطالب</th>
                    <th>المسارات المسجّل فيها</th>
                  </tr>
                </thead>
                <tbody>
                  {trackStudents.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--text3)", fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {s.tracks.map((title) => (
                            <Badge key={title} tone="green">{title}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
