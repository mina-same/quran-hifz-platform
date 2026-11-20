import { useMemo } from "react";
import { Modal } from "./Modal";
import { useEvaluations } from "../../api/evaluations";
import type { RankStudent } from "../../api/rankings";
import { AR_LOCALE, toAr } from "../../../lib/format";
import { useTableControls } from "../../lib/useTableControls";
import { Pagination } from "./Pagination";
import { SortTh, TableToolbar, TableFilter } from "./TableTools";

function dayLabel(date: string): string {
  return new Date(date).toLocaleDateString(AR_LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function num(n: number): string {
  return toAr(Number.isInteger(n) ? n : Number(n.toFixed(2))).replace(".", "٫");
}

/**
 * Where a student's numbers in «لوحة الشرف» come from: every evaluated day in
 * the report's period — attendance, each criterion, the day's total — and how
 * points / average / attendance are derived from them.
 */
export function StudentPointsModal({
  student,
  from,
  to,
  onClose,
}: {
  student: RankStudent | null;
  from: string | null;
  to: string;
  onClose: () => void;
}) {
  const { data: rows = [], isLoading } = useEvaluations(
    student ? { student: student.id, ...(from ? { from } : {}), to } : undefined,
  );
  const days = useMemo(() => [...rows].sort((a, b) => a.date.localeCompare(b.date)), [rows]);
  const t = useTableControls(days, {
    search: (d) => [dayLabel(d.date), d.attendanceStatus],
    sorters: { date: (d) => d.date, status: (d) => d.attendanceStatus, total: (d) => d.total },
    filters: { status: (d, v) => d.attendanceStatus === v },
    pageSize: 10,
  });
  const criteria = days.find((d) => d.criteria?.length)?.criteria ?? [];
  const present = days.filter((d) => d.attendanceStatus === "حاضر").length;
  const absent = days.filter((d) => d.attendanceStatus === "غائب").length;
  const excused = days.filter((d) => d.attendanceStatus === "مستأذن").length;

  return (
    <Modal open={!!student} onClose={onClose} title={student?.name} maxWidth={760}>
      {student && (
        <div className="spm">
          <p className="spm-track">{student.trackTitle}</p>
          <div className="spm-stats">
            <div>
              <b>{num(student.points)}</b>
              <span>النقاط = مجموع درجات الأيام</span>
            </div>
            <div>
              <b>{toAr(Math.round(student.avg10 * 10))}٪</b>
              <span>المتوسط من كل الأيام ({toAr(days.length)} يوم)</span>
            </div>
            <div>
              <b>{toAr(student.attendancePct)}٪</b>
              <span>
                الحضور: {toAr(present)} حاضر · {toAr(absent)} غائب
                {excused ? ` · ${toAr(excused)} مستأذن (لا يُحتسب)` : ""}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="spm-loading">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="skl" />
              ))}
            </div>
          ) : days.length === 0 ? (
            <p className="spm-empty">لا توجد تقييمات في هذه الفترة</p>
          ) : (
            <>
            <TableToolbar
              t={t}
              placeholder="بحث باليوم"
              noun="يوم"
              sortOptions={[
                { key: "date", label: "اليوم" },
                { key: "status", label: "الحالة" },
                { key: "total", label: "المجموع" },
              ]}
            >
              <TableFilter
                t={t}
                k="status"
                label="كل الحالات"
                options={["حاضر", "غائب", "مستأذن"].map((v) => ({ value: v, label: v }))}
              />
            </TableToolbar>
            <div className="tbl-wrap">
              <table className="tbl spm-table">
                <thead>
                  <tr>
                    <SortTh t={t} k="date">اليوم</SortTh>
                    <SortTh t={t} k="status">الحالة</SortTh>
                    {criteria.map((c) => (
                      <th key={c.key}>
                        {c.label} <small>/{num(c.max)}</small>
                      </th>
                    ))}
                    <SortTh t={t} k="total">المجموع</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {t.pageRows.map((d) => {
                    const byKey = new Map((d.criteria ?? []).map((c) => [c.key, c.value]));
                    return (
                      <tr key={d._id} className={d.attendanceStatus !== "حاضر" ? "off" : ""}>
                        <td>{dayLabel(d.date)}</td>
                        <td>{d.attendanceStatus}</td>
                        {criteria.map((c) => (
                          <td key={c.key}>{byKey.has(c.key) ? num(byKey.get(c.key)!) : "—"}</td>
                        ))}
                        <td>
                          <b>{num(d.total)}</b>
                          <small>/{num(d.totalMax ?? 10)}</small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2 + criteria.length}>مجموع النقاط</td>
                    <td>
                      <b>{num(days.reduce((n, d) => n + d.total, 0))}</b>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="tbl-pager">
              <Pagination page={t.page} pageSize={t.pageSize} total={t.total} onChange={t.setPage} />
            </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
