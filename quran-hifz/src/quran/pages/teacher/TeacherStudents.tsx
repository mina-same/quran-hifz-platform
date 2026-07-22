import { useState } from "react";
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
function getId(v: unknown): string {
  if (v && typeof v === "object" && "_id" in v) return (v as { _id: string })._id;
  return typeof v === "string" ? v : "";
}
function getEnrolledName(v: EnrolledStudent | string): string {
  return typeof v === "object" ? v.name : v;
}
function getEnrolledId(v: EnrolledStudent | string): string {
  return typeof v === "object" ? v._id : v;
}

type Row = {
  id: string;
  name: string;
  halqaId: string | null;
  halqaName: string;
  guardian: string;
  guardianPhone: string;
  lastMemorization: string;
  homeworkStatus: string | null;
  tracks: string[];
};

export function TeacherStudents() {
  const { user } = usePortal();
  const [filter, setFilter] = useState<string>("all"); // "all" | "halqa:<id>" | "track:<id>"

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: user?.profileId });
  const halqaIds = halqat.map((h) => h._id);
  const { data: students = [], isLoading: loadingStudents } = useStudents(
    { halqa: halqaIds.join(",") },
    { enabled: !loadingHalqat && halqaIds.length > 0 },
  );

  const { data: myTracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, user?.profileId as string | undefined);

  // Map halqaId -> track title, for students enrolled via their halqa (not directly)
  const halqaTrackMap = new Map<string, string>();
  for (const h of halqat) {
    const t = h.specialTrack;
    if (t && typeof t === "object") halqaTrackMap.set(h._id, t.title);
  }

  // Map studentId -> track titles they're enrolled in (across teacher's tracks)
  const studentTracksMap = new Map<string, string[]>();
  for (const track of myTracks) {
    for (const s of track.enrolledStudents) {
      const id = getEnrolledId(s);
      if (!studentTracksMap.has(id)) studentTracksMap.set(id, []);
      studentTracksMap.get(id)!.push(track.title);
    }
  }

  const studentIds = new Set(students.map((s) => s._id));

  const rows: Row[] = [
    ...students.map((s) => {
      const halqaId = getId(s.halqa) || null;
      const inheritedTrack = halqaId ? halqaTrackMap.get(halqaId) : undefined;
      const tracks = studentTracksMap.get(s._id) ?? [];
      return {
        id: s._id,
        name: s.name,
        halqaId,
        halqaName: getName(s.halqa),
        guardian: s.guardian || "—",
        guardianPhone: s.guardianPhone || "—",
        lastMemorization: s.lastMemorization || "—",
        homeworkStatus: s.homeworkStatus,
        tracks: inheritedTrack && !tracks.includes(inheritedTrack) ? [...tracks, inheritedTrack] : tracks,
      };
    }),
    // students enrolled only in a special track (not in teacher's halqa)
    ...Array.from(studentTracksMap.entries())
      .filter(([id]) => !studentIds.has(id))
      .map(([id, tracks]) => {
        const enrolled = myTracks
          .flatMap((t) => t.enrolledStudents)
          .find((s) => getEnrolledId(s) === id);
        return {
          id,
          name: enrolled ? getEnrolledName(enrolled) : "",
          halqaId: null,
          halqaName: "—",
          guardian: "—",
          guardianPhone: "—",
          lastMemorization: "—",
          homeworkStatus: null,
          tracks,
        };
      }),
  ];

  const trackTitleFilter = filter.startsWith("track:")
    ? myTracks.find((t) => t._id === filter.slice(6))?.title
    : undefined;

  const visibleRows = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter.startsWith("halqa:")) return r.halqaId === filter.slice(6);
    if (trackTitleFilter) return r.tracks.includes(trackTitleFilter);
    return true;
  });

  useTopbar("ti-users", "طلابي");

  const loading = loadingHalqat || loadingStudents || loadingTracks;
  const hasAny = halqaIds.length > 0 || myTracks.length > 0;

  return (
    <Card>
      {!loading && !hasAny && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text3)", fontSize: 13 }}>
          <i className="ti ti-school-off" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
          لا توجد حلقة أو مسارات مسندة لهذا المعلم
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
              {halqat.length > 0 && (
                <optgroup label="الحلقات">
                  {halqat.map((h) => (
                    <option key={h._id} value={`halqa:${h._id}`}>{h.name}</option>
                  ))}
                </optgroup>
              )}
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
                  <th>الحلقة</th>
                  <th>المسارات</th>
                  <th>ولي الأمر</th>
                  <th>رقم ولي الأمر</th>
                  <th>آخر حفظ</th>
                  <th>الدرس</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.halqaName}</td>
                    <td>
                      {r.tracks.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {r.tracks.map((title) => (
                            <Badge key={title} tone="green">{title}</Badge>
                          ))}
                        </div>
                      ) : "—"}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.guardian}</td>
                    <td style={{ fontSize: 12, color: "var(--text2)", direction: "ltr", textAlign: "right" }}>{r.guardianPhone}</td>
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
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
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
