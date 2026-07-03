import { useTopbar } from "../../context/useTopbar";
import { useParentContext } from "../../context/ParentContext";
import { useChildAttendance } from "../../api/parent";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { toAr, pct } from "../../../lib/format";

const STATUS_TONE: Record<string, "green" | "gold" | "red"> = {
  "حاضر":   "green",
  "متأخر":  "gold",
  "غائب":   "red",
};

export function ParentAttendance() {
  const { activeChild } = useParentContext();
  const { data: records, isLoading } = useChildAttendance(activeChild?._id);

  useTopbar("ti-calendar-check", `سجل حضور ${activeChild?.name ?? "—"}`, <></>);

  const present  = records?.filter((r) => r.status === "حاضر").length  ?? 0;
  const late     = records?.filter((r) => r.status === "متأخر").length ?? 0;
  const absent   = records?.filter((r) => r.status === "غائب").length  ?? 0;
  const total    = records?.length ?? 0;
  const attendPct = total ? Math.round((present / total) * 100) : activeChild?.attendancePct ?? 0;

  return (
    <>
      <StatsRow
        items={[
          { num: pct(attendPct),   label: "نسبة الحضور",     icon: "ti-chart-bar" },
          { num: toAr(present),     label: "جلسة حضرها",      icon: "ti-calendar-check", variant: "gold" },
          { num: toAr(late),        label: "تأخر",             icon: "ti-clock",          variant: "blue" },
          { num: toAr(absent),      label: "غائب",             icon: "ti-alert-circle",   variant: "red" },
        ]}
      />
      <Card icon="ti-calendar" title="سجل الحضور">
        {isLoading ? (
          <SkeletonTable cols={5} rows={5} />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>اليوم</th>
                    <th>الوقت</th>
                    <th>الحالة</th>
                    <th>ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {(records ?? []).map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r.date).toLocaleDateString("ar-SA")}</td>
                      <td>{r.day}</td>
                      <td>{r.time}</td>
                      <td><Badge tone={STATUS_TONE[r.status] ?? "green"}>{r.status}</Badge></td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>
                        {(r as { note?: string }).note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rc-list">
              {(records ?? []).map((r, i) => (
                <div key={i} className="rc-card">
                  <div className="rc-card-head">
                    <span className="rc-card-title">{new Date(r.date).toLocaleDateString("ar-SA")}</span>
                    <Badge tone={STATUS_TONE[r.status] ?? "green"}>{r.status}</Badge>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">اليوم</span>
                    <span>{r.day}</span>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">الوقت</span>
                    <span>{r.time}</span>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">ملاحظة</span>
                    <span>{(r as { note?: string }).note ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
