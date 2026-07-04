import { useEffect, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge } from "../../components/common/Badge";
import { ContextPicker, halqaToContext, trackToContext, type TeachingContext } from "../../components/common/ContextPicker";
import { SkeletonCard, SkeletonTable } from "../../components/common/Skeleton";
import { useHalqat } from "../../api/halqat";
import { useSpecialTracks } from "../../api/special-tracks";
import { useStudents } from "../../api/students";
import { ATTENDANCE_PREFILL_TRACK_KEY } from "../../api/attendance";
import { useQuranPlans } from "../../api/quran-plans";
import { useEvaluations, useBulkEvaluate, type BulkEvaluateRecord } from "../../api/evaluations";
import { MAX_SCORES, TOTAL_MAX } from "../../lib/evaluationRubric";
import { SURAHS } from "../../data/surahs";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}

type ScoreCategory = "hifz" | "tajweed" | "talawah";
const CATEGORY_LABELS: Record<ScoreCategory, string> = { hifz: "حفظ", tajweed: "تجويد", talawah: "تلاوة" };

type StudentEval = { attendanceStatus: "حاضر" | "غائب"; hifz: number; tajweed: number; talawah: number };

function fullMarks(): StudentEval {
  return { attendanceStatus: "حاضر", hifz: MAX_SCORES.hifz, tajweed: MAX_SCORES.tajweed, talawah: MAX_SCORES.talawah };
}

function totalOf(e: StudentEval): number {
  if (e.attendanceStatus === "غائب") return 0;
  return MAX_SCORES.attendance + e.hifz + e.tajweed + e.talawah;
}

