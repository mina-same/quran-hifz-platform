import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { AyahBar } from "../../components/common/AyahBar";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { HalqaRow } from "../../components/common/HalqaRow";
import { useStudent } from "../../api/students";
import { useHomework } from "../../api/homework";
import { toAr, pct } from "../../../lib/format";

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "—";
}

export function StudentDashboard() {
  const { showPage, user } = usePortal();
  const { data: student, isLoading } = useStudent(user?.profileId);
  const { data: homework = [] } = useHomework({ student: user?.profileId });

  useTopbar(
    "ti-home",
    "لوحتي",
    <button className="topbar-btn btn-gold" onClick={() => showPage("homework")}>
      <i className="ti ti-microphone" /> إرسال الواجب اليومي
    </button>,
  );

  if (isLoading) {
    return (
      <div className="page-loading">
        <i className="ti ti-loader-2" /> جارٍ التحميل...
      </div>
    );
  }

  const submittedCount = homework.filter((h) => h.status === "مراجع").length;
  const pages = student ? Math.round((student.progressPct / 100) * (student.totalPages || 604)) : 0;
  const totalPages = student?.totalPages || 604;

  return (
    <>
      <AyahBar />
      <StatsRow
        items={[
          { num: toAr(pages), label: "صفحة محفوظة", icon: "ti-book" },
          { num: pct(student?.attendancePct ?? 0), label: "نسبة حضوري", icon: "ti-calendar-check", variant: "gold" },
          { num: toAr(submittedCount), label: "واجبات أرسلتها", icon: "ti-microphone", variant: "blue" },
          { num: pct(student?.progressPct ?? 0), label: "نسبة الإنجاز", icon: "ti-chart-bar" },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card icon="ti-book" title="خطتي الحالية">
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>
              التقدم نحو الهدف السنوي
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green)" }}>
              {pct(student?.progressPct ?? 0)}
            </div>
            <div style={{ margin: "10px auto", maxWidth: 200 }}>
              <ProgressBar pct={student?.progressPct ?? 0} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>
              {toAr(pages)} صفحة من {toAr(totalPages)} صفحة
            </div>
            <div style={{ marginTop: 12 }}>
              <Badge tone="green">{student?.path ?? "—"}</Badge>
            </div>
          </div>
          {student?.lastMemorization && (
            <>
              <hr className="divider" />
              <div style={{ fontSize: 12 }}>
                <HalqaRow label="آخر حفظ" value={student.lastMemorization} />
              </div>
            </>
          )}
        </Card>
        <Card icon="ti-school" title="معلومات حلقتي">
          <div style={{ fontSize: 12 }}>
            <HalqaRow
              label="الحلقة"
              value={getName(student?.halqa)}
              valueStyle={{ fontWeight: 700, color: "var(--green)" }}
            />
            <HalqaRow label="المسجد" value={getName(student?.masjid)} />
          </div>
        </Card>
      </div>
    </>
  );
}
