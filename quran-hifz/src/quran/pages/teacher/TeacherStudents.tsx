import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { useStudents } from "../../api/students";
import { useHalqat } from "../../api/halqat";

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

export function TeacherStudents() {
  const { user } = usePortal();
  const { data: halqat = [] } = useHalqat({ teacher: user?.profileId });
  // Use first halqa's students; teacher can expand later
  const firstHalqaId = halqat[0]?._id;
  const { data: students = [], isLoading } = useStudents({ halqa: firstHalqaId });

  useTopbar("ti-users", "طلابي");

  return (
    <Card>
      {isLoading && (
        <div className="page-loading">
          <i className="ti ti-loader-2" /> جارٍ التحميل...
        </div>
      )}
      {!isLoading && (
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
    </Card>
  );
}
