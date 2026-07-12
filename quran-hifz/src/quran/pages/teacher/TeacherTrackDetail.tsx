import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Alert } from "../../components/common/Alert";
import { ScopeTabs } from "../../components/common/ScopeTabs";
import { SkeletonCard } from "../../components/common/Skeleton";
import {
  useSpecialTracks,
  TRACK_DETAIL_ID_KEY,
  type SpecialTrack,
  type EnrolledStudent,
  type TrackTeacher,
} from "../../api/special-tracks";
import {
  useQuranPlans,
  useUpdateQuranPlan,
  useGenerateSchedule,
  useUpdateScheduleEntry,
  PLAN_FORM_HANDOFF_KEY,
  type QuranPlan,
  type RangePoint,
  type ScheduleEntry,
} from "../../api/quran-plans";
import { ATTENDANCE_PREFILL_TRACK_KEY } from "../../api/attendance";
import { useEvaluations, useBulkEvaluate, type BulkEvaluateRecord } from "../../api/evaluations";
import { useRecordStudentOccurrence, useStudentPlanProgressList } from "../../api/student-plan-progress";
import { IndividualPlanPanel, planCoversStudent } from "../../components/common/IndividualPlanPanel";
import { MAX_SCORES, TOTAL_MAX } from "../../lib/evaluationRubric";
import { SURAHS } from "../../data/surahs";
import { fractionalPage } from "../../lib/quranRange";
import { toAr } from "../../../lib/format";

/** Formats a schedule day's page position: a clean page boundary shows as a
 * plain integer, a partial (mid-page) position shows one decimal, e.g. `٢.٧`
 * for a day that only covers 70% of page 2. */
function pageLabel(point: { surahNumber: number; ayah: number }, edge: "start" | "end"): string {
  const { value, isPartial } = fractionalPage(point, edge);
  return isPartial ? toAr(value.toFixed(1)) : toAr(value);
}

const compactInputStyle = { fontSize: 12, padding: "6px 8px" };

/** Compact surah+ayah picker for the schedule table's inline row edit — no
 * built-in label (the table column header already says "من"/"إلى"), just the
 * two selects side by side, sized to sit comfortably inside a table cell. */
