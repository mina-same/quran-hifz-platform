import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge } from "../../components/common/Badge";
import { useStats } from "../../api/stats";
import { useHalqat } from "../../api/halqat";
import { useHomework } from "../../api/homework";
import { toAr } from "../../../lib/format";

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "";
}

export function TeacherDashboard() {
  const { showPage, user } = usePortal();
  const { data: stats } = useStats();
  const { data: halqat = [] } = useHalqat({ teacher: user?.profileId });
  const { data: pendingHW = [] } = useHomework({ teacher: user?.profileId, status: "معلق" });

  const totalStudents = halqat.reduce((sum, h) => sum + (h.studentCount ?? 0), 0);

  useTopbar(
    "ti-layout-dashboard",
    "لوحة التحكم",
    <button className="topbar-btn btn-primary" onClick={() => showPage("attendance")}>
      <i className="ti ti-calendar-check" /> تسجيل الحضور
    </button>,
  );

  return (
    <>
      <StatsRow
        items={[
          { num: toAr(totalStudents), label: "طلابي الكلي", icon: "ti-users" },
          { num: toAr(halqat.length), label: "حلقاتي", icon: "ti-school", variant: "gold" },
          { num: toAr(stats?.avgAttendancePct ?? 0) + "٪", label: "متوسط الحضور", icon: "ti-calendar-check", variant: "blue" },
          { num: toAr(pendingHW.length), label: "واجبات معلقة", icon: "ti-microphone", variant: "red" },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card icon="ti-school" title="حلقاتي">
          {halqat.length === 0 && (
            <div className="page-loading">لا توجد حلقات مسجلة</div>
          )}
          {halqat.map((h) => (
            <div key={h._id} className="halqa-row-item">
              <span className="h-name">{h.name}</span>
              <Badge tone="gold">{getName(h.masjid) || "—"}</Badge>
              <span className="h-info">
                <i className="ti ti-clock" style={{ fontSize: 11 }} /> {h.time}
              </span>
              <span className="h-info">
                <i className="ti ti-users" style={{ fontSize: 11 }} /> {toAr(h.studentCount ?? 0)} طالب
              </span>
            </div>
          ))}
        </Card>
        <Card icon="ti-microphone" title="واجبات تحتاج مراجعة">
          {pendingHW.length > 0 ? (
            <Alert tone="warning" icon="ti-clock" style={{ marginBottom: 10 }}>
              <b>{toAr(pendingHW.length)} واجب</b> صوتي بانتظار المراجعة
            </Alert>
          ) : (
            <Alert tone="success" style={{ marginBottom: 10 }}>
              لا توجد واجبات معلقة
            </Alert>
          )}
          <button
            className="topbar-btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => showPage("homework")}
          >
            <i className="ti ti-arrow-left" /> مراجعة الواجبات الآن
          </button>
        </Card>
      </div>
    </>
  );
}
