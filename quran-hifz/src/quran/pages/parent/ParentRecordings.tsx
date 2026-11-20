import { useTopbar } from "../../context/useTopbar";
import { useParentContext } from "../../context/ParentContext";
import { useChildRecordings } from "../../api/parent";
import { Alert } from "../../components/common/Alert";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { Pagination } from "../../components/common/Pagination";
import { SortTh, TableToolbar, TableFilter } from "../../components/common/TableTools";
import { useTableControls } from "../../lib/useTableControls";
import { AR_LOCALE } from "@/lib/format";

/** «YYYY-MM» of a date (local time) — the month filter's value. */
function monthKey(d: string): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

/** Month options present in the data, newest first. */
function monthOptions(dates: string[]): { value: string; label: string }[] {
  return Array.from(new Set(dates.map(monthKey)))
    .sort()
    .reverse()
    .map((k) => {
      const [y, m] = k.split("-").map(Number);
      return { value: k, label: new Date(y, m - 1, 1).toLocaleDateString(AR_LOCALE, { month: "long", year: "numeric" }) };
    });
}

export function ParentRecordings() {
  const { activeChild } = useParentContext();
  const childId = activeChild?._id;
  const { data: recordings, isLoading } = useChildRecordings(childId);

  const rows = recordings ?? [];
  const teacherName = (r: (typeof rows)[number]) => (typeof r.teacher === "object" && r.teacher ? r.teacher.name : "");
  const t = useTableControls(rows, {
    search: (r) => [new Date(r.recordedAt).toLocaleDateString(AR_LOCALE), r.type, r.segment, r.points, r.teacherNote, teacherName(r)],
    sorters: {
      date: (r) => r.recordedAt,
      type: (r) => r.type,
      segment: (r) => r.segment,
      points: (r) => r.points,
      note: (r) => r.teacherNote,
    },
    filters: {
      type: (r, v) => r.type === v,
      month: (r, v) => monthKey(r.recordedAt) === v,
    },
    initialSort: { key: "date", dir: "desc" },
  });
  const typeOptions = Array.from(new Set(rows.map((r) => r.type).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "ar"))
    .map((v) => ({ value: v, label: v }));

  useTopbar("ti-microphone", `دروس ${activeChild?.name ?? "—"} المُسجَّلة`, <></>);

  return (
    <>
      <Alert tone="info">جميع دروس ابنك مرتبة من الأحدث — سجّلها المعلم مباشرة في الحلقة.</Alert>
      <Card icon="ti-table" title="سجل الدروس">
        <TableToolbar
          t={t}
          placeholder="البحث بالتاريخ أو نوع الدرس أو المقطع أو الملاحظة..."
          noun="درس"
          sortOptions={[
            { key: "date", label: "التاريخ" },
            { key: "type", label: "نوع الدرس" },
            { key: "points", label: "النقاط" },
          ]}
        >
          <TableFilter t={t} k="type" label="كل الأنواع" options={typeOptions} />
          <TableFilter t={t} k="month" label="كل الأشهر" options={monthOptions(rows.map((r) => r.recordedAt))} />
        </TableToolbar>

        {isLoading ? (
          <SkeletonTable cols={5} rows={5} />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <SortTh t={t} k="date">التاريخ</SortTh>
                    <SortTh t={t} k="type">نوع الدرس</SortTh>
                    <SortTh t={t} k="segment">المقطع</SortTh>
                    <SortTh t={t} k="points">النقاط</SortTh>
                    <SortTh t={t} k="note">ملاحظة المعلم</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {t.pageRows.map((r) => (
                    <tr key={r._id}>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>
                        {new Date(r.recordedAt).toLocaleDateString(AR_LOCALE)}
                      </td>
                      <td><Badge tone="blue">{r.type}</Badge></td>
                      <td style={{ fontSize: 12 }}>{r.segment}</td>
                      <td style={{ fontWeight: 700, color: "var(--gold)" }}>{r.points}</td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.teacherNote ?? "—"}</td>
                    </tr>
                  ))}
                  {rows.length > 0 && t.total === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
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
