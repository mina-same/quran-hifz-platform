import { useState } from "react";
import { useAssignStudent, type Track } from "../../api/tracks";
import { useStudents } from "../../api/students";

function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
}
const AVATAR_COLORS = [
  { bg: "var(--green-pale)", fg: "var(--green)" },
  { bg: "var(--gold-pale)",  fg: "#92400e" },
  { bg: "#eff6ff",           fg: "#1d4ed8" },
  { bg: "#fde8f0",           fg: "#9d174d" },
];

/** Track roster management — transfer-only, since a student's track is
 * exclusive: shows who's currently on the track (a live query, not a stored
 * array) and offers "نقل طالب" (moves a student's `track` field here), never
 * "add" alongside an existing track. Self-contained (fetches its own students
 * list and owns its own picker/search state) so it can be embedded both in
 * the quick roster modal and the full track form page. */
export function TrackStudentsPanel({ track }: { track: Track }) {
  const { data: allStudents = [] } = useStudents();
  const assignStudent = useAssignStudent();
  const [addStudentId, setAddStudentId] = useState("");
  const [studentsSearch, setStudentsSearch] = useState("");

  const enrolledStudents = allStudents.filter((s) => {
    const tId = typeof s.track === "object" ? s.track._id : s.track;
    return tId === track._id;
  });
  const enrolledCnt = enrolledStudents.length;
  const capPct = Math.min(100, Math.round((enrolledCnt / track.maxStudents) * 100));
  const barClr = capPct >= 90 ? "#ef4444" : capPct >= 70 ? "#f59e0b" : "var(--green)";
  const isFull = enrolledCnt >= track.maxStudents;
  const available = allStudents.filter((s) => {
    const tId = typeof s.track === "object" ? s.track._id : s.track;
    return tId !== track._id && (!studentsSearch.trim() || s.name.includes(studentsSearch.trim()));
  });

  return (
    <>
      <div style={{ background: "var(--cream)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>
            <i className="ti ti-user-check" style={{ marginLeft: 4 }} />طاقة المسار
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: barClr }}>{enrolledCnt} / {track.maxStudents}</span>
        </div>
        <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${capPct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
        </div>
        {isFull && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#ef4444", fontWeight: 600 }}><i className="ti ti-alert-circle" style={{ marginLeft: 4 }} />وصل المسار للحد الأقصى</p>}
      </div>

      {!isFull && (
        <div style={{ border: "1.5px dashed var(--border2)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
            <i className="ti ti-user-plus" style={{ marginLeft: 5, color: "var(--green)" }} />نقل طالب إلى هذا المسار
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <select className="form-input" style={{ flex: 1, fontSize: 13 }} value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)}>
              <option value="">— اختر طالباً —</option>
              {available.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <button
              className="topbar-btn btn-primary"
              style={{ padding: "0 16px", whiteSpace: "nowrap", fontSize: 13 }}
              disabled={!addStudentId || assignStudent.isPending}
              onClick={async () => {
                if (!addStudentId) return;
                await assignStudent.mutateAsync({ id: track._id, studentId: addStudentId });
                setAddStudentId("");
              }}
            >
              {assignStudent.isPending
                ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} />
                : <><i className="ti ti-plus" /> نقل</>}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>الطلاب المسجّلون</span>
        {enrolledCnt > 0 && (
          <input className="form-input" style={{ width: 140, fontSize: 12, padding: "5px 10px" }} placeholder="بحث..." value={studentsSearch} onChange={(e) => setStudentsSearch(e.target.value)} />
        )}
      </div>

      {enrolledCnt === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", background: "var(--cream)", borderRadius: 10 }}>
          <i className="ti ti-user-off" style={{ fontSize: 28, color: "var(--text3)", display: "block", marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: 13, color: "var(--text3)" }}>لا يوجد طلاب مسجّلون بعد</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {enrolledStudents
            .filter((s) => !studentsSearch.trim() || s.name.includes(studentsSearch.trim()))
            .map((s, idx) => {
              const c = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              return (
                <div key={s._id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px", background: "var(--cream)", borderRadius: 10,
                  border: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: c.bg, color: c.fg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>{avatarInitials(s.name)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>#{idx + 1}</div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--text3)" }}>
        <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
        لإزالة طالب من المسار، انقله إلى مسار آخر من صفحة إدارة الطلاب.
      </p>
    </>
  );
}
