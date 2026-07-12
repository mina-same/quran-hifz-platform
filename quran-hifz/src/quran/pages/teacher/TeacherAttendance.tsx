import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge } from "../../components/common/Badge";
import {
  ContextPicker,
  halqaToContext,
  trackToContext,
  type TeachingContext,
} from "../../components/common/ContextPicker";
import { SkeletonCard, SkeletonTable } from "../../components/common/Skeleton";
import { Leaderboard } from "../../components/common/Leaderboard";
import { IndividualPlanPanel, planCoversStudent } from "../../components/common/IndividualPlanPanel";
import { useHalqat } from "../../api/halqat";
import { useSpecialTracks } from "../../api/special-tracks";
import { useStudents } from "../../api/students";
import { ATTENDANCE_PREFILL_TRACK_KEY } from "../../api/attendance";
import { useQuranPlans, type ScheduleEntry } from "../../api/quran-plans";
import { useEvaluations, useBulkEvaluate, type BulkEvaluateRecord } from "../../api/evaluations";
import { useRecordStudentOccurrence, useStudentPlanProgressList } from "../../api/student-plan-progress";
import { MAX_SCORES, TOTAL_MAX } from "../../lib/evaluationRubric";
import { SURAHS } from "../../data/surahs";
import { toAr, pct } from "../../../lib/format";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
}

// Matches the server's ARABIC_WEEKDAYS (attendance.controller.ts), indexed by
// Date.getDay(): 0=الأحد (Sunday) … 6=السبت (Saturday).
const ARABIC_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function weekdayOf(iso: string): string {
  return ARABIC_WEEKDAYS[new Date(iso + "T00:00:00").getDay()];
}
/** Add `n` calendar days to a bare YYYY-MM-DD string using pure UTC arithmetic.
 *  Building the Date via local midnight (`new Date(iso + "T00:00:00")`) then
 *  reading it back via `toISOString()` (UTC) is NOT a no-op round trip for any
 *  timezone ahead of UTC (e.g. Cairo/Riyadh, UTC+2/+3): local midnight of day X
 *  converts to UTC as day X-1 at (24-offset):00, so `addDays(X, 1)` silently
 *  returned X again — a fixed point that froze the entire day-slider on one
 *  repeated date. Date.UTC(...) sidesteps local time entirely so the result
 *  never depends on the browser's offset. */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split("T")[0];
}
/** Normalize any date-ish string (full ISO timestamp OR bare YYYY-MM-DD) to a
 *  bare `YYYY-MM-DD` so date math + set keys are consistent. The server stores
 *  schedule dates as full ISO timestamps, so without this `new Date(iso + "T00:00:00")`
 *  double-appends a time component and yields an Invalid Date → page crash. */
