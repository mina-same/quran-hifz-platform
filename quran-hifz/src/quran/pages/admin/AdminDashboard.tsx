import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { AyahBar } from "../../components/common/AyahBar";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { ProgressBar } from "../../components/common/ProgressBar";
import { Alert } from "../../components/common/Alert";
import { useStats } from "../../api/stats";
import { useStudents } from "../../api/students";
import { useKpis } from "../../api/kpis";
import { toAr, pct } from "../../../lib/format";

function PageLoading() {
  return (
    <div className="page-loading">
      <i className="ti ti-loader-2" /> جارٍ التحميل...
    </div>
  );
}

export function AdminDashboard() {
  const { showPage } = usePortal();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: students } = useStudents();
  const { data: kpis } = useKpis();

  useTopbar(
    "ti-layout-dashboard",
    "لوحة التحكم الرئيسية",
    <>
      <button className="topbar-btn btn-ghost">
        <i className="ti ti-download" /> تصدير تقرير
      </button>
      <button className="topbar-btn btn-primary" onClick={() => showPage("register")}>
        <i className="ti ti-user-plus" /> طالب جديد
      </button>
    </>,
  );

  if (statsLoading) return <PageLoading />;

  // Group students by path for masar distribution
  const masarCounts: Record<string, number> = {};
  (students ?? []).forEach((s) => {
    masarCounts[s.path] = (masarCounts[s.path] ?? 0) + 1;
  });
  const total = students?.length || 1;
  const masarRows = Object.entries(masarCounts).map(([name, count]) => ({
    name,
    count,
    pct: Math.round((count / total) * 100),
  }));

  const ratingTone: Record<string, string> = {
    ممتاز: "var(--green)",
    جيد: "var(--text2)",
    مقبول: "var(--gold)",
    ضعيف: "var(--red, #c0392b)",
  };

  return (
    <>
      <AyahBar />
      <StatsRow
        items={[
          { num: toAr(stats?.totalStudents ?? 0), label: "إجمالي الطلاب", icon: "ti-users" },
          { num: toAr(stats?.totalHalqat ?? 0), label: "حلقات نشطة", icon: "ti-school", variant: "gold" },
          { num: toAr(stats?.totalTeachers ?? 0), label: "المعلمون", icon: "ti-chalkboard", variant: "blue" },
          { num: pct(stats?.avgAttendancePct ?? 0), label: "نسبة الحضور", icon: "ti-calendar-check" },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
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
                <span style={{ fontWeight: 700, color: ratingTone[k.rating] ?? "var(--green)" }}>{k.actual}</span>
              </div>
              <ProgressBar pct={parseInt(k.actual) || 0} />
            </div>
          ))}
        </Card>
      </div>
      <Card icon="ti-bell" title="آخر التنبيهات">
        {(stats?.lateHomework ?? 0) > 0 && (
          <Alert tone="warning">
            <b>{toAr(stats!.lateHomework)} واجب</b> متأخر — يُنصح بمراجعة الطلاب
          </Alert>
        )}
        {(stats?.pendingHomework ?? 0) > 0 && (
          <Alert tone="info">
            <b>{toAr(stats!.pendingHomework)} واجب</b> في انتظار المراجعة
          </Alert>
        )}
        {(stats?.avgAttendancePct ?? 0) >= 90 && (
          <Alert tone="success">
            نسبة الحضور الكلية <b>{pct(stats!.avgAttendancePct)}</b> — ممتاز
          </Alert>
        )}
      </Card>
    </>
  );
}
