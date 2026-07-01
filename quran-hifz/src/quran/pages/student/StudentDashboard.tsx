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
function getField(v: unknown, field: string): string {
  if (v && typeof v === "object" && field in v) return String((v as Record<string, unknown>)[field]);
  return "—";
}

const ACTIVITIES = [
  { date: "أمس",      text: "أرسلت واجب الحفظ",         tone: "green" as const },
  { date: "الأحد",   text: "حضرت حلقة الفجر",            tone: "green" as const },
  { date: "السبت",   text: "تقييم الأستاذ: ممتاز ⭐⭐⭐⭐⭐", tone: "gold"  as const },
  { date: "الخميس",  text: "أرسلت واجب المراجعة البعيدة", tone: "blue"  as const },
];

export function StudentDashboard() {
  const { user } = usePortal();
  const { data: student, isLoading } = useStudent(user?.profileId);
  const { data: homework = [] } = useHomework({ student: user?.profileId });

  useTopbar("ti-home", "لوحتي");

  if (isLoading) {
    return (
      <div className="page-loading">
        <i className="ti ti-loader-2" /> جارٍ التحميل...
      </div>
    );
  }

  const submittedCount = homework.filter((h) => h.status === "مراجع").length;
  const juz = student ? Math.round((student.progressPct / 100) * 30) : 0;
  const halqaName = getName(student?.halqa);
  const masjidName = getName(student?.masjid);
  const halqaDays = getField(student?.halqa, "days");
  const halqaTime = getField(student?.halqa, "time");
  const isTopStudent = (student?.attendancePct ?? 0) >= 90 && (student?.progressPct ?? 0) >= 60;

  return (
    <>
      <AyahBar />
      <StatsRow
        items={[
          { num: toAr(juz),                          label: "جزءاً محفوظاً",        icon: "ti-book" },
          { num: pct(student?.attendancePct ?? 0),   label: "نسبة حضوري",           icon: "ti-calendar-check", variant: "gold" },
          { num: toAr(submittedCount),                label: "واجبات أرسلتها",       icon: "ti-microphone",     variant: "blue" },
          { num: "٢",                                 label: "أيام للموعد القادم",   icon: "ti-clock" },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* خطتي الحالية */}
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
              {toAr(juz)} جزء من ٣٠ جزء المستهدف
            </div>
            <div style={{ marginTop: 12 }}>
              <Badge tone="green">في المسار</Badge>
            </div>
          </div>
          <hr className="divider" />
          <div style={{ fontSize: 12 }}>
            {student?.lastMemorization && (
              <HalqaRow label="آخر حفظ" value={student.lastMemorization} />
            )}
            <HalqaRow label="الجلسة القادمة" value="الثلاثاء بعد الفجر" />
          </div>
        </Card>

        {/* معلومات حلقتي */}
        <Card icon="ti-school" title="معلومات حلقتي">
          <div style={{ fontSize: 12 }}>
            <HalqaRow label="الحلقة" value={halqaName} valueStyle={{ fontWeight: 700, color: "var(--green)" }} />
            <HalqaRow label="المسجد" value={masjidName} />
            {halqaDays !== "—" && <HalqaRow label="المواعيد" value={`${halqaDays} | ${halqaTime}`} />}
          </div>
          <hr className="divider" />
          {isTopStudent && (
            <div className="alert alert-success" style={{ margin: 0 }}>
              <i className="ti ti-star" />
              <div>أنت من أفضل طلاب الحلقة هذا الأسبوع!</div>
            </div>
          )}
        </Card>
      </div>

      {/* آخر الأنشطة */}
      <Card icon="ti-history" title="آخر الأنشطة">
        <div style={{ fontSize: 13 }}>
          {ACTIVITIES.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "9px 0",
                borderBottom: i < ACTIVITIES.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ color: "var(--text3)", fontSize: 11, minWidth: 45, marginTop: 1 }}>
                {a.date}
              </span>
              <span style={{ color: "var(--text)", flex: 1 }}>{a.text}</span>
              <span
                style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                  background: a.tone === "gold" ? "var(--gold)" : a.tone === "blue" ? "#3b82f6" : "var(--green)",
                }}
              />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