function toDateOnly(s: string): string {
  return String(s).slice(0, 10);
}
function fmtDate(iso: string): string {
  return toAr(
    new Date(iso + "T00:00:00").toLocaleDateString("ar-SA", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
}

type DayChip = { iso: string; weekday: string; dayNum: number; isToday: boolean };
function buildDayChips(minIso: string, maxIso: string, today: string): DayChip[] {
  const out: DayChip[] = [];
  let cur = minIso;
  let guard = 0;
  while (cur <= maxIso && guard < 1095) {
    const d = new Date(cur + "T00:00:00");
    out.push({ iso: cur, weekday: weekdayOf(cur), dayNum: d.getDate(), isToday: cur === today });
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

type ScoreCategory = "hifz" | "tajweed" | "talawah";
const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  hifz: "حفظ",
  tajweed: "تجويد",
  talawah: "تلاوة",
};

type StudentEval = {
  attendanceStatus: "حاضر" | "غائب";
  hifz: number;
  tajweed: number;
  talawah: number;
};

/** Default eval for a present student — scores start at 0 so the teacher
 *  consciously awards points rather than every student defaulting to full marks. */
function blankEval(): StudentEval {
  return { attendanceStatus: "حاضر", hifz: 0, tajweed: 0, talawah: 0 };
}

function totalOf(e: StudentEval): number {
  if (e.attendanceStatus === "غائب") return 0;
  return MAX_SCORES.attendance + e.hifz + e.tajweed + e.talawah;
}

export function TeacherAttendance() {
  const { user } = usePortal();
  const teacherId = user?.profileId as string | undefined;
  const [selected, setSelected] = useState<TeachingContext | null>(null);

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: teacherId });
  const { data: tracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, teacherId);

  const contexts: TeachingContext[] = [
    ...halqat.map(halqaToContext),
    ...tracks.map(trackToContext),
  ];

  // Deep link from the Special Tracks page's "تسجيل الحضور" button.
  // Applied at most once (ref-guarded) so the teacher's explicit "رجوع" click
  // (which sets selected=null) isn't overridden by the effect re-running and
  // re-selecting the deep-linked track.
  const [pendingTrackId] = useState(() => {
    const id = sessionStorage.getItem(ATTENDANCE_PREFILL_TRACK_KEY);
    if (id) sessionStorage.removeItem(ATTENDANCE_PREFILL_TRACK_KEY);
    return id;
  });
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current || !pendingTrackId) return;
    const track = tracks.find((t) => t._id === pendingTrackId);
    if (track) {
      setSelected(trackToContext(track));
      prefillApplied.current = true;
    }
  }, [pendingTrackId, tracks]);

  const contextFilter = selected
    ? selected.kind === "halqa"
      ? { halqa: selected.id }
      : { specialTrack: selected.id }
    : undefined;

  const { data: students = [], isLoading: loadingStudents } = useStudents(contextFilter);
  const bulkEvaluate = useBulkEvaluate();
  const recordOccurrence = useRecordStudentOccurrence();

  // Local calendar date, not UTC (`toISOString()` lags a day behind local wall-clock
  // time for the first `offset` hours of each day in any UTC+ timezone).
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // All active memorization plans for this context. Each plan carries a
  // `schedule` (server-computed list of every occurrence's date + ayah slice +
  // juz'), which is the source of truth for which days have an assignment.
  const { data: plans = [], isLoading: loadingPlans } = useQuranPlans(contextFilter);
  // The plan whose target actually matches this context (a halqa/track can
  // still carry other stray plans) — the one individual per-student plans
  // (below) hang off of, same "one linked plan" model as TeacherTrackDetail.
  const linkedPlan = plans.find((p) => p.targetType === (selected?.kind === "specialTrack" ? "specialTrack" : "halqa")) ?? plans[0];

  // Day slider state — "" means "not yet chosen", falls back to defaultDate.
  const [selectedDate, setSelectedDate] = useState("");

  const { scheduledSet, scheduledSorted, assignmentByDate, dayChips, effectiveDate } =
    useMemo(() => {
      const set = new Set<string>();
      const byDate = new Map<string, ScheduleEntry>();
      for (const p of plans) {
        for (const e of p.schedule ?? []) {
          if (!e.date) continue;
          const d = toDateOnly(e.date);
          set.add(d);
          if (!byDate.has(d)) byDate.set(d, e);
        }
      }
      const sorted = Array.from(set).sort();
      const chips = sorted.length ? buildDayChips(sorted[0], sorted[sorted.length - 1], today) : [];
      // Default to the latest scheduled day ≤ today; if none past, the first
      // upcoming scheduled day. Always lands on a planned day so the roster
      // opens with a real assignment instead of a "no plan" warning.
      let dflt = sorted.length ? sorted[0] : today;
      if (sorted.length) {
        const pastOrToday = sorted.filter((d) => d <= today);
        dflt = pastOrToday.length ? pastOrToday[pastOrToday.length - 1] : sorted[0];
      }
      const effective = selectedDate && set.has(selectedDate) ? selectedDate : dflt;
      return {
        scheduledSet: set,
        scheduledSorted: sorted,
        assignmentByDate: byDate,
        dayChips: chips,
        effectiveDate: effective,
      };
    }, [plans, selectedDate, today]);

  // Each covered student can have their own effective schedule (absence/
  // shortfall reflow, manual per-student overrides) once they have an
  // individual plan overlay — fetch every covered student's own progress in
  // one batched hook call, same as TeacherTrackDetail's students tab.
  const coveredStudentIds = useMemo(() => {
    if (!linkedPlan) return [];
    return students.map((s) => s._id).filter((id) => planCoversStudent(linkedPlan, id));
  }, [students, linkedPlan]);
  const progressByStudentId = useStudentPlanProgressList(linkedPlan?._id, coveredStudentIds);

  // Which student's row is expanded — collapsed rows show only avatar/name/status
  // summary, matching the roster list on the Special Track detail page's "الطلاب" tab.
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  function toggleStudent(id: string) {
    setExpandedStudentId((prev) => (prev === id ? null : id));
  }
  // Which student's individual-plan panel is open (at most one at a time).
  const [planPanelStudentId, setPlanPanelStudentId] = useState<string | null>(null);
  function togglePlanPanel(id: string) {
    setPlanPanelStudentId((cur) => (cur === id ? null : id));
  }

  // Reset per-student edits when the effective day changes so Monday's edits
  // don't leak into Tuesday's roster for the same students.
  useEffect(() => {
    setOverrides({});
    setCompletionOverrides({});
    setDayNotice(null);
    setUnlockedIds(new Set());
    setExpandedStudentId(null);
  }, [effectiveDate]);

  // Once a student's save succeeds, re-lock their row automatically —
  // reopening it again requires an explicit "تعديل" tap, same "sent once"
  // guard as before but scoped to a single student instead of the whole day.
  useEffect(() => {
    if (bulkEvaluate.isSuccess && lastSavedId) {
      setUnlockedIds((prev) => {
        if (!prev.has(lastSavedId)) return prev;
        const next = new Set(prev);
        next.delete(lastSavedId);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkEvaluate.isSuccess]);

  // Auto-scroll the active day chip into view whenever the effective day changes
  // (the slider can span months — without this the selected day stays off-screen).
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = trackRef.current?.querySelector(".day-chip.active") as HTMLElement | null;
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [effectiveDate, dayChips]);

  // Already-saved evaluations for the selected day, so re-opening the same
  // halqa/track/day shows what was actually recorded.
  const { data: savedToday = [] } = useEvaluations(
    contextFilter ? { ...contextFilter, from: effectiveDate, to: effectiveDate } : undefined,
  );
  const savedById: Record<string, StudentEval> = {};
  for (const r of savedToday) {
    const id = typeof r.student === "string" ? r.student : r.student._id;
    savedById[id] = {
      attendanceStatus: r.attendanceStatus,
      hifz: r.scores.hifz,
      tajweed: r.scores.tajweed,
      talawah: r.scores.talawah,
    };
  }

  // Full session history for this context (all dates), for the log below.
  const { data: history = [] } = useEvaluations(contextFilter);

  // Per-student rollup from the same history — top score + best attendance,
  // no extra API calls.
  const { topScoreRows, topAttendanceRows } = useMemo(() => {
    type Agg = { id: string; name: string; totalSum: number; sessions: number; present: number };
    const byStudent = new Map<string, Agg>();
    for (const r of history) {
      const id = typeof r.student === "string" ? r.student : r.student._id;
      const name = typeof r.student === "string" ? r.student : r.student.name;
      const agg = byStudent.get(id) ?? { id, name, totalSum: 0, sessions: 0, present: 0 };
      agg.totalSum += r.total;
      agg.sessions += 1;
      if (r.attendanceStatus === "حاضر") agg.present += 1;
      byStudent.set(id, agg);
    }
    const all = Array.from(byStudent.values());

    const byScore = [...all]
      .sort((a, b) => b.totalSum / b.sessions - a.totalSum / a.sessions)
      .slice(0, 3)
      .map((a) => {
        const avg = a.totalSum / a.sessions;
        return {
          id: a.id,
          name: a.name,
          subtitle: a.sessions === 1 ? "جلسة واحدة" : `متوسط ${toAr(a.sessions)} جلسات`,
          meter: (avg / TOTAL_MAX) * 100,
          display: `${toAr(Math.round(avg))}/${toAr(TOTAL_MAX)}`,
        };
      });

    const byAttendance = [...all]
      .sort((a, b) => b.present / b.sessions - a.present / a.sessions)
      .slice(0, 3)
      .map((a) => {
        const rate = (a.present / a.sessions) * 100;
        return {
          id: a.id,
          name: a.name,
          subtitle: `${toAr(a.present)} من ${toAr(a.sessions)} جلسة`,
          meter: rate,
          display: pct(rate),
        };
      });

    return { topScoreRows: byScore, topAttendanceRows: byAttendance };
  }, [history]);

  const [overrides, setOverrides] = useState<Record<string, StudentEval>>({});
  // Which mushaf page each student actually reached today — defaults to the
  // day's full assigned pageEnd (i.e. "finished it all") until the teacher
  // pulls it back for a student who fell short.
  const [completionOverrides, setCompletionOverrides] = useState<Record<string, number>>({});
  // Transient message when the teacher taps a day-chip that isn't part of the
  // plan — those chips are visually disabled but still clickable so the click
  // can explain *why*, instead of silently doing nothing.
  const [dayNotice, setDayNotice] = useState<string | null>(null);
  // Per-student re-open guard — a saved student's row stays read-only until
  // the teacher explicitly taps "تعديل" for that student.
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const evalFor = (studentId: string): StudentEval =>
    overrides[studentId] ?? savedById[studentId] ?? blankEval();

  function setAttendance(studentId: string, status: "حاضر" | "غائب") {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...evalFor(studentId), attendanceStatus: status },
    }));
  }
  function setScore(studentId: string, category: ScoreCategory, value: number) {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...evalFor(studentId), [category]: value },
    }));
  }
  function unlockStudent(studentId: string) {
    setUnlockedIds((prev) => new Set(prev).add(studentId));
  }
  function completedPageFor(studentId: string, forAssignment: ScheduleEntry): number {
    return completionOverrides[studentId] ?? forAssignment.pageEnd;
  }
  function setCompletedPage(studentId: string, page: number) {
    setCompletionOverrides((prev) => ({ ...prev, [studentId]: page }));
  }
  // Each student's own assigned portion for the selected day — falls back to
  // the shared plan schedule (assignmentByDate) for anyone with no individual
  // overlay yet, matching the API's own graceful-degradation behavior.
  function assignmentForStudent(studentId: string): ScheduleEntry | undefined {
    const perStudent = progressByStudentId[studentId]?.effectiveSchedule.find((o) => toDateOnly(o.date) === effectiveDate);
    return perStudent ?? assignmentByDate.get(effectiveDate);
  }

  const isFutureDay = effectiveDate > today;

  function saveStudent(studentId: string, studentName: string) {
    if (isFutureDay || !selected) return;
    const e = evalFor(studentId);
    const records: BulkEvaluateRecord[] = [{
      student: studentId,
      attendanceStatus: e.attendanceStatus,
      hifz: e.hifz,
      tajweed: e.tajweed,
      talawah: e.talawah,
    }];
    setLastSavedId(studentId);
    const toastId = toast.loading("جاري حفظ الحضور والتقييم...");
    bulkEvaluate.mutate(
      {
        teacher: teacherId!,
        ...(selected.kind === "halqa" ? { halqa: selected.id } : { specialTrack: selected.id }),
        date: effectiveDate,
        records,
      },
      {
        onSuccess: () => {
          // Feed the day's outcome into the student's individual plan overlay so
          // an absence or a partial completion gets redistributed across their
          // remaining days — only meaningful when there's an assigned portion.
          const studentAssignment = linkedPlan && planCoversStudent(linkedPlan, studentId) ? assignmentForStudent(studentId) : undefined;
          if (!linkedPlan || !studentAssignment) {
            toast.success("تم الحفظ بنجاح", { id: toastId });
            return;
          }
          const completedThroughPage = completedPageFor(studentId, studentAssignment);
          const status = e.attendanceStatus === "غائب" ? "absent" : completedThroughPage < studentAssignment.pageEnd ? "partial" : "done";

          if (status === "done") {
            toast.success("تم حفظ الحضور والتقييم بنجاح", { id: toastId });
            recordOccurrence.mutate({ planId: linkedPlan._id, studentId, occurrenceIndex: studentAssignment.occurrenceIndex, status });
            return;
          }

          toast.loading(
            status === "absent"
              ? `جاري إضافة الورد الغائب إلى خطة ${studentName}...`
              : `جاري إضافة الورد الناقص إلى خطة ${studentName}...`,
            { id: toastId },
          );
          recordOccurrence.mutate(
            {
              planId: linkedPlan._id, studentId, occurrenceIndex: studentAssignment.occurrenceIndex,
              status, completedThroughPage: status === "partial" ? completedThroughPage : undefined,
            },
            {
              onSuccess: (res) => {
                toast.success(
                  status === "absent"
                    ? `تم الحفظ، وتم توزيع الورد الغائب على باقي أيام خطة ${studentName}`
                    : `تم الحفظ، وتم توزيع الورد الناقص على باقي أيام خطة ${studentName}`,
                  { id: toastId },
                );
                if (res.data.overflowPages > 0) {
                  toast.warning(`لا يوجد مكان كافٍ لتوزيع كل الورد الناقص — أضف يومًا جديدًا لخطة ${studentName}`);
                }
              },
              onError: (err) => toast.error((err as Error).message, { id: toastId }),
            },
          );
        },
        onError: (err) => toast.error((err as Error).message, { id: toastId }),
      },
    );
  }

  useTopbar(
    "ti-calendar-check",
    selected ? `الحضور والتقييم — ${selected.title}` : "الحضور والتقييم",
    selected ? (
      <button
        className="topbar-btn btn-ghost"
        onClick={() => {
          setSelected(null);
          setOverrides({});
          setSelectedDate("");
        }}
      >
        <i className="ti ti-arrow-right" /> الحلقات والمسارات
      </button>
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

  // ── View 2: day slider + per-student attendance/evaluation/plan roster ──
  return (
    <>
      {/* Day slider — only when there are scheduled days for this context */}
      {loadingPlans ? (
        <SkeletonCard lines={1} />
      ) : scheduledSorted.length > 0 ? (
        <div className="day-slider" role="tablist" aria-label="اختر اليوم">
          <button
            type="button"
            className="day-slider-arrow"
            onClick={() => {
              const i = scheduledSorted.indexOf(effectiveDate);
              if (i > 0) setSelectedDate(scheduledSorted[i - 1]);
            }}
            disabled={scheduledSorted.indexOf(effectiveDate) <= 0}
            aria-label="اليوم السابق"
          >
            <i className="ti ti-chevron-right" />
          </button>
          <div className="day-slider-track" ref={trackRef}>
            {dayChips.map((d) => {
              const enabled = scheduledSet.has(d.iso);
              const isSel = d.iso === effectiveDate;
              return (
                <button
                  key={d.iso}
                  type="button"
                  role="tab"
                  aria-selected={isSel}
                  aria-disabled={!enabled}
                  className={`day-chip ${isSel ? "active" : ""} ${d.isToday ? "is-today" : ""} ${!enabled ? "not-planned" : ""}`}
                  onClick={() => {
                    if (!enabled) {
                      setDayNotice(`${fmtDate(d.iso)} — هذا اليوم غير مشمول بخطة الحفظ الحالية`);
                      return;
                    }
                    setDayNotice(null);
                    setSelectedDate(d.iso);
                  }}
                  title={enabled ? fmtDate(d.iso) : "لا يوجد خطة لهذا اليوم"}
                >
                  <span className="day-chip-wd">{d.weekday}</span>
                  <span className="day-chip-num">{toAr(d.dayNum)}</span>
                  {d.isToday && <span className="day-chip-today-dot" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="day-slider-arrow"
            onClick={() => {
              const i = scheduledSorted.indexOf(effectiveDate);
              if (i >= 0 && i < scheduledSorted.length - 1) setSelectedDate(scheduledSorted[i + 1]);
            }}
            disabled={scheduledSorted.indexOf(effectiveDate) >= scheduledSorted.length - 1}
            aria-label="اليوم التالي"
          >
            <i className="ti ti-chevron-left" />
          </button>
        </div>
      ) : null}

      {dayNotice && (
        <Alert tone="warning" icon="ti-calendar-off">
          {dayNotice}
        </Alert>
      )}

      {!loadingPlans && scheduledSorted.length === 0 && (
        <Alert tone="warning">
          لا يوجد خطة حفظ نشطة لهذه {selected.kind === "halqa" ? "الحلقة" : "المسار"} — لا يمكن تحديد
          يوم محدد لتسجيل الحضور والتقييم، لكن يمكنك تسجيل حضور اليوم مباشرة أدناه. أضف خطة من صفحة
          "الخطط القرآنية" أولاً لتفعيل التقويم.
        </Alert>
      )}

      {isFutureDay && (
        <Alert tone="warning" icon="ti-clock">
          هذا اليوم لم يحن بعد — لا يمكن تسجيل الحضور والتقييم مسبقًا لجلسة لم تُعقد.
        </Alert>
      )}

      {(loadingPlans || scheduledSorted.length > 0) && (
        <Card
          icon={selected.kind === "halqa" ? "ti-school" : "ti-calendar-event"}
          title={selected.title}
          headerExtra={
            <span style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(effectiveDate)}</span>
          }
        >
          {loadingStudents ? (
            <SkeletonTable cols={3} rows={5} />
          ) : students.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>لا يوجد طلاب</div>
          ) : (
            <div className="att-list">
              {students.map((s) => {
                const e = evalFor(s._id);
                const isAbsent = e.attendanceStatus === "غائب";
                const total = totalOf(e);
                const isExpanded = expandedStudentId === s._id;
                const hasSaved = !!savedById[s._id];
                const isUnlocked = unlockedIds.has(s._id);
                const controlsLocked = isFutureDay || (hasSaved && !isUnlocked);
                const hasIndividualPlan = !!linkedPlan && planCoversStudent(linkedPlan, s._id);
                const assignment = hasIndividualPlan ? assignmentForStudent(s._id) : undefined;
                return (
                  <div key={s._id} className={`att-row ${isAbsent && isExpanded ? "is-absent" : ""}`}>
                    <div className="att-row-top" style={{ cursor: "pointer" }} onClick={() => toggleStudent(s._id)}>
                      <div className="att-avatar">{avatarInitials(s.name)}</div>
                      <div className="att-info">
                        <div className="att-name">{s.name}</div>
                        <div className="att-sub">
                          {hasSaved
                            ? `${e.attendanceStatus} — ${toAr(total)}/${toAr(TOTAL_MAX)}${isUnlocked ? " (وضع التعديل)" : ""}`
                            : "لم يُسجَّل لهذا اليوم بعد"}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="topbar-btn btn-ghost"
                        style={{ padding: "6px 10px" }}
                        onClick={(ev) => { ev.stopPropagation(); toggleStudent(s._id); }}
                        aria-label={isExpanded ? "طي" : "توسيع"}
                      >
                        <i className={`ti ${isExpanded ? "ti-chevron-up" : "ti-chevron-down"}`} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: "10px 2px 4px" }}>
                        {assignment ? (
                          <div className="assignment-banner" style={{ marginBottom: 10 }}>
                            <div className="assignment-icon">
                              <i className="ti ti-book-2" />
                            </div>
                            <div className="assignment-body">
                              <div className="assignment-label">
                                <i className="ti ti-clipboard-text" /> الورد المقرر
                              </div>
                              <div className="assignment-range">
                                <span>{surahName(assignment.surahStart)} : {toAr(assignment.ayahStart)}</span>
                                <i className="ti ti-arrow-left assignment-arrow" />
                                <span>{surahName(assignment.surahEnd)} : {toAr(assignment.ayahEnd)}</span>
                              </div>
                            </div>
                            <div className="assignment-meta">
                              <span className="assignment-pill">
                                <i className="ti ti-file-text" />
                                {assignment.pageEnd !== assignment.pageStart
                                  ? `من صفحة ${toAr(assignment.pageStart)} إلى صفحة ${toAr(assignment.pageEnd)}`
                                  : `صفحة ${toAr(assignment.pageStart)}`}
                              </span>
                              <span className="assignment-pill">
                                <i className="ti ti-bookmark" />
                                الجزء {toAr(assignment.juz)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>لا يوجد جزء مخصص لهذا اليوم</div>
                        )}

                        {hasSaved && !isUnlocked && !isFutureDay && (
                          <Alert tone="success" icon="ti-lock" style={{ marginBottom: 10 }}>
                            تم تسجيل حضور وتقييم {s.name} لهذا اليوم. اضغط "تعديل" لتصحيح البيانات.
                          </Alert>
                        )}

                        <div className="att-toggle" style={{ display: "inline-flex", marginBottom: 10 }}>
                          <button type="button" disabled={controlsLocked} className={!isAbsent ? "active present" : ""} onClick={() => setAttendance(s._id, "حاضر")}>
                            <i className="ti ti-check" /> حاضر
                          </button>
                          <button type="button" disabled={controlsLocked} className={isAbsent ? "active absent" : ""} onClick={() => setAttendance(s._id, "غائب")}>
                            <i className="ti ti-x" /> غائب
                          </button>
                        </div>

                        {!isAbsent && assignment && (() => {
                          const actualPage = completedPageFor(s._id, assignment);
                          const isFull = actualPage >= assignment.pageEnd;
                          const shortfall = assignment.pageEnd - actualPage;
                          return (
                            <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", display: "block", marginBottom: 6 }}>
                                <i className="ti ti-bookmark" style={{ marginLeft: 4, color: "var(--green)" }} /> الورد الفعلي — الصفحة التي وصل إليها الطالب
                              </label>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <input
                                  type="number" className="form-input" style={{ width: 90, fontSize: 12, padding: "6px 8px" }}
                                  min={assignment.pageStart} max={assignment.pageEnd} disabled={controlsLocked}
                                  value={actualPage}
                                  onChange={(ev) => setCompletedPage(s._id, Math.max(assignment.pageStart, Math.min(assignment.pageEnd, Number(ev.target.value) || assignment.pageStart)))}
                                />
                                <span style={{ fontSize: 11, color: "var(--text3)" }}>من {toAr(assignment.pageStart)} إلى {toAr(assignment.pageEnd)}</span>
                                {!isFull && !controlsLocked && (
                                  <button
                                    type="button"
                                    className="topbar-btn btn-ghost"
                                    style={{ fontSize: 11, padding: "4px 10px" }}
                                    onClick={() => setCompletedPage(s._id, assignment.pageEnd)}
                                  >
                                    الورد كامل
                                  </button>
                                )}
                              </div>
                              <div style={{ fontSize: 11, marginTop: 6, color: isFull ? "var(--green)" : "#b45309" }}>
                                {isFull
                                  ? <><i className="ti ti-check" style={{ marginLeft: 3 }} />سيُسجَّل كمكتمل</>
                                  : <><i className="ti ti-arrow-forward-up" style={{ marginLeft: 3 }} />سيتم تعويض {toAr(shortfall)} صفحة في باقي أيام خطته</>
                                }
                              </div>
                            </div>
                          );
                        })()}

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
                                    disabled={isAbsent || controlsLocked}
                                    onClick={() => setScore(s._id, cat, n)}
                                  >
                                    {toAr(n)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          <span className={`eval-total ${total === 0 ? "zero" : ""}`}>{toAr(total)}/{toAr(TOTAL_MAX)}</span>
                        </div>

                        {hasIndividualPlan && (
                          <button
                            type="button"
                            className="topbar-btn btn-ghost"
                            style={{ fontSize: 11, padding: "5px 10px", marginBottom: 4 }}
                            onClick={(ev) => { ev.stopPropagation(); togglePlanPanel(s._id); }}
                          >
                            {planPanelStudentId === s._id
                              ? <><i className="ti ti-chevron-up" /> إخفاء الخطة الفردية</>
                              : progressByStudentId[s._id]?.progressIsPersisted
                                ? <><i className="ti ti-list-details" /> عرض الخطة الفردية</>
                                : <><i className="ti ti-plus" /> أنشئ خطة فردية</>
                            }
                          </button>
                        )}

                        {hasIndividualPlan && linkedPlan && planPanelStudentId === s._id && (
                          <IndividualPlanPanel planId={linkedPlan._id} studentId={s._id} studentName={s.name} basePlan={linkedPlan} />
                        )}

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                          {isFutureDay ? (
                            <button className="topbar-btn btn-ghost" style={{ padding: "8px 18px" }} disabled>
                              <i className="ti ti-clock" /> اليوم لم يحن بعد
                            </button>
                          ) : hasSaved && !isUnlocked ? (
                            <button className="topbar-btn btn-ghost" style={{ padding: "8px 18px" }} onClick={() => unlockStudent(s._id)}>
                              <i className="ti ti-edit" /> تعديل
                            </button>
                          ) : (
                            <button className="topbar-btn btn-primary" style={{ padding: "8px 18px" }} onClick={() => saveStudent(s._id, s.name)} disabled={bulkEvaluate.isPending}>
                              {bulkEvaluate.isPending && lastSavedId === s._id
                                ? <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> جارٍ الحفظ...</>
                                : isUnlocked
                                  ? <><i className="ti ti-device-floppy" /> حفظ التعديلات</>
                                  : <><i className="ti ti-device-floppy" /> حفظ لهذا الطالب</>
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
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
                    <td>{toAr(new Date(r.date).toLocaleDateString("ar-SA"))}</td>
                    <td>{typeof r.student === "string" ? r.student : r.student.name}</td>
                    <td>
                      <Badge tone={r.attendanceStatus === "حاضر" ? "green" : "red"}>
                        {r.attendanceStatus}
                      </Badge>
                    </td>
                    <td>
                      {toAr(r.scores.attendance)}/{toAr(MAX_SCORES.attendance)}
                    </td>
                    <td>
                      {toAr(r.scores.hifz)}/{toAr(MAX_SCORES.hifz)}
                    </td>
                    <td>
                      {toAr(r.scores.tajweed)}/{toAr(MAX_SCORES.tajweed)}
                    </td>
                    <td>
                      {toAr(r.scores.talawah)}/{toAr(MAX_SCORES.talawah)}
                    </td>
                    <td>
                      <strong>
                        {toAr(r.total)}/{toAr(TOTAL_MAX)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(topScoreRows.length > 0 || topAttendanceRows.length > 0) && (
        <Card icon="ti-medal" title="أبرز الطلاب">
          <div className="reports-grid grid-collapse">
            <div className="spotlight-col">
              <div className="spotlight-col-title">
                <i className="ti ti-trophy" /> الأعلى تقييمًا
              </div>
              <Leaderboard rows={topScoreRows} emptyText="لا يوجد بيانات كافية بعد" />
            </div>
            <div className="spotlight-col">
              <div className="spotlight-col-title">
                <i className="ti ti-calendar-check" /> الأعلى حضورًا
              </div>
              <Leaderboard rows={topAttendanceRows} emptyText="لا يوجد بيانات كافية بعد" />
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
