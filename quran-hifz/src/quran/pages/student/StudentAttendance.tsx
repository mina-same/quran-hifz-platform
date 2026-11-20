import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { useAttendance } from "../../api/attendance";
import { useStudent } from "../../api/students";
import { Pagination } from "../../components/common/Pagination";
import { SortTh, TableToolbar, TableFilter } from "../../components/common/TableTools";
import { useTableControls } from "../../lib/useTableControls";
import { toAr, pct, AR_LOCALE } from "../../../lib/format";

const STATUS_TONE: Record<string, BadgeTone> = {
  حاضر: "green",
  غائب: "red",
  متأخر: "gold",
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

export function StudentAttendance() {
  const { user } = usePortal();
  const { data: student } = useStudent(user?.profileId);
  const { data: records = [], isLoading } = useAttendance({ student: user?.profileId });

  useTopbar("ti-calendar-check", "سجل حضوري");

  const presentCount = records.filter((r) => r.status === "حاضر").length;
  const absentCount = records.filter((r) => r.status === "غائب").length;
  const lateCount = records.filter((r) => r.status === "متأخر").length;

  const t = useTableControls(records, {
    search: (r) => [new Date(r.date).toLocaleDateString(AR_LOCALE), r.day, r.time, r.status],
    sorters: {
      date: (r) => r.date,
      day: (r) => r.day,
      time: (r) => r.time,
      status: (r) => r.status,
    },
    filters: {
      status: (r, v) => r.status === v,
      month: (r, v) => monthKey(r.date) === v,
    },
    initialSort: { key: "date", dir: "desc" },
  });

  return (
    <>
      <StatsRow
        items={[
          { num: pct(student?.attendancePct ?? 0), label: "نسبة حضوري", icon: "ti-chart-bar" },
          { num: toAr(presentCount), label: "جلسة حضرتها", icon: "ti-calendar-check", variant: "gold" },
          { num: toAr(absentCount), label: "غيابات", icon: "ti-x", variant: "red" },
          { num: toAr(lateCount), label: "تأخيرات", icon: "ti-clock" },
        ]}
      />
      <Card>
        <TableToolbar
          t={t}
          placeholder="البحث بالتاريخ أو اليوم أو الحالة..."
          noun="جلسة"
          sortOptions={[
            { key: "date", label: "التاريخ" },
            { key: "status", label: "الحالة" },
          ]}
        >
          <TableFilter t={t} k="status" label="كل الحالات" options={[{ value: "حاضر", label: "حاضر" }, { value: "غائب", label: "غائب" }, { value: "متأخر", label: "متأخر" }, { value: "مستأذن", label: "مستأذن" }]} />
          <TableFilter t={t} k="month" label="كل الأشهر" options={monthOptions(records.map((r) => r.date))} />
        </TableToolbar>

        {isLoading && <SkeletonTable cols={4} rows={5} />}
        {!isLoading && (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <SortTh t={t} k="date">التاريخ</SortTh>
                    <SortTh t={t} k="day">اليوم</SortTh>
                    <SortTh t={t} k="time">الوقت</SortTh>
                    <SortTh t={t} k="status">الحالة</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {t.pageRows.map((r) => (
                    <tr key={r._id}>
                      <td>{new Date(r.date).toLocaleDateString(AR_LOCALE)}</td>
                      <td>{r.day}</td>
                      <td>{r.time || "—"}</td>
                      <td>
                        <Badge tone={STATUS_TONE[r.status] ?? "gray"}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                        لا توجد سجلات حضور بعد
                      </td>
                    </tr>
                  )}
                  {records.length > 0 && t.total === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
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
