import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { useHomework } from "../../api/homework";
import { useGradeHomework } from "../../api/homework";

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "";
}

const STATUS_TONE: Record<string, BadgeTone> = {
  مراجع: "green",
  معلق: "gold",
  متأخر: "red",
};

export function TeacherHomework() {
  const { user } = usePortal();
  const { data: homework = [], isLoading } = useHomework({ teacher: user?.profileId });
  const gradeHW = useGradeHomework();

  useTopbar("ti-microphone", "مراجعة الواجبات الصوتية");

  return (
    <>
      <Alert tone="info">
        يمكنك تقييم الواجبات المعلقة مباشرة من الجدول أدناه.
      </Alert>
      <Card>
        {isLoading && (
          <SkeletonTable cols={6} rows={5} />
        )}
        {!isLoading && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>نوع الواجب</th>
                  <th>المقطع</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>الحالة</th>
                  <th>التقييم</th>
                </tr>
              </thead>
              <tbody>
                {homework.map((hw) => (
                  <tr key={hw._id}>
                    <td style={{ fontWeight: 600 }}>{getName(hw.student)}</td>
                    <td>
                      <Badge tone="blue">{hw.type}</Badge>
                    </td>
                    <td style={{ fontSize: 12 }}>{hw.segment}</td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>
                      {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString("ar-SA") : "—"}
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[hw.status] ?? "gray"}>{hw.status}</Badge>
                    </td>
                    <td>
                      <select
                        className="form-input"
                        style={{ padding: "4px 8px", fontSize: 11, width: 120 }}
                        value={hw.rating ?? ""}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          gradeHW.mutate({ id: hw._id, rating: e.target.value, status: "مراجع" });
                        }}
                      >
                        <option value="">اختر التقييم</option>
                        <option value="ممتاز">ممتاز</option>
                        <option value="جيد جداً">جيد جداً</option>
                        <option value="جيد">جيد</option>
                        <option value="مقبول">مقبول</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {homework.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا توجد واجبات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
