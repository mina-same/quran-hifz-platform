import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { useAttendance } from "../../api/attendance";
import { useStudent } from "../../api/students";
import { toAr, pct } from "../../../lib/format";

const STATUS_TONE: Record<string, BadgeTone> = {
  حاضر: "green",
  غائب: "red",
  متأخر: "gold",
};

export function StudentAttendance() {
  const { user } = usePortal();
  const { data: student } = useStudent(user?.profileId);
  const { data: records = [], isLoading } = useAttendance({ student: user?.profileId });

  useTopbar("ti-calendar-check", "سجل حضوري");

  const presentCount = records.filter((r) => r.status === "حاضر").length;
  const absentCount = records.filter((r) => r.status === "غائب").length;
  const lateCount = records.filter((r) => r.status === "متأخر").length;

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
        {isLoading && <SkeletonTable cols={4} rows={5} />}
        {!isLoading && (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>اليوم</th>
                    <th>الوقت</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      <td>{new Date(r.date).toLocaleDateString("ar-SA")}</td>
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
                </tbody>
              </table>
            </div>

            <div className="rc-list">
              {records.map((r) => (
                <div key={r._id} className="rc-card">
                  <div className="rc-card-head">
                    <span className="rc-card-title">{new Date(r.date).toLocaleDateString("ar-SA")}</span>
                    <Badge tone={STATUS_TONE[r.status] ?? "gray"}>{r.status}</Badge>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">اليوم</span>
                    <span>{r.day}</span>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">الوقت</span>
                    <span>{r.time || "—"}</span>
                  </div>
                </div>
              ))}
              {records.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                  لا توجد سجلات حضور بعد
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