function CompactSurahAyah({ value, onChange }: { value: RangePoint; onChange: (v: RangePoint) => void }) {
  const surah = SURAHS.find((s) => s.number === value.surahNumber) ?? SURAHS[0];
  function setSurah(surahNumber: number) {
    const s = SURAHS.find((x) => x.number === surahNumber) ?? SURAHS[0];
    onChange({ surahNumber, ayah: Math.min(value.ayah, s.ayahCount) });
  }
  function setAyah(ayah: number) {
    onChange({ ...value, ayah: Math.max(1, Math.min(ayah || 1, surah.ayahCount)) });
  }
  return (
    <div style={{ display: "flex", gap: 5 }}>
      <select className="form-input" style={{ ...compactInputStyle, flex: "1 1 auto", minWidth: 90 }} value={value.surahNumber} onChange={(e) => setSurah(Number(e.target.value))}>
        {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
      </select>
      <select className="form-input" style={{ ...compactInputStyle, width: 62, flexShrink: 0 }} value={value.ayah} onChange={(e) => setAyah(Number(e.target.value))}>
        {Array.from({ length: surah.ayahCount }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}
function getEnrolledName(v: EnrolledStudent | string) {
  return typeof v === "object" ? v.name : v;
}
function getEnrolledId(v: EnrolledStudent | string) {
  return typeof v === "object" ? v._id : v;
}
function getTeacherName(v: TrackTeacher | string) {
  return typeof v === "object" ? v.name : v;
}
function fmtTrackDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
}
const AV = [
  { bg: "var(--green-pale)", fg: "var(--green)" },
  { bg: "var(--gold-pale)", fg: "#92400e" },
  { bg: "#eff6ff", fg: "#1d4ed8" },
  { bg: "#fde8f0", fg: "#9d174d" },
];
const STATUS_CFG = {
  active:   { label: "نشط",   tone: "green" as const, color: "var(--green)" },
  upcoming: { label: "قادم",  tone: "gold"  as const, color: "#d97706" },
  ended:    { label: "منتهي", tone: "gray"  as const, color: "var(--text3)" },
};

/* ─── day-slider helpers, mirrored from TeacherAttendance.tsx ─── */
const ARABIC_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function weekdayOf(iso: string): string {
  return ARABIC_WEEKDAYS[new Date(iso + "T00:00:00").getDay()];
}
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split("T")[0];
}
function toDateOnly(s: string): string {
  return String(s).slice(0, 10);
}
function fmtDayLabel(iso: string): string {
  return toAr(new Date(iso + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" }));
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
const CATEGORY_LABELS: Record<ScoreCategory, string> = { hifz: "حفظ", tajweed: "تجويد", talawah: "تلاوة" };
type StudentEval = { attendanceStatus: "حاضر" | "غائب"; hifz: number; tajweed: number; talawah: number };
function blankEval(): StudentEval {
  return { attendanceStatus: "حاضر", hifz: 0, tajweed: 0, talawah: 0 };
}
function totalOf(e: StudentEval): number {
  if (e.attendanceStatus === "غائب") return 0;
  return MAX_SCORES.attendance + e.hifz + e.tajweed + e.talawah;
}

type TabKey = "teachers" | "students" | "plan";
const TABS: { value: TabKey; label: string; icon: string }[] = [
  { value: "teachers", label: "المعلمون", icon: "ti-users-group" },
  { value: "students", label: "الطلاب", icon: "ti-users" },
  { value: "plan", label: "الخطة", icon: "ti-target" },
];

/* ─── inline panel (no popup): pick an already-existing plan (of this teacher's) to link to a track ─── */
function LinkPlanPanel({
  track, teacherId, onLinked, onCreateNew,
}: {
  track: SpecialTrack;
  teacherId?: string;
  onLinked: () => void;
  onCreateNew: () => void;
}) {
  const { data: myPlans = [], isLoading } = useQuranPlans({ teacher: teacherId });
  const updatePlan = useUpdateQuranPlan();

  const linkable = myPlans.filter(
    (p) => p.specialTrack !== track._id && (typeof p.specialTrack !== "object" || p.specialTrack?._id !== track._id),
  );

  function link(plan: QuranPlan) {
    updatePlan.mutate({ id: plan._id, targetType: "specialTrack", specialTrack: track._id }, { onSuccess: onLinked });
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
        <i className="ti ti-link" style={{ marginLeft: 4 }} />ربط خطة موجودة بـ"{track.title}"
      </div>

      {isLoading && <p style={{ fontSize: 12, color: "var(--text3)" }}>جارٍ التحميل...</p>}

      {!isLoading && linkable.length === 0 && (
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text3)" }}>
          لا توجد خطط أخرى يمكن ربطها بهذا المسار.
        </p>
      )}

      {!isLoading && linkable.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: 320, overflowY: "auto" }}>
          {linkable.map((p) => (
            <div key={p._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{p.type}</div>
              </div>
              <button className="topbar-btn btn-primary" style={{ fontSize: 11, padding: "5px 12px" }} disabled={updatePlan.isPending} onClick={() => link(p)}>
                {updatePlan.isPending ? "جارٍ الربط..." : "ربط"}
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="topbar-btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 12 }} onClick={onCreateNew}>
        <i className="ti ti-plus" /> إنشاء خطة جديدة بدلاً من ذلك
      </button>
    </div>
  );
}

export function TeacherTrackDetail() {
  const { user, showPage } = usePortal();
  const teacherId = user?.profileId as string | undefined;
  const [trackId] = useState(() => sessionStorage.getItem(TRACK_DETAIL_ID_KEY));

  // No GET /special-tracks/:id endpoint server-side — reuse the same
  // teacher-scoped list the Special Tracks page already fetches (small list,
  // cheap) and find this one client-side.
  const { data: tracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, teacherId);
  const track = tracks.find((t) => t._id === trackId);

  const [tab, setTab] = useState<TabKey>("students");
  // Only one of the plan tab's expandable sections (link-another-plan /
  // schedule table) can be open at once — opening one closes the others.
  // ("Edit" now navigates to the dedicated plan form page instead.)
  const [openPlanSection, setOpenPlanSection] = useState<"link" | "schedule" | null>(null);
  function togglePlanSection(section: "link" | "schedule") {
    if (!guardDiscardDayEdit()) return;
    setOpenPlanSection((cur) => (cur === section ? null : section));
    setEditingDay(null);
  }
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, StudentEval>>({});
  // Which mushaf page each student actually reached today — defaults to the
  // day's full assigned pageEnd (i.e. "finished it all") until the teacher
  // pulls it back for a student who fell short.
  const [completionOverrides, setCompletionOverrides] = useState<Record<string, number>>({});
  const recordOccurrence = useRecordStudentOccurrence();
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [dayNotice, setDayNotice] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [planPanelStudentId, setPlanPanelStudentId] = useState<string | null>(null);

  const { data: linkedPlans = [] } = useQuranPlans(track ? { specialTrack: track._id } : undefined);
  // A plan can carry a stale `specialTrack` field left over from before its
  // targetType was switched to "students" (see planCoversStudent above), so
  // useQuranPlans({specialTrack}) can return several plans for this track —
  // prefer the one actually targeting the whole track (targetType:
  // "specialTrack") over a narrower students-only plan that merely still
  // points at it, regardless of which was created/updated more recently.
  const linkedPlan = linkedPlans.find((p) => p.targetType === "specialTrack") ?? linkedPlans[0];

  // Each student can now have their own effective schedule (absence/shortfall
  // reflow, manual per-student overrides), so "today's assigned portion" is
  // no longer one shared value for the whole track — fetch every covered
  // student's own progress in one batched hook call.
  const coveredStudentIds = useMemo(() => {
    if (!track || !linkedPlan) return [];
    return track.enrolledStudents.map(getEnrolledId).filter((id) => planCoversStudent(linkedPlan, id));
  }, [track, linkedPlan]);
  const progressByStudentId = useStudentPlanProgressList(linkedPlan?._id, coveredStudentIds);

  const generateSchedule = useGenerateSchedule();
  const updateScheduleEntry = useUpdateScheduleEntry();
  const [editingDay, setEditingDay] = useState<ScheduleEntry | null>(null);
  const [dayRangeStart, setDayRangeStart] = useState<RangePoint>({ surahNumber: 1, ayah: 1 });
  const [dayRangeEnd, setDayRangeEnd] = useState<RangePoint>({ surahNumber: 1, ayah: 1 });
  const [dayPageStart, setDayPageStart] = useState(1);
  const [dayPageEnd, setDayPageEnd] = useState(1);
  const [dayJuz, setDayJuz] = useState(1);
  const [dayError, setDayError] = useState("");

  // True while the day-edit panel is open and its fields differ from the day
  // it was opened with — i.e. there's something that would be silently lost
  // by switching tabs/sections, editing a different day, or regenerating.
  function isDayEditDirty(): boolean {
    if (!editingDay) return false;
    return (
      dayRangeStart.surahNumber !== editingDay.surahStart || dayRangeStart.ayah !== editingDay.ayahStart ||
      dayRangeEnd.surahNumber !== editingDay.surahEnd || dayRangeEnd.ayah !== editingDay.ayahEnd ||
      dayPageStart !== editingDay.pageStart || dayPageEnd !== editingDay.pageEnd || dayJuz !== editingDay.juz
    );
  }
  /** Asks for confirmation before discarding an in-progress, unsaved day edit.
   * Returns true when it's safe to proceed (nothing to lose, or the teacher
   * confirmed discarding it). */
  function guardDiscardDayEdit(): boolean {
    if (!isDayEditDirty()) return true;
    return window.confirm("لديك تعديل غير محفوظ على توزيع أحد الأيام — سيتم فقده إذا واصلت. هل تريد تجاهل التعديل والمتابعة؟");
  }

  // First time anyone opens the schedule table, freeze it into the DB
  // automatically so it's a real record from that point on (see
  // generateSchedule in quran-plan.controller.ts).
  function handleScheduleToggle() {
    if (!guardDiscardDayEdit()) return;
    const opening = openPlanSection !== "schedule";
    setOpenPlanSection(opening ? "schedule" : null);
    setEditingDay(null);
    if (opening && linkedPlan && !linkedPlan.scheduleIsPersisted) {
      generateSchedule.mutate(linkedPlan._id);
    }
  }

  function startEditDay(entry: ScheduleEntry) {
    if (editingDay?.occurrenceIndex === entry.occurrenceIndex) return;
    if (!guardDiscardDayEdit()) return;
    setEditingDay(entry);
    setDayRangeStart({ surahNumber: entry.surahStart, ayah: entry.ayahStart });
    setDayRangeEnd({ surahNumber: entry.surahEnd, ayah: entry.ayahEnd });
    setDayPageStart(entry.pageStart);
    setDayPageEnd(entry.pageEnd);
    setDayJuz(entry.juz);
    setDayError("");
  }

  function handleRegenerateSchedule() {
    if (!linkedPlan || !guardDiscardDayEdit()) return;
    setEditingDay(null);
    generateSchedule.mutate(linkedPlan._id);
  }

  async function saveEditDay() {
    if (!linkedPlan || !editingDay) return;
    const startsBeforeEnd =
      dayRangeStart.surahNumber < dayRangeEnd.surahNumber ||
      (dayRangeStart.surahNumber === dayRangeEnd.surahNumber && dayRangeStart.ayah <= dayRangeEnd.ayah);
    if (!startsBeforeEnd) { setDayError("نقطة البداية يجب أن تسبق نقطة النهاية"); return; }
    if (dayPageStart > dayPageEnd) { setDayError("صفحة البداية يجب أن تسبق صفحة النهاية"); return; }
    setDayError("");
    try {
      await updateScheduleEntry.mutateAsync({
        id: linkedPlan._id,
        occurrenceIndex: editingDay.occurrenceIndex,
        surahStart: dayRangeStart.surahNumber, ayahStart: dayRangeStart.ayah,
        surahEnd: dayRangeEnd.surahNumber, ayahEnd: dayRangeEnd.ayah,
        pageStart: dayPageStart, pageEnd: dayPageEnd, juz: dayJuz,
      });
      setEditingDay(null);
    } catch (e) {
      setDayError((e as Error).message);
    }
  }

  // Local calendar date, not UTC (`toISOString()` lags a day behind local
  // wall-clock time for the first `offset` hours of each day in any UTC+ tz).
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { scheduledSet, scheduledSorted, assignmentByDate, dayChips, effectiveDate } = useMemo(() => {
    const set = new Set<string>();
    const byDate = new Map<string, ScheduleEntry>();
    for (const e of linkedPlan?.schedule ?? []) {
      if (!e.date) continue;
      const d = toDateOnly(e.date);
      set.add(d);
      if (!byDate.has(d)) byDate.set(d, e);
    }
    const sorted = Array.from(set).sort();
    const chips = sorted.length ? buildDayChips(sorted[0], sorted[sorted.length - 1], today) : [];
    let dflt = sorted.length ? sorted[0] : today;
    if (sorted.length) {
      const pastOrToday = sorted.filter((d) => d <= today);
      dflt = pastOrToday.length ? pastOrToday[pastOrToday.length - 1] : sorted[0];
    }
    const effective = selectedDate && set.has(selectedDate) ? selectedDate : dflt;
    return { scheduledSet: set, scheduledSorted: sorted, assignmentByDate: byDate, dayChips: chips, effectiveDate: effective };
  }, [linkedPlan, selectedDate, today]);

  // Block an actual tab close/refresh/URL navigation while a day edit is
  // unsaved — browsers show their own built-in confirmation text (custom
  // messages are ignored by modern browsers), but it does stop the leave.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isDayEditDirty()) { e.preventDefault(); e.returnValue = ""; }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDay, dayRangeStart, dayRangeEnd]);

  // Reset per-student edits when the effective day changes, so one day's
  // edits don't leak into another day for the same students.
  useEffect(() => {
    setOverrides({});
    setUnlockedIds(new Set());
    setCompletionOverrides({});
    setExpandedStudentId(null);
    setDayNotice(null);
  }, [effectiveDate]);

  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = trackRef.current?.querySelector(".day-chip.active") as HTMLElement | null;
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [effectiveDate, dayChips]);

  const { data: savedForDay = [] } = useEvaluations(track ? { specialTrack: track._id, from: effectiveDate, to: effectiveDate } : undefined);
  const savedById: Record<string, StudentEval> = {};
  for (const r of savedForDay) {
    const id = typeof r.student === "string" ? r.student : r.student._id;
    savedById[id] = { attendanceStatus: r.attendanceStatus, hifz: r.scores.hifz, tajweed: r.scores.tajweed, talawah: r.scores.talawah };
  }
  const bulkEvaluate = useBulkEvaluate();

  // Once a student's save succeeds, re-lock their row automatically — reopening
  // it again requires an explicit "تعديل" tap, same "sent once" guard as
  // TeacherAttendance but scoped to a single student instead of the whole day.
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

  const isFutureDay = effectiveDate > today;

  const evalFor = (studentId: string): StudentEval => overrides[studentId] ?? savedById[studentId] ?? blankEval();
  function setAttendance(studentId: string, status: "حاضر" | "غائب") {
    setOverrides((prev) => ({ ...prev, [studentId]: { ...evalFor(studentId), attendanceStatus: status } }));
  }
  function setScore(studentId: string, category: ScoreCategory, value: number) {
    setOverrides((prev) => ({ ...prev, [studentId]: { ...evalFor(studentId), [category]: value } }));
  }
  function toggleStudent(studentId: string) {
    setExpandedStudentId((cur) => (cur === studentId ? null : studentId));
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

  function saveStudent(studentId: string, studentName: string) {
    if (!track || isFutureDay) return;
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
    bulkEvaluate.mutate({ teacher: teacherId!, specialTrack: track._id, date: effectiveDate, records }, {
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
    });
  }

  function togglePlanPanel(studentId: string) {
    setPlanPanelStudentId((cur) => (cur === studentId ? null : studentId));
  }

  function takeAttendance() {
    if (!track) return;
    sessionStorage.setItem(ATTENDANCE_PREFILL_TRACK_KEY, track._id);
    showPage("attendance");
  }
  function createNewPlan() {
    if (!track) return;
    sessionStorage.setItem(PLAN_FORM_HANDOFF_KEY, JSON.stringify({ mode: "create", trackId: track._id }));
    showPage("planform");
  }
  function editLinkedPlan() {
    if (!linkedPlan) return;
    sessionStorage.setItem(PLAN_FORM_HANDOFF_KEY, JSON.stringify({ mode: "edit", plan: linkedPlan }));
    showPage("planform");
  }

  useTopbar(
    "ti-calendar-event",
    track?.title ?? "تفاصيل المسار",
    <div style={{ display: "flex", gap: 8 }}>
      <button className="topbar-btn btn-ghost" onClick={() => { if (guardDiscardDayEdit()) showPage("specialtracks"); }}>
        <i className="ti ti-arrow-right" /> المسارات
      </button>
      {track && (
        <button className="topbar-btn btn-primary" onClick={() => { if (guardDiscardDayEdit()) takeAttendance(); }}>
          <i className="ti ti-calendar-check" /> تسجيل الحضور
        </button>
      )}
    </div>,
  );

  if (!trackId) {
    return <Alert tone="warning">لم يتم تحديد مسار. عد إلى صفحة المسارات واختر مساراً لعرض تفاصيله.</Alert>;
  }
  if (loadingTracks) return <SkeletonCard lines={4} />;
  if (!track) return <Alert tone="danger">هذا المسار غير موجود أو لم تعد مُسنَداً إليه.</Alert>;

  const cfg = STATUS_CFG[track.status];
  const enrolled = track.enrolledStudents.length;
  const pct = Math.min(100, Math.round((enrolled / track.maxStudents) * 100));
  const barClr = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "var(--green)";
  // Each student's own assigned portion for the selected day — falls back to
  // the shared plan schedule (assignmentByDate) for anyone with no individual
  // overlay yet, matching the API's own graceful-degradation behavior.
  function assignmentForStudent(studentId: string): ScheduleEntry | undefined {
    const perStudent = progressByStudentId[studentId]?.effectiveSchedule.find((o) => toDateOnly(o.date) === effectiveDate);
    return perStudent ?? assignmentByDate.get(effectiveDate);
  }

  return (
    <>
      <Card icon="ti-calendar-event" title={track.title} headerExtra={<Badge tone={cfg.tone}>{cfg.label}</Badge>}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 11, background: "var(--cream)", color: "var(--text2)", borderRadius: 6, padding: "2px 8px" }}>{track.type}</span>
          {track.isOnline && (
            <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "2px 8px" }}>
              <i className="ti ti-wifi" style={{ marginLeft: 3 }} />أونلاين
            </span>
          )}
        </div>

        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", fontSize: 12, marginBottom: track.isOnline && track.meetLink ? 14 : 0 }}>
          {[
            { icon: "ti-clock", label: "الوقت", val: track.timeSlot },
            { icon: "ti-calendar-repeat", label: "الأيام", val: track.daysPerWeek },
            { icon: "ti-calendar", label: "البداية", val: fmtTrackDate(track.startDate) },
            { icon: "ti-calendar-off", label: "النهاية", val: fmtTrackDate(track.endDate) },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <i className={`ti ${icon}`} style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{val}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, gridColumn: "1 / -1" }}>
            <i className={`ti ${track.isOnline ? "ti-video" : "ti-map-pin"}`} style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>المكان</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{track.isOnline ? "أونلاين" : track.location}</div>
            </div>
          </div>
        </div>

        {track.isOnline && track.meetLink && (
          <a href={track.meetLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#1d4ed8", background: "#eff6ff", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(29,78,216,0.2)", textDecoration: "none", fontWeight: 600 }}>
            <i className="ti ti-video" /> انضم للجلسة
          </a>
        )}
      </Card>

      <div style={{ margin: "14px 0" }}>
        <ScopeTabs options={TABS} value={tab} onChange={(v) => { if (guardDiscardDayEdit()) setTab(v as TabKey); }} />
      </div>

      {tab === "teachers" && (
        <Card icon="ti-users-group" title="المعلمون" headerExtra={<span style={{ fontSize: 12, color: "var(--text2)" }}>{track.teachers.length} معلم</span>}>
          {track.teachers.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>لا يوجد معلمون مُسنَدون لهذا المسار</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {track.teachers.map((tc, i) => {
                const c = AV[i % AV.length];
                return (
                  <div key={getTeacherName(tc) + i} style={{ display: "flex", alignItems: "center", gap: 8, background: c.bg, color: c.fg, borderRadius: 99, padding: "6px 14px 6px 6px", fontSize: 13, fontWeight: 700 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: c.fg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                      {avatarInitials(getTeacherName(tc))}
                    </div>
                    {getTeacherName(tc)}
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ margin: "14px 0 0", fontSize: 11, color: "var(--text3)" }}>
            <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
            لإضافة أو إزالة معلم من هذا المسار، تواصل مع الإدارة.
          </p>
        </Card>
      )}

      {tab === "students" && (
        <>
          <Card icon="ti-user-check" title="عدد الطلاب" headerExtra={<span style={{ fontSize: 12, fontWeight: 700, color: barClr }}>{enrolled} / {track.maxStudents}</span>}>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--text3)" }}>
              <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
              لإضافة أو إزالة طالب من هذا المسار، تواصل مع الإدارة.
            </p>
          </Card>

          {scheduledSorted.length > 0 && (
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
                          setDayNotice(`${fmtDayLabel(d.iso)} — هذا اليوم غير مشمول بخطة الحفظ الحالية`);
                          return;
                        }
                        setDayNotice(null);
                        setSelectedDate(d.iso);
                      }}
                      title={enabled ? fmtDayLabel(d.iso) : "لا يوجد خطة لهذا اليوم"}
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
          )}

          {dayNotice && <Alert tone="warning" icon="ti-calendar-off">{dayNotice}</Alert>}

          {scheduledSorted.length === 0 && (
            <Alert tone="warning">
              لا يوجد خطة حفظ نشطة لهذا المسار — لا يمكن تحديد يوم محدد لتسجيل الحضور والتقييم، لكن
              يمكنك تسجيل حضور اليوم مباشرة أدناه. أضف خطة من تبويب "الخطة" أولاً لتفعيل التقويم.
            </Alert>
          )}

          {isFutureDay && (
            <Alert tone="warning" icon="ti-clock">
              هذا اليوم لم يحن بعد — لا يمكن تسجيل الحضور والتقييم مسبقًا لجلسة لم تُعقد.
            </Alert>
          )}

          <Card icon="ti-users" title="طلاب المسار" headerExtra={<span style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDayLabel(effectiveDate)}</span>}>
            {enrolled === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>لا يوجد طلاب مسجّلون بعد</div>
            ) : (
              <div className="att-list">
                {track.enrolledStudents.map((s) => {
                  const name = getEnrolledName(s);
                  const id = getEnrolledId(s);
                  const e = evalFor(id);
                  const isAbsent = e.attendanceStatus === "غائب";
                  const isExpanded = expandedStudentId === id;
                  const hasSaved = !!savedById[id];
                  const isUnlocked = unlockedIds.has(id);
                  const controlsLocked = isFutureDay || (hasSaved && !isUnlocked);
                  const hasIndividualPlan = !!linkedPlan && planCoversStudent(linkedPlan, id);
                  const assignment = hasIndividualPlan ? assignmentForStudent(id) : undefined;
                  return (
                    <div key={id} className={`att-row ${isAbsent && isExpanded ? "is-absent" : ""}`}>
                      <div className="att-row-top" style={{ cursor: "pointer" }} onClick={() => toggleStudent(id)}>
                        <div className="att-avatar">{avatarInitials(name)}</div>
                        <div className="att-info">
                          <div className="att-name">{name}</div>
                          <div className="att-sub">
                            {hasSaved
                              ? `${e.attendanceStatus} — ${toAr(totalOf(e))}/${toAr(TOTAL_MAX)}${isUnlocked ? " (وضع التعديل)" : ""}`
                              : "لم يُسجَّل لهذا اليوم بعد"}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="topbar-btn btn-ghost"
                          style={{ padding: "6px 10px" }}
                          onClick={(ev) => { ev.stopPropagation(); toggleStudent(id); }}
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
                              تم تسجيل حضور وتقييم {name} لهذا اليوم. اضغط "تعديل" لتصحيح البيانات.
                            </Alert>
                          )}

                          <div className="att-toggle" style={{ display: "inline-flex", marginBottom: 10 }}>
                            <button type="button" disabled={controlsLocked} className={!isAbsent ? "active present" : ""} onClick={() => setAttendance(id, "حاضر")}>
                              <i className="ti ti-check" /> حاضر
                            </button>
                            <button type="button" disabled={controlsLocked} className={isAbsent ? "active absent" : ""} onClick={() => setAttendance(id, "غائب")}>
                              <i className="ti ti-x" /> غائب
                            </button>
                          </div>

                          {!isAbsent && assignment && (() => {
                            const actualPage = completedPageFor(id, assignment);
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
                                    onChange={(ev) => setCompletedPage(id, Math.max(assignment.pageStart, Math.min(assignment.pageEnd, Number(ev.target.value) || assignment.pageStart)))}
                                  />
                                  <span style={{ fontSize: 11, color: "var(--text3)" }}>من {toAr(assignment.pageStart)} إلى {toAr(assignment.pageEnd)}</span>
                                  {!isFull && !controlsLocked && (
                                    <button
                                      type="button"
                                      className="topbar-btn btn-ghost"
                                      style={{ fontSize: 11, padding: "4px 10px" }}
                                      onClick={() => setCompletedPage(id, assignment.pageEnd)}
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
                                      onClick={() => setScore(id, cat, n)}
                                    >
                                      {toAr(n)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <span className={`eval-total ${totalOf(e) === 0 ? "zero" : ""}`}>{toAr(totalOf(e))}/{toAr(TOTAL_MAX)}</span>
                          </div>

                          {hasIndividualPlan && (
                            <button
                              type="button"
                              className="topbar-btn btn-ghost"
                              style={{ fontSize: 11, padding: "5px 10px", marginBottom: 4 }}
                              onClick={(ev) => { ev.stopPropagation(); togglePlanPanel(id); }}
                            >
                              {planPanelStudentId === id
                                ? <><i className="ti ti-chevron-up" /> إخفاء الخطة الفردية</>
                                : progressByStudentId[id]?.progressIsPersisted
                                  ? <><i className="ti ti-list-details" /> عرض الخطة الفردية</>
                                  : <><i className="ti ti-plus" /> أنشئ خطة فردية</>
                              }
                            </button>
                          )}

                          {hasIndividualPlan && linkedPlan && planPanelStudentId === id && (
                            <IndividualPlanPanel planId={linkedPlan._id} studentId={id} studentName={name} basePlan={linkedPlan} />
                          )}

                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                            {isFutureDay ? (
                              <button className="topbar-btn btn-ghost" style={{ padding: "8px 18px" }} disabled>
                                <i className="ti ti-clock" /> اليوم لم يحن بعد
                              </button>
                            ) : hasSaved && !isUnlocked ? (
                              <button className="topbar-btn btn-ghost" style={{ padding: "8px 18px" }} onClick={() => unlockStudent(id)}>
                                <i className="ti ti-edit" /> تعديل
                              </button>
                            ) : (
                              <button className="topbar-btn btn-primary" style={{ padding: "8px 18px" }} onClick={() => saveStudent(id, name)} disabled={bulkEvaluate.isPending}>
                                {bulkEvaluate.isPending && lastSavedId === id
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
        </>
      )}

      {tab === "plan" && (
        <Card icon="ti-target" title="الخطة القرآنية" headerExtra={linkedPlan?.progress ? <Badge tone="green">{linkedPlan.progress.percent}%</Badge> : undefined}>
          {linkedPlan ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{linkedPlan.name}</div>
              {linkedPlan.progress && (
                <div style={{ margin: "6px 0 12px" }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${linkedPlan.progress.percent}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                    {linkedPlan.juzProgress ? `${linkedPlan.juzProgress.completed} / ${linkedPlan.juzProgress.total} جزء` : ""}
                    {" · "}{linkedPlan.progress.completed} / {linkedPlan.progress.total} يوم
                  </div>
                </div>
              )}
              <div style={{ borderRadius: 10, padding: "10px 12px", background: linkedPlan.todayAssignment ? "var(--green-pale)" : "var(--cream)", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: linkedPlan.todayAssignment ? "var(--green)" : "var(--text3)", marginBottom: linkedPlan.todayAssignment ? 4 : 0 }}>
                  <i className="ti ti-calendar-star" style={{ marginLeft: 4 }} />الجزء المطلوب اليوم
                </div>
                {linkedPlan.todayAssignment ? (
                  <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
                    {surahName(linkedPlan.todayAssignment.surahStart)} : {linkedPlan.todayAssignment.ayahStart}
                    {" — "}
                    {surahName(linkedPlan.todayAssignment.surahEnd)} : {linkedPlan.todayAssignment.ayahEnd} (صفحة {linkedPlan.todayAssignment.pageStart}
                    {linkedPlan.todayAssignment.pageEnd !== linkedPlan.todayAssignment.pageStart ? ` - ${linkedPlan.todayAssignment.pageEnd}` : ""})
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>لا يوجد جزء مخصص لليوم</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="topbar-btn btn-primary" onClick={editLinkedPlan}>
                  <i className="ti ti-pencil" /> تعديل الخطة
                </button>
                <button className="topbar-btn btn-ghost" onClick={() => togglePlanSection("link")}>
                  <i className={`ti ${openPlanSection === "link" ? "ti-x" : "ti-refresh"}`} /> {openPlanSection === "link" ? "إلغاء" : "ربط خطة أخرى"}
                </button>
                {linkedPlan.schedule.length > 0 && (
                  <button className="topbar-btn btn-ghost" onClick={handleScheduleToggle}>
                    <i className={`ti ${openPlanSection === "schedule" ? "ti-chevron-up" : "ti-calendar-stats"}`} /> {openPlanSection === "schedule" ? "إخفاء توزيع الأيام" : "عرض توزيع الأيام والصفحات"}
                  </button>
                )}
              </div>

              {openPlanSection === "schedule" && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>
                      {generateSchedule.isPending ? (
                        <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite", marginLeft: 4 }} />جارٍ حفظ التوزيع...</>
                      ) : linkedPlan.scheduleIsPersisted ? (
                        <><i className="ti ti-database-check" style={{ marginLeft: 4, color: "var(--green)" }} />توزيع محفوظ في قاعدة البيانات</>
                      ) : (
                        <><i className="ti ti-refresh" style={{ marginLeft: 4 }} />توزيع محسوب مؤقتًا (غير محفوظ)</>
                      )}
                    </span>
                    <button
                      className="topbar-btn btn-ghost"
                      style={{ fontSize: 11, padding: "5px 10px" }}
                      onClick={handleRegenerateSchedule}
                      disabled={generateSchedule.isPending}
                    >
                      <i className="ti ti-device-floppy" /> {linkedPlan.scheduleIsPersisted ? "إعادة الحفظ من الإعدادات الحالية" : "حفظ التوزيع في قاعدة البيانات"}
                    </button>
                  </div>
                <div className="tbl-wrap" style={{ maxHeight: "50vh" }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>التاريخ</th>
                        <th>الجزء</th>
                        <th>من</th>
                        <th>إلى</th>
                        <th>الصفحات</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedPlan.schedule.map((s) => {
                        const isEditingRow = editingDay?.occurrenceIndex === s.occurrenceIndex;
                        if (!isEditingRow) {
                          return (
                            <tr key={s.occurrenceIndex}>
                              <td>{toAr(s.occurrenceIndex)}</td>
                              <td>{fmtDayLabel(toDateOnly(s.date))}</td>
                              <td><Badge tone="green">جزء {toAr(s.juz)}</Badge></td>
                              <td>{surahName(s.surahStart)} : {toAr(s.ayahStart)}</td>
                              <td>{surahName(s.surahEnd)} : {toAr(s.ayahEnd)}</td>
                              <td>
                                {pageLabel({ surahNumber: s.surahStart, ayah: s.ayahStart }, "start")}
                                {" - "}
                                {pageLabel({ surahNumber: s.surahEnd, ayah: s.ayahEnd }, "end")}
                              </td>
                              <td>
                                {linkedPlan.scheduleIsPersisted && (
                                  <button className="topbar-btn btn-ghost" style={{ padding: "4px 9px", fontSize: 11 }} onClick={() => startEditDay(s)}>
                                    <i className="ti ti-pencil" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={s.occurrenceIndex} style={{ background: "var(--green-pale)" }}>
                            <td>{toAr(s.occurrenceIndex)}</td>
                            <td>{fmtDayLabel(toDateOnly(s.date))}</td>
                            <td>
                              <input
                                type="number" min={1} max={30} className="form-input"
                                style={{ ...compactInputStyle, width: 52 }}
                                value={dayJuz}
                                onChange={(e) => setDayJuz(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                              />
                            </td>
                            <td style={{ minWidth: 170 }}>
                              <CompactSurahAyah value={dayRangeStart} onChange={setDayRangeStart} />
                            </td>
                            <td style={{ minWidth: 170 }}>
                              <CompactSurahAyah value={dayRangeEnd} onChange={setDayRangeEnd} />
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input
                                  type="number" min={1} max={604} className="form-input"
                                  style={{ ...compactInputStyle, width: 56 }}
                                  value={dayPageStart}
                                  onChange={(e) => setDayPageStart(Math.max(1, Math.min(604, Number(e.target.value) || 1)))}
                                />
                                <span style={{ color: "var(--text3)" }}>-</span>
                                <input
                                  type="number" min={1} max={604} className="form-input"
                                  style={{ ...compactInputStyle, width: 56 }}
                                  value={dayPageEnd}
                                  onChange={(e) => setDayPageEnd(Math.max(1, Math.min(604, Number(e.target.value) || 1)))}
                                />
                              </div>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="topbar-btn btn-primary" style={{ padding: "6px 10px", fontSize: 11 }} onClick={saveEditDay} disabled={updateScheduleEntry.isPending} title="حفظ">
                                  {updateScheduleEntry.isPending
                                    ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} />
                                    : <i className="ti ti-check" />
                                  }
                                </button>
                                <button className="topbar-btn btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => { if (guardDiscardDayEdit()) setEditingDay(null); }} title="إلغاء">
                                  <i className="ti ti-x" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {editingDay && dayError && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444", fontSize: 13, marginTop: 10, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>
                    <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} /> {dayError}
                  </div>
                )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--cream)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>
                <i className="ti ti-target-off" />
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>لا توجد خطة حفظ مرتبطة بهذا المسار بعد</p>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text3)" }}>اربط خطة موجودة أو أنشئ خطة جديدة لتفعيل التقويم والتقييم</p>
              <button className="topbar-btn btn-primary" onClick={() => togglePlanSection("link")}>
                <i className={`ti ${openPlanSection === "link" ? "ti-x" : "ti-plus"}`} /> {openPlanSection === "link" ? "إلغاء" : "ربط خطة"}
              </button>
            </div>
          )}

          {openPlanSection === "link" && (
            <LinkPlanPanel
              track={track}
              teacherId={teacherId}
              onLinked={() => setOpenPlanSection(null)}
              onCreateNew={() => { setOpenPlanSection(null); createNewPlan(); }}
            />
          )}
        </Card>
      )}
    </>
  );
}
