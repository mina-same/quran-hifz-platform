import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { useStudents } from "../../api/students";
import { useHalqat } from "../../api/halqat";
import { useSpecialTracks, type EnrolledStudent } from "../../api/special-tracks";

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

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: active ? 700 : 400,
    background: active ? "var(--green)" : "transparent",
    color: active ? "white" : "var(--text2)",
    transition: "all .15s",
  });

  return (
    <Card>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
        <button style={TAB_STYLE(tab === "halqa")}  onClick={() => setTab("halqa")}>
          <i className="ti ti-school" style={{ marginLeft: 6 }} />
          طلاب الحلقة
        </button>
        <button style={TAB_STYLE(tab === "tracks")} onClick={() => setTab("tracks")}>
          <i className="ti ti-calendar-event" style={{ marginLeft: 6 }} />
          طلاب المسارات الاستثنائية
          {trackStudents.length > 0 && (
            <span style={{
              marginRight: 6, background: "rgba(255,255,255,0.3)",
              borderRadius: 99, padding: "1px 7px", fontSize: 11,
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
            <div className="page-loading"><i className="ti ti-loader-2" /> جارٍ التحميل...</div>
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
            <div className="page-loading"><i className="ti ti-loader-2" /> جارٍ التحميل...</div>
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
