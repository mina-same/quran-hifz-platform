import { useTopbar } from "../../context/useTopbar";
import { useParentContext } from "../../context/ParentContext";
import { useChildAttendance } from "../../api/parent";
import { useEvaluations } from "../../api/evaluations";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { Pagination } from "../../components/common/Pagination";
import { SortTh, TableToolbar, TableFilter } from "../../components/common/TableTools";
import { useTableControls } from "../../lib/useTableControls";
import { toAr, pct, AR_LOCALE } from "../../../lib/format";

const STATUS_TONE: Record<string, "green" | "gold" | "red" | "blue"> = {
  حاضر: "green",
  متأخر: "gold",
  غائب: "red",
  مستأذن: "blue",
};

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

export function ParentAttendance() {
  const { activeChild } = useParentContext();
  const { data: records, isLoading } = useChildAttendance(activeChild?._id);
  const { data: evaluations = [] } = useEvaluations(
    activeChild?._id ? { student: activeChild._id } : undefined,
  );

  useTopbar("ti-calendar-check", `سجل حضور ${activeChild?.name ?? "—"}`, <></>);

  const evalByDate = new Map(evaluations.map((e) => [new Date(e.date).toDateString(), e]));

  const present = records?.filter((r) => r.status === "حاضر").length ?? 0;
  const late = records?.filter((r) => r.status === "متأخر").length ?? 0;
  const absent = records?.filter((r) => r.status === "غائب").length ?? 0;
  // Excused (مستأذن) sessions don't count toward the attendance percentage.
  const total = records?.filter((r) => r.status !== "مستأذن").length ?? 0;
  const attendPct = total ? Math.round((present / total) * 100) : (activeChild?.attendancePct ?? 0);

  const rows = records ?? [];
  const evalFor = (r: (typeof rows)[number]) => evalByDate.get(new Date(r.date).toDateString());
  const noteOf = (r: (typeof rows)[number]) => (r as { note?: string }).note;
  const t = useTableControls(rows, {
    search: (r) => {
      const ev = evalFor(r);
      return [new Date(r.date).toLocaleDateString(AR_LOCALE), r.day, r.time, r.status, ev ? `${ev.total}/10` : "", noteOf(r)];
    },
    sorters: {
      date: (r) => r.date,
      day: (r) => r.day,
      time: (r) => r.time,
      status: (r) => r.status,
      eval: (r) => evalFor(r)?.total,
      note: (r) => noteOf(r),
    },
    filters: {
      status: (r, v) => r.status === v,
      month: (r, v) => monthKey(r.date) === v,
      eval: (r, v) => (v === "yes" ? !!evalFor(r) : !evalFor(r)),
    },
    initialSort: { key: "date", dir: "desc" },
  });

  return (
    <>
      <StatsRow
        items={[
          { num: pct(attendPct), label: "نسبة الحضور", icon: "ti-chart-bar" },
          { num: toAr(present), label: "جلسة حضرها", icon: "ti-calendar-check", variant: "gold" },
          { num: toAr(late), label: "تأخر", icon: "ti-clock", variant: "blue" },
          { num: toAr(absent), label: "غائب", icon: "ti-alert-circle", variant: "red" },
        ]}
      />
      <Card icon="ti-calendar" title="سجل الحضور">
        <TableToolbar
          t={t}
          placeholder="البحث بالتاريخ أو اليوم أو الحالة أو الملاحظة..."
          noun="جلسة"
          sortOptions={[
            { key: "date", label: "التاريخ" },
            { key: "status", label: "الحالة" },
            { key: "eval", label: "التقييم" },
          ]}
        >
          <TableFilter t={t} k="status" label="كل الحالات" options={[{ value: "حاضر", label: "حاضر" }, { value: "غائب", label: "غائب" }, { value: "متأخر", label: "متأخر" }, { value: "مستأذن", label: "مستأذن" }]} />
          <TableFilter t={t} k="month" label="كل الأشهر" options={monthOptions(rows.map((r) => r.date))} />
          <TableFilter t={t} k="eval" label="التقييم: الكل" options={[{ value: "yes", label: "مُقيَّم" }, { value: "no", label: "بدون تقييم" }]} />
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
                    <SortTh t={t} k="day">اليوم</SortTh>
                    <SortTh t={t} k="time">الوقت</SortTh>
                    <SortTh t={t} k="status">الحالة</SortTh>
                    <SortTh t={t} k="eval">التقييم</SortTh>
                    <SortTh t={t} k="note">ملاحظة</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {t.pageRows.map((r) => {
                    const evalForDay = evalFor(r);
                    return (
                      <tr key={r._id}>
                        <td>{new Date(r.date).toLocaleDateString(AR_LOCALE)}</td>
                        <td>{r.day}</td>
                        <td>{r.time}</td>
                        <td>
                          <Badge tone={STATUS_TONE[r.status] ?? "green"}>{r.status}</Badge>
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--green)" }}>
                          {evalForDay ? `${evalForDay.total}/10` : "—"}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>
                          {(r as { note?: string }).note ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length > 0 && t.total === 0 && (
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
