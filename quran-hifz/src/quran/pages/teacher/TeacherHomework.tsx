import { toast } from "sonner";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { useHomework } from "../../api/homework";
import { useGradeHomework } from "../../api/homework";
import { AR_LOCALE } from "@/lib/format";
import { Pagination } from "../../components/common/Pagination";
import { SortTh, TableToolbar, TableFilter } from "../../components/common/TableTools";
import { useTableControls } from "../../lib/useTableControls";

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

  const t = useTableControls(homework, {
    search: (hw) => [getName(hw.student), hw.type, hw.segment, hw.status, hw.rating],
    sorters: {
      student: (hw) => getName(hw.student),
      type: (hw) => hw.type,
      segment: (hw) => hw.segment,
      due: (hw) => (hw.dueDate ? new Date(hw.dueDate).getTime() : null),
      status: (hw) => hw.status,
    },
    filters: {
      status: (hw, v) => hw.status === v,
      type: (hw, v) => hw.type === v,
    },
  });
  const statusOptions = Array.from(new Set(homework.map((hw) => hw.status).filter(Boolean)))
    .map((v) => ({ value: v, label: v }));
  const typeOptions = Array.from(new Set(homework.map((hw) => hw.type).filter(Boolean)))
    .map((v) => ({ value: v, label: v }));

  useTopbar("ti-microphone", "مراجعة الواجبات الصوتية");

  return (
    <>
      <Alert tone="info">
        يمكنك تقييم الواجبات المعلقة مباشرة من الجدول أدناه.
      </Alert>
      <Card>
        <TableToolbar
          t={t}
          placeholder="البحث باسم الطالب أو نوع الواجب أو المقطع..."
          noun="واجب"
          sortOptions={[
            { key: "student", label: "الطالب" },
            { key: "type", label: "نوع الواجب" },
            { key: "segment", label: "المقطع" },
            { key: "due", label: "تاريخ الاستحقاق" },
            { key: "status", label: "الحالة" },
          ]}
        >
          <TableFilter t={t} k="status" label="كل الحالات" options={statusOptions} />
          <TableFilter t={t} k="type" label="كل الأنواع" options={typeOptions} />
        </TableToolbar>

        {isLoading && (
          <SkeletonTable cols={6} rows={5} />
        )}
        {!isLoading && (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <SortTh t={t} k="student">الطالب</SortTh>
                    <SortTh t={t} k="type">نوع الواجب</SortTh>
                    <SortTh t={t} k="segment">المقطع</SortTh>
                    <SortTh t={t} k="due">تاريخ الاستحقاق</SortTh>
                    <SortTh t={t} k="status">الحالة</SortTh>
                    <th>التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  {t.pageRows.map((hw) => (
                    <tr key={hw._id}>
                      <td style={{ fontWeight: 600 }}>{getName(hw.student)}</td>
                      <td>
                        <Badge tone="blue">{hw.type}</Badge>
                      </td>
                      <td style={{ fontSize: 12 }}>{hw.segment}</td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>
                        {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString(AR_LOCALE) : "—"}
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
                            gradeHW.mutate({ id: hw._id, rating: e.target.value, status: "مراجع" }, { onError: (err) => toast.error((err as Error).message) });
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
                  {homework.length > 0 && t.total === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
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
    </>
  );
}
