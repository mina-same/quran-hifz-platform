import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { AyahBar } from "../../components/common/AyahBar";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { ProgressBar } from "../../components/common/ProgressBar";
import { Alert } from "../../components/common/Alert";
import { SkeletonStatsRow, SkeletonCard } from "../../components/common/Skeleton";
import { useDashboardAlerts, useStats, type DashboardAlerts } from "../../api/stats";
import { useStudents } from "../../api/students";
import { useKpis, KPI_STATUS } from "../../api/kpis";
import { toAr, pct } from "../../../lib/format";
import { matchesGenderScope } from "../../lib/genderScope";

function PageLoading() {
  return (
    <>
      <SkeletonStatsRow />
      <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
      <SkeletonCard lines={3} />
    </>
  );
}

export function AdminDashboard() {
  const { showPage, genderScope, readOnly } = usePortal();
  const { data: stats, isLoading: statsLoading } = useStats(genderScope);
  const { data: students } = useStudents();
  const { data: kpis } = useKpis(genderScope);
  const { data: alerts } = useDashboardAlerts(genderScope);
  const scopedStudents = (students ?? []).filter((s) =>
    matchesGenderScope(typeof s.track === "string" ? undefined : s.track.masjid, genderScope),
  );

  useTopbar(
    "ti-layout-dashboard",
    "لوحة التحكم الرئيسية",
    <>
      {!readOnly && (
        <button className="topbar-btn btn-primary" onClick={() => showPage("register")}>
          <i className="ti ti-user-plus" /> طالب جديد
        </button>
      )}
    </>,
  );

  if (statsLoading) return <PageLoading />;

  // Group students by path for masar distribution
  const masarCounts: Record<string, number> = {};
  scopedStudents.forEach((s) => {
    masarCounts[s.path] = (masarCounts[s.path] ?? 0) + 1;
  });
  const total = scopedStudents.length || 1;
  const masarRows = Object.entries(masarCounts).map(([name, count]) => ({
    name,
    count,
    pct: Math.round((count / total) * 100),
  }));


  return (
    <>
      <AyahBar />
      <StatsRow
        items={[
          { num: toAr(stats?.totalStudents ?? 0), label: "إجمالي الطلاب", icon: "ti-users" },
          { num: toAr(stats?.totalTracks ?? 0), label: "مسارات نشطة", icon: "ti-calendar-event", variant: "gold" },
          { num: toAr(stats?.totalTeachers ?? 0), label: "المعلمون", icon: "ti-chalkboard", variant: "blue" },
          { num: pct(stats?.avgAttendancePct ?? 0), label: "نسبة الحضور", icon: "ti-calendar-check" },
        ]}
      />
      <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card icon="ti-chart-pie" title="توزيع المسارات">
          {masarRows.length === 0 ? (
            <div className="page-loading">لا توجد بيانات</div>
          ) : (
            masarRows.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 12 }}>
                <span style={{ flex: 1, color: "var(--text2)" }}>{r.name}</span>
                <div style={{ width: 100 }}>
                  <ProgressBar pct={r.pct} />
                </div>
                <span style={{ fontWeight: 700, color: "var(--green)", minWidth: 22 }}>{toAr(r.count)}</span>
              </div>
            ))
          )}
        </Card>
        <Card icon="ti-target" title="مؤشرات الأداء">
          {(kpis ?? []).slice(0, 4).map((k) => (
            <div key={k._id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: "var(--text2)" }}>{k.indicator}</span>
                <span style={{ fontWeight: 700, color: KPI_STATUS[k.status].color }}>
                  {k.actual} <small style={{ color: "var(--text3)", fontWeight: 600 }}>/ {k.target}</small>
                </span>
              </div>
              <ProgressBar pct={k.progress} />
            </div>
          ))}
        </Card>
      </div>
      <Card icon="ti-bell" title="آخر التنبيهات">
        <DashboardAlertList alerts={alerts} onOpenChanges={() => showPage("gradechanges")} />
      </Card>
    </>
  );
}

/** Arabic counted noun: ١ طالب، ٢ طالبان، ٣–١٠ طلاب، ١١+ طالباً. */
function countOf(n: number, forms: [one: string, two: string, few: string, many: string]): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  return `${toAr(n)} ${n <= 10 ? forms[2] : forms[3]}`;
}
const STUDENTS: [string, string, string, string] = ["طالب واحد", "طالبان", "طلاب", "طالباً"];
const HALQAS: [string, string, string, string] = ["حلقة واحدة", "حلقتان", "حلقات", "حلقة"];

/** Up to three names, then «و N آخرون». */
function namesPreview(names: string[]): string {
  const shown = names.slice(0, 3).join("، ");
  return names.length > 3 ? `${shown} و${toAr(names.length - 3)} آخرين` : shown;
}

function DashboardAlertList({ alerts, onOpenChanges }: { alerts?: DashboardAlerts; onOpenChanges: () => void }) {
  if (!alerts) return <SkeletonCard lines={2} />;
  const { absent, nearCapacity, excellent, reportMissing } = alerts;
  if (!absent.length && !nearCapacity.length && !excellent.length && !reportMissing.length && !alerts.gradeEdits) {
    return <p style={{ margin: 0, color: "var(--text3)", fontSize: 13 }}>لا توجد تنبيهات حالياً</p>;
  }
  return (
    <>
      {absent.length > 0 && (
        <Alert tone="warning">
          <b>{countOf(absent.length, STUDENTS)}</b> تجاوزت نسبة غيابهم ٢٥٪ — يُنصح بالتواصل
          مع أولياء الأمور ({namesPreview(absent.map((a) => `${a.name} ${pct(a.pct)}`))})
        </Alert>
      )}
      {alerts.gradeEdits > 0 && (
        <Alert tone="info" icon="ti-history">
          <b>{toAr(alerts.gradeEdits)}</b> {alerts.gradeEdits === 1 ? "تعديل" : "تعديلات"} على درجات أو حضور بعد حفظها اليوم —{" "}
          <button type="button" className="dre-link" onClick={onOpenChanges}>عرض سجل التعديلات</button>
        </Alert>
      )}
      {reportMissing.length > 0 && (
        <Alert tone="info" icon="ti-report">
          <b>{countOf(reportMissing.length, HALQAS)}</b> سجّلت تقييم اليوم ولم
          ترسل التقرير اليومي بعد ({namesPreview(reportMissing)})
        </Alert>
      )}
      {nearCapacity.map((t) => (
        <Alert key={t.title} tone="info">
          حلقة {t.title} وصلت لـ <b>{pct(t.pct)}</b> من طاقتها الاستيعابية
        </Alert>
      ))}
      {excellent.length > 0 && (
        <Alert tone="success">
          <b>{countOf(excellent.length, STUDENTS)}</b> متوسط تقييمهم ٩ من ١٠ فأكثر هذا الشهر (
          {namesPreview(excellent)})
        </Alert>
      )}
    </>
  );
}
