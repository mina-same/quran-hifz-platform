import { useOpenWardEntries, type OpenWardEntry } from "../../api/open-ward";
import type { RangePoint } from "../../api/quran-plans";
import { surahName } from "../../lib/quranRange";
import { Badge } from "./Badge";
import { AR_LOCALE } from "@/lib/format";
import { useTableControls } from "../../lib/useTableControls";
import { Pagination } from "./Pagination";
import { SortTh, TableToolbar, TableFilter } from "./TableTools";

function pointLabel(p?: RangePoint) {
  return p ? `${surahName(p.surahNumber)} : ${p.ayah}` : "—";
}
function studentName(e: OpenWardEntry) {
  return typeof e.student === "string" ? "" : e.student.name;
}
function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString(AR_LOCALE, { year: "numeric", month: "short", day: "numeric" });
}

/** What students actually memorized on an open-ward plan, newest first. Pass
 * `studentId` to narrow to one student (and hide the student column). */
export function OpenWardLog({ planId, studentId }: { planId: string; studentId?: string }) {
  const { data = [], isLoading } = useOpenWardEntries(planId, studentId ? { student: studentId } : undefined);
  const showStudent = !studentId;
  const t = useTableControls(data, {
    search: (e) => [fmtDate(e.date), studentName(e), e.type, pointLabel(e.from), pointLabel(e.to)],
    sorters: { date: (e) => e.date, student: (e) => studentName(e), type: (e) => e.type },
    filters: { type: (e, v) => e.type === v },
    pageSize: 15,
  });
  const types = [...new Set(data.map((e) => e.type))];

  if (isLoading) {
    return <p style={{ margin: "20px 0", fontSize: 13, color: "var(--text3)", textAlign: "center" }}>جارٍ التحميل…</p>;
  }
  if (data.length === 0) {
    return (
      <p style={{ margin: "20px 0", fontSize: 13, color: "var(--text3)", textAlign: "center" }}>
        لم يُسجَّل أي ورد بعد — يُسجَّل من شاشة الحضور والتقييم.
      </p>
    );
  }
  return (
    <>
    <TableToolbar
      t={t}
      placeholder={showStudent ? "بحث بالطالب أو السورة" : "بحث بالتاريخ أو السورة"}
      noun="ورد"
      sortOptions={[
        { key: "date", label: "التاريخ" },
        ...(showStudent ? [{ key: "student", label: "الطالب" }] : []),
        { key: "type", label: "النوع" },
      ]}
    >
      {types.length > 1 && (
        <TableFilter t={t} k="type" label="كل الأنواع" options={types.map((v) => ({ value: v, label: v }))} />
      )}
    </TableToolbar>
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <SortTh t={t} k="date">التاريخ</SortTh>
            {showStudent && <SortTh t={t} k="student">الطالب</SortTh>}
            <SortTh t={t} k="type">النوع</SortTh>
            <th>من</th>
            <th>إلى</th>
            <th>الصفحات</th>
          </tr>
        </thead>
        <tbody>
          {t.pageRows.map((e) => (
            <tr key={e._id} style={e.status === "none" ? { opacity: 0.55 } : undefined}>
              <td>{fmtDate(e.date)}</td>
              {showStudent && <td>{studentName(e)}</td>}
              <td><Badge tone={e.type === "حفظ" ? "green" : "gold"}>{e.type}</Badge></td>
              {e.status === "none" ? (
                <td colSpan={3} style={{ color: "var(--text3)" }}>لم يُسمِّع</td>
              ) : (
                <>
                  <td>{pointLabel(e.from)}</td>
                  <td>{pointLabel(e.to)}</td>
                  <td>{e.pageStart === e.pageEnd ? e.pageStart : `${e.pageStart} - ${e.pageEnd}`}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="tbl-pager">
      <Pagination page={t.page} pageSize={t.pageSize} total={t.total} onChange={t.setPage} />
    </div>
    </>
  );
}