export function TeacherAttendance() {
  const { user } = usePortal();
  const [selected, setSelected] = useState<TeachingContext | null>(null);

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: user?.profileId });
  const { data: tracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, user?.profileId as string | undefined);

  const contexts: TeachingContext[] = [
    ...halqat.map(halqaToContext),
    ...tracks.map(trackToContext),
  ];

  // Deep link from the Special Tracks page's "تسجيل الحضور" button: skip the
  // picker and jump straight to the attendance list for the track clicked from.
  const [pendingTrackId] = useState(() => {
    const id = sessionStorage.getItem(ATTENDANCE_PREFILL_TRACK_KEY);
    if (id) sessionStorage.removeItem(ATTENDANCE_PREFILL_TRACK_KEY);
    return id;
  });
  useEffect(() => {
    if (!pendingTrackId || selected) return;
    const track = tracks.find((t) => t._id === pendingTrackId);
    if (track) setSelected(trackToContext(track));
  }, [pendingTrackId, selected, tracks]);

  const contextFilter = selected
    ? selected.kind === "halqa" ? { halqa: selected.id } : { specialTrack: selected.id }
    : undefined;

  const { data: students = [], isLoading: loadingStudents } = useStudents(contextFilter);
  const bulkEvaluate = useBulkEvaluate();

  const today = new Date().toISOString().split("T")[0];

  // Today's active memorization plan for this context, so the teacher sees
  // exactly which ayahs/pages are due before scoring hifz — computed server-side
  // (computeTodayAssignment/pageRangeOfAyahRange), never recomputed here.
  const { data: plans = [], isLoading: loadingPlans } = useQuranPlans(contextFilter);
  const todayPlan = plans.find((p) => p.todayAssignment);
  const hasTodayAssignment = !!todayPlan?.todayAssignment;

  // Today's already-saved evaluations for this context, so re-opening the same
  // halqa/track later the same day shows what was actually recorded.
  const { data: savedToday = [] } = useEvaluations(
    contextFilter ? { ...contextFilter, from: today, to: today } : undefined
  );
  const savedById: Record<string, StudentEval> = {};
  for (const r of savedToday) {
    const id = typeof r.student === "string" ? r.student : r.student._id;
    savedById[id] = { attendanceStatus: r.attendanceStatus, hifz: r.scores.hifz, tajweed: r.scores.tajweed, talawah: r.scores.talawah };
  }

  // Full session history for this context (all dates), for the log below the roster.
  const { data: history = [] } = useEvaluations(contextFilter);

  const [overrides, setOverrides] = useState<Record<string, StudentEval>>({});
  const evalFor = (studentId: string): StudentEval => overrides[studentId] ?? savedById[studentId] ?? fullMarks();

  function setAttendance(studentId: string, status: "حاضر" | "غائب") {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...evalFor(studentId), attendanceStatus: status },
    }));
  }
  function setScore(studentId: string, category: ScoreCategory, value: number) {
    setOverrides((prev) => ({ ...prev, [studentId]: { ...evalFor(studentId), [category]: value } }));
  }

  useTopbar(
    "ti-calendar-check",
    selected ? `الحضور والتقييم — ${selected.title}` : "الحضور والتقييم",
    selected ? (
      <div style={{ display: "flex", gap: 8 }}>
        <button className="topbar-btn btn-ghost" onClick={() => { setSelected(null); setOverrides({}); }}>
          <i className="ti ti-arrow-right" /> الحلقات والمسارات
        </button>
        <button
          className="topbar-btn btn-primary"
          onClick={() => {
            const records: BulkEvaluateRecord[] = students.map((s) => {
              const e = evalFor(s._id);
              return {
                student: s._id,
                attendanceStatus: e.attendanceStatus,
                hifz: e.hifz, tajweed: e.tajweed, talawah: e.talawah,
              };
            });
            bulkEvaluate.mutate({
              teacher: user!.profileId as string,
              ...(selected.kind === "halqa" ? { halqa: selected.id } : { specialTrack: selected.id }),
              date: today,
              records,
            });
          }}
          disabled={bulkEvaluate.isPending || !hasTodayAssignment}
        >
          <i className="ti ti-send" />
          {bulkEvaluate.isPending ? "جارٍ الحفظ..." : "حفظ وإرسال إشعارات"}
        </button>
      </div>
    ) : undefined,
  );

  // ── View 1: context selector ──────────────────────────────────────
  if (!selected) {
    if (loadingHalqat || loadingTracks) {
      return <SkeletonCard lines={2} />;
    }
    return (
      <ContextPicker
        contexts={contexts}
        onSelect={setSelected}
        emptyLabel="لا توجد حلقات أو مسارات مسجلة لهذا المعلم"
        heading="اختر الحلقة أو المسار الاستثنائي لتسجيل حضور وتقييم اليوم"
        actionLabel="أخذ الحضور والتقييم"
        actionIcon="ti-calendar-check"
      />
    );
  }

  // ── View 2: attendance + evaluation list ───────────────────────────
  const presentCount = students.filter((s) => evalFor(s._id).attendanceStatus === "حاضر").length;
  const absentCount = students.length - presentCount;

  return (
    <>
      {hasTodayAssignment && (
        <Alert tone="info">
          المقرر اليوم: {surahName(todayPlan!.todayAssignment!.surahStart)} : {todayPlan!.todayAssignment!.ayahStart}
          {" — "}
          {surahName(todayPlan!.todayAssignment!.surahEnd)} : {todayPlan!.todayAssignment!.ayahEnd}
          {" "}(صفحة {todayPlan!.todayAssignment!.pageStart}
          {todayPlan!.todayAssignment!.pageEnd !== todayPlan!.todayAssignment!.pageStart ? ` - ${todayPlan!.todayAssignment!.pageEnd}` : ""})
        </Alert>
      )}
      {!loadingPlans && !hasTodayAssignment && (
        <Alert tone="warning">
          لا يوجد جزء مخصص لليوم لهذه {selected.kind === "halqa" ? "الحلقة" : "المسار"} — لا يمكن تسجيل الحضور والتقييم
          بدون خطة حفظ نشطة تحدد الآيات المطلوبة اليوم. أضف خطة من صفحة "الخطط القرآنية" أولاً.
        </Alert>
      )}
      {(loadingPlans || hasTodayAssignment) && <Card
        icon={selected.kind === "halqa" ? "ti-school" : "ti-calendar-event"}
        title={`${selected.title} — اليوم`}
        headerExtra={
          <span style={{ fontSize: 12, color: "var(--text2)" }}>{today}</span>
        }
      >
        {loadingStudents && (
          <SkeletonTable cols={3} rows={5} />
        )}
        {!loadingStudents && (
          <>
            {students.length > 0 && (
              <div className="att-summary">
                <span className="att-chip">
                  <i className="ti ti-check" /> حاضر: {presentCount}
                </span>
                <span className="att-chip absent">
                  <i className="ti ti-x" /> غائب: {absentCount}
                </span>
                <button
                  className="att-mark-all"
                  onClick={() => {
                    const all: Record<string, StudentEval> = {};
                    students.forEach((s) => { all[s._id] = { ...evalFor(s._id), attendanceStatus: "حاضر" }; });
                    setOverrides(all);
                  }}
                >
                  <i className="ti ti-checks" /> تحديد الكل حاضر
                </button>
              </div>
            )}
            <div className="att-list">
              {students.map((s) => {
                const e = evalFor(s._id);
                const isAbsent = e.attendanceStatus === "غائب";
                const total = totalOf(e);
                return (
                  <div key={s._id} className={`att-row ${isAbsent ? "is-absent" : ""}`}>
                    <div className="att-row-top">
                      <div className="att-avatar">{s.name.trim().charAt(0)}</div>
                      <div className="att-info">
                        <div className="att-name">{s.name}</div>
                        <div className="att-sub">آخر حفظ: {s.lastMemorization || "—"}</div>
                      </div>
                      <div className="att-toggle">
                        <button
                          type="button"
                          className={!isAbsent ? "active present" : ""}
                          onClick={() => setAttendance(s._id, "حاضر")}
                        >
                          <i className="ti ti-check" /> حاضر
                        </button>
                        <button
                          type="button"
                          className={isAbsent ? "active absent" : ""}
                          onClick={() => setAttendance(s._id, "غائب")}
                        >
                          <i className="ti ti-x" /> غائب
                        </button>
                      </div>
                    </div>
                    <div className="eval-scores">
                      {(["hifz", "tajweed", "talawah"] as ScoreCategory[]).map((cat) => (
                        <div key={cat} className="eval-cat">
                          <span className="eval-cat-label">{CATEGORY_LABELS[cat]}</span>
                          <div className="eval-chip-group">
                            {Array.from({ length: MAX_SCORES[cat] + 1 }, (_, n) => n).map((n) => (
                              <button
                                key={n}
                                type="button"
                                className={`eval-chip ${!isAbsent && e[cat] === n ? "active" : ""}`}
                                disabled={isAbsent}
                                onClick={() => setScore(s._id, cat, n)}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <span className={`eval-total ${total === 0 ? "zero" : ""}`}>{total}/{TOTAL_MAX}</span>
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                  لا يوجد طلاب
                </div>
              )}
            </div>
          </>
        )}
      </Card>}
      {bulkEvaluate.isSuccess && (
        <Alert tone="success">
          تم حفظ الحضور والتقييم بنجاح
          {bulkEvaluate.data.notified > 0 && ` وإرسال إشعارات لأولياء أمور ${bulkEvaluate.data.notified} طالب`}.
        </Alert>
      )}
      {bulkEvaluate.isSuccess && bulkEvaluate.data.unnotified.length > 0 && (
        <Alert tone="warning">
          تعذر إرسال إشعار عن: {bulkEvaluate.data.unnotified.map((s) => s.name).join("، ")} — لا يوجد ولي أمر مرتبط بالحساب.
        </Alert>
      )}
      {bulkEvaluate.isError && (
        <Alert tone="warning">{(bulkEvaluate.error as Error).message}</Alert>
      )}

      {history.length > 0 && (
        <Card icon="ti-history" title="سجل الجلسات">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الطالب</th>
                  <th>الحالة</th>
                  <th>حضور</th>
                  <th>حفظ</th>
                  <th>تجويد</th>
                  <th>تلاوة</th>
                  <th>المجموع</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r._id}>
                    <td>{new Date(r.date).toLocaleDateString("ar-SA")}</td>
                    <td>{typeof r.student === "string" ? r.student : r.student.name}</td>
                    <td><Badge tone={r.attendanceStatus === "حاضر" ? "green" : "red"}>{r.attendanceStatus}</Badge></td>
                    <td>{r.scores.attendance}/{MAX_SCORES.attendance}</td>
                    <td>{r.scores.hifz}/{MAX_SCORES.hifz}</td>
                    <td>{r.scores.tajweed}/{MAX_SCORES.tajweed}</td>
                    <td>{r.scores.talawah}/{MAX_SCORES.talawah}</td>
                    <td><strong>{r.total}/{TOTAL_MAX}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
