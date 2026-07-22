import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { HalqaRow } from "../../components/common/HalqaRow";
import { useHalqat, type Halqa } from "../../api/halqat";
import { useStudents } from "../../api/students";
import { SkeletonTable } from "../../components/common/Skeleton";

function trackTitle(h: Halqa): string | null {
  const t = h.specialTrack;
  if (t && typeof t === "object") return t.title;
  return null;
}

export function TeacherHalqa() {
  useTopbar("ti-school", "حلقاتي");
  const { user } = usePortal();

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: user?.profileId });
  const halqaIds = halqat.map((h) => h._id);
  const { data: students = [], isLoading: loadingStudents } = useStudents(
    { halqa: halqaIds.join(",") },
    { enabled: !loadingHalqat && halqaIds.length > 0 },
  );

  const loading = loadingHalqat || loadingStudents;

  if (loading) return <SkeletonTable cols={4} rows={5} />;

  if (halqat.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text3)", fontSize: 13 }}>
          <i className="ti ti-school-off" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
          لا توجد حلقة مسندة لهذا المعلم
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {halqat.map((h) => {
        const roster = students.filter((s) => {
          const sh = s.halqa;
          const id = sh && typeof sh === "object" ? sh._id : sh;
          return id === h._id;
        });
        const track = trackTitle(h);

        return (
          <Card
            key={h._id}
            icon="ti-school"
            title={h.name}
            headerExtra={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {track && <Badge tone="green">{track}</Badge>}
                <Badge tone="gray">{roster.length} طالب</Badge>
              </div>
            }
          >
            <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
              <HalqaRow label="الأيام" value={h.days} />
              <HalqaRow label="الوقت" value={h.time} />
              <HalqaRow label="السعة" value={`${roster.length} / ${h.capacity}`} />
            </div>

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>المستوى</th>
                    <th>نسبة الحضور</th>
                    <th>نسبة التقدم</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{typeof s.level === "number" ? s.level : "—"}</td>
                      <td>{s.attendancePct}%</td>
                      <td>{s.progressPct}%</td>
                    </tr>
                  ))}
                  {roster.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                        لا يوجد طلاب في هذه الحلقة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
