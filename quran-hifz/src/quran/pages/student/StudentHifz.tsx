import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { HalqaRow } from "../../components/common/HalqaRow";
import { SkeletonTable } from "../../components/common/Skeleton";
import { useHifz } from "../../api/hifz";
import { useStudent } from "../../api/students";
import { Pagination } from "../../components/common/Pagination";
import { SortTh, TableToolbar, TableFilter } from "../../components/common/TableTools";
import { useTableControls } from "../../lib/useTableControls";
import { toAr, pct, AR_LOCALE } from "../../../lib/format";

function tone(status: string): BadgeTone {
  if (status === "مكتمل") return "green";
  if (status === "جارٍ") return "gold";
  return "gray";
}

const STATUS_ORDER: Record<string, number> = { مكتمل: 0, "جارٍ": 1, "لم يبدأ": 2 };

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

export function StudentHifz() {
  const { user } = usePortal();
  const { data: hifzEntries = [], isLoading } = useHifz(user?.profileId);
  const { data: student } = useStudent(user?.profileId);

  useTopbar("ti-book", "خطة حفظي");

  const pages = student ? Math.round((student.progressPct / 100) * (student.totalPages || 604)) : 0;
  const remaining = (student?.totalPages || 604) - pages;

  const t = useTableControls(hifzEntries, {
    search: (e) => [
      e.surah,
      e.surahNumber,
      toAr(e.surahNumber),
      e.status,
      e.completionDate ? new Date(e.completionDate).toLocaleDateString(AR_LOCALE) : "",
      e.notes,
    ],
    sorters: {
      num: (e) => e.surahNumber,
      surah: (e) => e.surah,
      status: (e) => STATUS_ORDER[e.status] ?? 3,
      date: (e) => e.completionDate,
    },
    filters: {
      status: (e, v) => e.status === v,
      month: (e, v) => !!e.completionDate && monthKey(e.completionDate) === v,
    },
    initialSort: { key: "num", dir: "asc" },
  });

  return (
    <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 18 }}>
      <Card icon="ti-target" title="هدفي السنوي">
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "var(--green)" }}>
            {toAr(pages)}
          </div>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>
            صفحة من أصل {toAr(student?.totalPages || 604)}
          </div>
          <div style={{ margin: "14px 0 8px" }}>
            <ProgressBar pct={student?.progressPct ?? 0} />
          </div>
          <Badge tone="green">{pct(student?.progressPct ?? 0)} منجز</Badge>
        </div>
        <hr className="divider" />
        <div style={{ fontSize: 12 }}>
          <HalqaRow label="المسار" value={student?.path ?? "—"} />
          <HalqaRow label="الصفحات المتبقية" value={`${toAr(remaining)} صفحة`} />
          {student?.lastMemorization && (
            <HalqaRow label="آخر حفظ" value={student.lastMemorization} />
          )}
        </div>
      </Card>
      <Card icon="ti-list" title="تفاصيل الحفظ">
        <TableToolbar
          t={t}
          placeholder="البحث باسم السورة أو رقمها أو الحالة..."
          noun="سورة"
          sortOptions={[
            { key: "num", label: "رقم السورة" },
            { key: "surah", label: "السورة" },
            { key: "status", label: "الحالة" },
            { key: "date", label: "تاريخ الختم" },
          ]}
        >
          <TableFilter
            t={t}
            k="status"
            label="كل الحالات"
            options={[{ value: "مكتمل", label: "مكتمل" }, { value: "جارٍ", label: "جارٍ" }, { value: "لم يبدأ", label: "لم يبدأ" }]}
          />
          <TableFilter
            t={t}
            k="month"
            label="شهر الختم: الكل"
            options={monthOptions(hifzEntries.flatMap((e) => (e.completionDate ? [e.completionDate] : [])))}
          />
        </TableToolbar>

        {isLoading && <SkeletonTable cols={4} rows={6} />}
        {!isLoading && (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <SortTh t={t} k="num">#</SortTh>
                    <SortTh t={t} k="surah">السورة</SortTh>
                    <SortTh t={t} k="status">الحالة</SortTh>
                    <SortTh t={t} k="date">تاريخ الختم</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {t.pageRows.map((e) => (
                    <tr key={e._id}>
                      <td style={{ color: "var(--text3)", fontSize: 12 }}>{toAr(e.surahNumber)}</td>
                      <td style={{ fontWeight: 600 }}>{e.surah}</td>
                      <td>
                        <Badge tone={tone(e.status)}>{e.status}</Badge>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>
                        {e.completionDate
                          ? new Date(e.completionDate).toLocaleDateString(AR_LOCALE)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {hifzEntries.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                        لا توجد سور مسجلة بعد
                      </td>
                    </tr>
                  )}
                  {hifzEntries.length > 0 && t.total === 0 && (
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
    </div>
  );
}
