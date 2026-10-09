import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { AyahBar } from "../../components/common/AyahBar";
import { StatsRow } from "../../components/common/StatsRow";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { HalqaRow } from "../../components/common/HalqaRow";
import { SkeletonStatsRow, SkeletonCard } from "../../components/common/Skeleton";
import { useStudent } from "../../api/students";
import { useHomework } from "../../api/homework";
import { useQuranPlans } from "../../api/quran-plans";
import { useEvaluations } from "../../api/evaluations";
import { toAr, pct, AR_LOCALE } from "../../../lib/format";
import { EmptyState } from "../../components/common/EmptyState";

function getField(v: unknown, field: string): string {
  if (v && typeof v === "object" && field in v) return String((v as Record<string, unknown>)[field]);
  return "—";
}
function getId(v: unknown): string | undefined {
  if (v && typeof v === "object" && "_id" in v) return (v as { _id: string })._id;
  return typeof v === "string" ? v : undefined;
}
function getTrackMasjidName(track: unknown): string {
  if (!track || typeof track !== "object") return "—";
  const m = (track as { masjid?: unknown }).masjid;
  if (m && typeof m === "object" && "name" in m) return (m as { name: string }).name;
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
  const trackId = getId(student?.track);
  const { data: linkedPlans = [] } = useQuranPlans(trackId ? { track: trackId } : undefined);
  const { data: evaluations = [] } = useEvaluations(user?.profileId ? { student: user.profileId } : undefined);

  useTopbar("ti-home", "لوحتي");

  if (isLoading) {
    return (
      <>
        <SkeletonStatsRow />
        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
        <SkeletonCard lines={4} />
      </>
    );
  }

  const submittedCount = homework.filter((h) => h.status === "مراجع").length;
  const juz = student ? Math.round((student.progressPct / 100) * 30) : 0;
  const trackName = getField(student?.track, "title");
  const masjidName = getTrackMasjidName(student?.track);
  const trackDays = linkedPlans[0]?.days.join("، ") ?? "—";
  const trackTime = getField(student?.track, "timeSlot");
  // Excused (مستأذن) sessions are left out of the average; absences count as 0.
  const graded = evaluations.filter((e) => (e.attendanceStatus as string) !== "مستأذن");
  const gradedMax = graded.reduce((a, e) => a + (e.totalMax ?? 10), 0);
  const gradeAvg = gradedMax > 0 ? (graded.reduce((a, e) => a + e.total, 0) / gradedMax) * 100 : null;
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
      <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
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

        {/* معلومات مساري */}
        <Card icon="ti-calendar-event" title="معلومات مساري">
          <div style={{ fontSize: 12 }}>
            <HalqaRow label="المسار" value={trackName} valueStyle={{ fontWeight: 700, color: "var(--green)" }} />
            <HalqaRow label="المسجد" value={masjidName} />
            {trackDays !== "—" && <HalqaRow label="المواعيد" value={`${trackDays} | ${trackTime}`} />}
          </div>
          <hr className="divider" />
          {isTopStudent && (
            <div className="alert alert-success" style={{ margin: 0 }}>
              <i className="ti ti-star" />
              <div>أنت من أفضل طلاب المسار هذا الأسبوع!</div>
            </div>
          )}
        </Card>
      </div>

      {/* درجاتي */}
      <Card
        icon="ti-star"
        title="درجاتي"
        headerExtra={gradeAvg !== null && <Badge tone="gold">المعدل العام: {pct(gradeAvg)}</Badge>}
      >
        {evaluations.length === 0 ? (
          <EmptyState compact icon="ti-star" title="لا توجد تقييمات بعد" description="تظهر درجاتك هنا بعد أول جلسة" />
        ) : (
          <div style={{ fontSize: 13, maxHeight: 360, overflowY: "auto" }}>
            {evaluations.map((e, i) => {
              const status = e.attendanceStatus as string;
              return (
                <div
                  key={e._id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "9px 0",
                    borderBottom: i < evaluations.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span style={{ color: "var(--text3)", fontSize: 11, minWidth: 70, marginTop: 1 }}>
                    {new Date(e.date).toLocaleDateString(AR_LOCALE)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Badge tone={status === "حاضر" ? "green" : status === "غائب" ? "red" : "gray"}>
                      {status === "مستأذن" ? "مستأذن (بعذر)" : status}
                    </Badge>
                    {e.note && <div style={{ color: "var(--text2)", fontSize: 12, marginTop: 4 }}>{e.note}</div>}
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--green)", whiteSpace: "nowrap" }}>
                    {status === "مستأذن" ? "—" : `${toAr(e.total)} / ${toAr(e.totalMax ?? 10)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
