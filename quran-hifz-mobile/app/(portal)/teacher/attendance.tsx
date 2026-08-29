import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconCircleCheck, IconChevronDown, IconChevronUp, IconChevronLeft, IconChevronRight,
  IconLock, IconClock, IconCalendarOff, IconBook2, IconDeviceFloppy, IconEdit,
  IconCheck, IconX, IconTrophy, IconCalendarCheck, IconHistory, IconMedal,
} from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Leaderboard, { type LeaderboardRow } from '@/components/ui/Leaderboard';
import { SkeletonRows } from '@/components/ui/Skeleton';
import ContextCard, { halqaToContext, trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import SurahAyahPicker from '@/components/domain/SurahAyahPicker';
import { useHalqat } from '@/lib/queries/halqat';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
import { useStudents } from '@/lib/queries/students';
import { useEvaluations, useBulkEvaluate, type BulkEvaluateRecord } from '@/lib/queries/evaluations';
import { useQuranPlans, useStudentPlanProgressList, useRecordStudentOccurrence } from '@/lib/queries/quranPlan';
import { MAX_SCORES, TOTAL_MAX } from '@/lib/evaluationRubric';
import { SURAHS } from '@/lib/data/surahs';
import {
  dayFinishPoint, dayDeltaAyahs, planFinishPoint, toFlatIndex, fromFlatIndex,
  isReversedSchedule, isReversedRange, type RangePoint, type ScheduleEntry,
} from '@/lib/quranRange';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { success, warning, error } from '@/lib/haptics';
import { AR_LOCALE } from '@/lib/date';

// ── helpers (mirrored from the web page) ───────────────────────────────────
function surahName(n: number): string {
  return SURAHS.find((s) => s.number === n)?.name ?? '';
}
function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
}
// Indexed by Date.getDay(): 0 = الأحد … 6 = السبت.
const ARABIC_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function weekdayOf(iso: string): string {
  return ARABIC_WEEKDAYS[new Date(iso + 'T00:00:00').getDay()];
}
/** Pure UTC arithmetic — building the date at local midnight and reading it
 * back via toISOString() is not a round trip in any UTC+ timezone, which froze
 * the whole slider on one repeated date on the web. */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split('T')[0];
}
/** The server stores schedule dates as full ISO timestamps; normalise to a bare
 * YYYY-MM-DD so date maths and Set keys stay consistent. */
function toDateOnly(s: string): string {
  return String(s).slice(0, 10);
}
function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(AR_LOCALE, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}
type DayChip = { iso: string; weekday: string; dayNum: number; isToday: boolean };
function buildDayChips(minIso: string, maxIso: string, today: string): DayChip[] {
  const out: DayChip[] = [];
  let cur = minIso;
  let guard = 0;
  while (cur <= maxIso && guard < 1095) {
    out.push({
      iso: cur,
      weekday: weekdayOf(cur),
      dayNum: new Date(cur + 'T00:00:00').getDate(),
      isToday: cur === today,
    });
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

type ScoreCategory = 'hifz' | 'tajweed' | 'talawah';
const CATEGORY_LABELS: Record<ScoreCategory, string> = { hifz: 'حفظ', tajweed: 'تجويد', talawah: 'تلاوة' };
type StudentEval = { attendanceStatus: 'حاضر' | 'غائب'; hifz: number; tajweed: number; talawah: number };
/** Scores start at 0 so the teacher consciously awards points. */
function blankEval(): StudentEval {
  return { attendanceStatus: 'حاضر', hifz: 0, tajweed: 0, talawah: 0 };
}
function totalOf(e: StudentEval): number {
  if (e.attendanceStatus === 'غائب') return 0;
  return MAX_SCORES.attendance + e.hifz + e.tajweed + e.talawah;
}

const CHIP_W = 56;
const CHIP_GAP = 8;

export default function TeacherAttendance() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);

  const {
    data: halqat = [], isLoading: loadingHalqat, refetch: refetchHalqat, isRefetching: refetchingHalqat,
  } = useHalqat({ teacher: profileId });
  const {
    data: tracks = [], isLoading: loadingTracks, refetch: refetchTracks, isRefetching: refetchingTracks,
  } = useSpecialTracks(undefined, profileId);

  const contextFilter = selected
    ? selected.kind === 'halqa' ? { halqa: selected.id } : { specialTrack: selected.id }
    : undefined;

  const {
    data: students = [], isLoading: loadingStudents, refetch: refetchStudents, isRefetching: refetchingStudents,
  } = useStudents(contextFilter);
  const bulkEvaluate = useBulkEvaluate();
  const recordOccurrence = useRecordStudentOccurrence();

  // Local calendar date — toISOString() lags a day behind local wall-clock time
  // for the first `offset` hours of each day in any UTC+ timezone.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { data: plans = [], isLoading: loadingPlans, refetch: refetchPlans, isRefetching: refetchingPlans } =
    useQuranPlans(contextFilter);
  const linkedPlan = plans.find((p) => p.targetType === (selected?.kind === 'specialTrack' ? 'specialTrack' : 'halqa')) ?? plans[0];
  const rangeReversed = !!linkedPlan && isReversedRange(linkedPlan.rangeStart, linkedPlan.rangeEnd);

  // ── Day slider ─────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const { scheduledSet, scheduledSorted, assignmentByDate, dayChips, effectiveDate } = useMemo(() => {
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
    // Default to the latest scheduled day ≤ today, else the first upcoming one,
    // so the roster always opens on a day that has a real assignment.
    let dflt = sorted.length ? sorted[0] : today;
    if (sorted.length) {
      const pastOrToday = sorted.filter((d) => d <= today);
      dflt = pastOrToday.length ? pastOrToday[pastOrToday.length - 1] : sorted[0];
    }
    return {
      scheduledSet: set,
      scheduledSorted: sorted,
      assignmentByDate: byDate,
      dayChips: chips,
      effectiveDate: selectedDate && set.has(selectedDate) ? selectedDate : dflt,
    };
  }, [plans, selectedDate, today]);

  function planCoversStudent(studentId: string): boolean {
    if (!linkedPlan) return false;
    if (linkedPlan.targetType === 'students') {
      return (linkedPlan.students ?? []).some((s) => (typeof s === 'string' ? s : s._id) === studentId);
    }
    return true; // a halqa/track plan covers every student fetched under that context
  }
  const coveredStudentIds = useMemo(
    () => (linkedPlan ? students.map((s) => s._id).filter(planCoversStudent) : []),
    [students, linkedPlan],
  );
  const progressByStudentId = useStudentPlanProgressList(linkedPlan?._id, coveredStudentIds);

  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, StudentEval>>({});
  const [completionOverrides, setCompletionOverrides] = useState<Record<string, RangePoint>>({});
  const [dayNotice, setDayNotice] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  // Absent students whose parent could not be notified — the save still went
  // through, so this is a warning rather than an error.
  const [unnotified, setUnnotified] = useState<{ id: string; name: string }[]>([]);

  // Monday's edits must not leak into Tuesday's roster for the same students.
  useEffect(() => {
    setOverrides({});
    setCompletionOverrides({});
    setDayNotice(null);
    setUnlockedIds(new Set());
    setExpandedStudentId(null);
  }, [effectiveDate]);

  // Re-lock a student's row once their save lands — re-opening it needs an
  // explicit "تعديل" tap.
  useEffect(() => {
    if (bulkEvaluate.isSuccess && lastSavedId) {
      setUnlockedIds((prev) => {
        if (!prev.has(lastSavedId)) return prev;
        const next = new Set(prev);
        next.delete(lastSavedId);
        return next;
      });
    }
  }, [bulkEvaluate.isSuccess]);

  // Keep the active day chip in view — the slider can span months.
  const sliderRef = useRef<ScrollView>(null);
  useEffect(() => {
    const i = dayChips.findIndex((d) => d.iso === effectiveDate);
    if (i < 0) return;
    sliderRef.current?.scrollTo({ x: Math.max(0, i * (CHIP_W + CHIP_GAP) - CHIP_W * 2), animated: true });
  }, [effectiveDate, dayChips]);

  // Already-saved evaluations for the selected day.
  const { data: savedToday = [], refetch: refetchSaved, isRefetching: refetchingSaved } = useEvaluations(
    contextFilter ? { ...contextFilter, from: effectiveDate, to: effectiveDate } : undefined,
  );
  const savedById: Record<string, StudentEval> = {};
  for (const r of savedToday) {
    const id = typeof r.student === 'string' ? r.student : r.student._id;
    savedById[id] = {
      attendanceStatus: r.attendanceStatus,
      hifz: r.scores.hifz, tajweed: r.scores.tajweed, talawah: r.scores.talawah,
    };
  }

  // Full session history for this context, for the log + leaderboards below.
  const { data: history = [] } = useEvaluations(contextFilter);

  const { topScoreRows, topAttendanceRows } = useMemo(() => {
    type Agg = { id: string; name: string; totalSum: number; sessions: number; present: number };
    const byStudent = new Map<string, Agg>();
    for (const r of history) {
      const id = typeof r.student === 'string' ? r.student : r.student._id;
      const name = typeof r.student === 'string' ? r.student : r.student.name;
      const agg = byStudent.get(id) ?? { id, name, totalSum: 0, sessions: 0, present: 0 };
      agg.totalSum += r.total;
      agg.sessions += 1;
      if (r.attendanceStatus === 'حاضر') agg.present += 1;
      byStudent.set(id, agg);
    }
    const all = Array.from(byStudent.values());
    const byScore: LeaderboardRow[] = [...all]
      .sort((a, b) => b.totalSum / b.sessions - a.totalSum / a.sessions)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        name: a.name,
        value: Math.round(a.totalSum / a.sessions),
        max: TOTAL_MAX,
        sub: a.sessions === 1 ? 'جلسة واحدة' : `متوسط ${a.sessions} جلسات`,
      }));
    const byAttendance: LeaderboardRow[] = [...all]
      .sort((a, b) => b.present / b.sessions - a.present / a.sessions)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        name: a.name,
        value: Math.round((a.present / a.sessions) * 100),
        max: 100,
        sub: `${a.present} من ${a.sessions} جلسة`,
      }));
    return { topScoreRows: byScore, topAttendanceRows: byAttendance };
  }, [history]);

  const evalFor = (studentId: string): StudentEval =>
    overrides[studentId] ?? savedById[studentId] ?? blankEval();

  function setAttendance(studentId: string, status: 'حاضر' | 'غائب') {
    setOverrides((prev) => ({ ...prev, [studentId]: { ...evalFor(studentId), attendanceStatus: status } }));
  }
  function setScore(studentId: string, category: ScoreCategory, value: number) {
    setOverrides((prev) => ({ ...prev, [studentId]: { ...evalFor(studentId), [category]: value } }));
  }

  /** A student's own overlay can run the opposite direction to the shared plan
   * (a custom-range individual plan), so infer direction from their own
   * schedule first and only fall back to the base plan's direction. */
  function reversedForStudent(studentId: string): boolean {
    return isReversedSchedule(progressByStudentId[studentId]?.effectiveSchedule) ?? rangeReversed;
  }
  function completedPointFor(studentId: string, assignment: ScheduleEntry): RangePoint {
    return completionOverrides[studentId] ?? dayFinishPoint(assignment, reversedForStudent(studentId));
  }
  /** Clamps a teacher-picked completion point to what the student could
   * plausibly have reached: no earlier than the start of the day's own ward,
   * and no further than the end of their whole plan. */
  function clampReached(point: RangePoint, assignment: ScheduleEntry, studentId: string): RangePoint {
    const reversed = reversedForStudent(studentId);
    const dayStart = reversed
      ? { surahNumber: assignment.surahEnd, ayah: assignment.ayahEnd }
      : { surahNumber: assignment.surahStart, ayah: assignment.ayahStart };
    const finish = planFinishPoint(progressByStudentId[studentId]?.effectiveSchedule ?? [], reversed)
      ?? dayFinishPoint(assignment, reversed);
    const loFlat = Math.min(toFlatIndex(dayStart), toFlatIndex(finish));
    const hiFlat = Math.max(toFlatIndex(dayStart), toFlatIndex(finish));
    return fromFlatIndex(Math.max(loFlat, Math.min(hiFlat, toFlatIndex(point))));
  }
  function reachedBounds(assignment: ScheduleEntry, studentId: string) {
    return {
      lo: clampReached({ surahNumber: 1, ayah: 1 }, assignment, studentId),
      hi: clampReached({ surahNumber: 114, ayah: 6 }, assignment, studentId),
    };
  }
  /** Each student's own portion for the selected day — falls back to the shared
   * plan's schedule for anyone without an individual overlay yet. */
  function assignmentForStudent(studentId: string): ScheduleEntry | undefined {
    const perStudent = progressByStudentId[studentId]?.effectiveSchedule
      .find((o) => toDateOnly(o.date) === effectiveDate);
    return perStudent ?? assignmentByDate.get(effectiveDate);
  }

  const isFutureDay = effectiveDate > today;

  function saveStudent(studentId: string, studentName: string) {
    if (isFutureDay || !selected || !profileId) return;
    const e = evalFor(studentId);
    const records: BulkEvaluateRecord[] = [{
      student: studentId,
      attendanceStatus: e.attendanceStatus,
      hifz: e.hifz, tajweed: e.tajweed, talawah: e.talawah,
    }];
    setLastSavedId(studentId);
    setSavedNotice(null);
    setUnnotified([]);
    bulkEvaluate.mutate(
      {
        teacher: profileId,
        ...(selected.kind === 'halqa' ? { halqa: selected.id } : { specialTrack: selected.id }),
        date: effectiveDate,
        records,
      },
      {
        onSuccess: (res) => {
          success();
          setUnnotified(res.unnotified);
          // Feed the day's outcome into the student's individual plan overlay so
          // an absence or a shortfall is redistributed over their remaining days.
          const assignment = linkedPlan && planCoversStudent(studentId) ? assignmentForStudent(studentId) : undefined;
          if (!linkedPlan || !assignment) {
            setSavedNotice(`تم حفظ حضور وتقييم ${studentName}`);
            return;
          }
          const completedPoint = completedPointFor(studentId, assignment);
          // Signed in the plan's own direction: negative = fell short of the
          // day's ward, positive = recited past it.
          const delta = dayDeltaAyahs(assignment, reversedForStudent(studentId), completedPoint);
          const status = e.attendanceStatus === 'غائب' ? 'absent' : delta < 0 ? 'partial' : 'done';
          if (status === 'done' && delta === 0) {
            recordOccurrence.mutate({ planId: linkedPlan._id, studentId, occurrenceIndex: assignment.occurrenceIndex, status });
            setSavedNotice(`تم حفظ حضور وتقييم ${studentName}`);
            return;
          }
          recordOccurrence.mutate(
            {
              planId: linkedPlan._id, studentId, occurrenceIndex: assignment.occurrenceIndex, status,
              // Sent for an over-achievement too, so the server can take the
              // surplus off the student's remaining days.
              completedThroughSurah: status === 'absent' ? undefined : completedPoint.surahNumber,
              completedThroughAyah: status === 'absent' ? undefined : completedPoint.ayah,
            },
            {
              onSuccess: (res) => {
                setSavedNotice(
                  status === 'absent'
                    ? `تم الحفظ، وتم توزيع الورد الغائب على باقي أيام خطة ${studentName}`
                    : delta > 0
                      ? `تم الحفظ، وتم خصم الورد الإضافي من باقي أيام خطة ${studentName}`
                      : `تم الحفظ، وتم توزيع الورد الناقص على باقي أيام خطة ${studentName}`,
                );
                if (res.data.overflowPages > 0) {
                  warning();
                  setSavedNotice(`لا يوجد مكان كافٍ لتوزيع كل الورد الناقص — أضف يومًا جديدًا لخطة ${studentName}`);
                }
              },
            },
          );
        },
        onError: () => error(),
      },
    );
  }

  const isRefreshingSelection = refetchingHalqat || refetchingTracks;
  const onRefreshSelection = () => { refetchHalqat(); refetchTracks(); };
  const isRefreshingDetail = refetchingStudents || refetchingSaved || refetchingPlans;
  const onRefreshDetail = () => { refetchStudents(); refetchSaved(); refetchPlans(); };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },

    slider: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sliderArrow: {
      width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    },
    sliderArrowOff: { opacity: 0.35 },
    chipRow: { flexDirection: 'row', gap: CHIP_GAP, paddingHorizontal: 2 },
    dayChip: {
      width: CHIP_W, paddingVertical: 7, borderRadius: theme.radiusSm,
      alignItems: 'center', gap: 1,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    },
    dayChipActive: { backgroundColor: theme.greenAccent, borderColor: theme.green },
    dayChipToday: { borderColor: theme.gold },
    dayChipOff: { opacity: 0.4, borderStyle: 'dashed' },
    dayChipWd: { fontSize: 9, fontFamily: theme.fontCairo, color: theme.textMuted },
    dayChipNum: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    dayChipTextActive: { color: theme.white },
    todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.gold },

    row: { paddingVertical: 12 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.greenPale,
    },
    avatarText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
    rowInfo: { flex: 1 },
    name: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    sub: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },
    body: { paddingTop: 10, gap: 10 },

    banner: {
      flexDirection: 'row', gap: 10, padding: 10,
      backgroundColor: theme.greenPale, borderRadius: theme.radiusSm,
    },
    bannerLabel: { fontSize: 10, fontFamily: theme.fontCairoBold, color: theme.green },
    bannerRange: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 3 },
    pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
    pill: {
      fontSize: 10, fontFamily: theme.fontCairo, color: theme.brown,
      backgroundColor: theme.goldPale, borderRadius: theme.radiusFull,
      paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden',
    },

    toggleRow: { flexDirection: 'row', gap: 8 },
    toggle: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radiusSm,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card,
    },
    toggleText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.text },

    completionBox: {
      padding: 10, borderRadius: theme.radiusSm, borderWidth: 1,
      borderStyle: 'dashed', borderColor: theme.border, gap: 6,
    },
    completionLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    completionHint: { fontSize: 11, fontFamily: theme.fontCairo },
    wardRange: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },

    catLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted, marginBottom: 4 },
    scoreChipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    scoreChip: {
      minWidth: 34, paddingVertical: 6, alignItems: 'center',
      borderRadius: theme.radiusSm, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card,
    },
    scoreChipText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    totalLine: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green, textAlign: 'left' },

    histRow: { paddingVertical: 9, gap: 4 },
    histTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    histName: { flex: 1, fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    histDate: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    histScores: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },

    spotTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4 },
    spotTitleText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    disabled: { opacity: 0.5 },
  }), [theme]);

  // ── View 1: context selector ────────────────────────────────────────────
  if (!selected) {
    const loading = loadingHalqat || loadingTracks;
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshingSelection} onRefresh={onRefreshSelection} colors={[theme.green]} tintColor={theme.green} />}
        >
          {loading && <SkeletonRows count={3} rowHeight={92} />}
          {!loading && halqat.length === 0 && tracks.length === 0 && (
            <Text style={styles.muted}>لا توجد حلقات أو مسارات مسندة إليك</Text>
          )}
          {halqat.map((h) => (
            <Pressable key={h._id} onPress={() => setSelected(halqaToContext(h))}>
              <ContextCard context={halqaToContext(h)} />
            </Pressable>
          ))}
          {tracks.map((t) => (
            <Pressable key={t._id} onPress={() => setSelected(trackToContext(t))}>
              <ContextCard context={trackToContext(t)} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── View 2: day slider + per-student attendance/evaluation roster ────────
  const activeIdx = scheduledSorted.indexOf(effectiveDate);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshingDetail} onRefresh={onRefreshDetail} colors={[theme.green]} tintColor={theme.green} />}
      >
        <Pressable onPress={() => { setSelected(null); setOverrides({}); setSelectedDate(''); }}>
          <Text style={styles.backLink}>‹ رجوع لاختيار الحلقة/المسار</Text>
        </Pressable>

        {!!savedNotice && (
          <Alert variant="success" icon={<IconCircleCheck size={18} color="#166534" />}>{savedNotice}</Alert>
        )}
        {unnotified.length > 0 && (
          <Alert variant="warning">
            تعذر إرسال إشعار عن غياب: {unnotified.map((u) => u.name).join('، ')} — لا يوجد ولي أمر مرتبط بالحساب.
          </Alert>
        )}
        {bulkEvaluate.isError && <Alert variant="error">{(bulkEvaluate.error as Error).message}</Alert>}
        {recordOccurrence.isError && <Alert variant="error">{(recordOccurrence.error as Error).message}</Alert>}

        {/* Day slider — only when this context has scheduled days */}
        {loadingPlans ? (
          <SkeletonRows count={1} rowHeight={44} />
        ) : scheduledSorted.length > 0 ? (
          <View style={styles.slider}>
            <Pressable
              haptic="select"
              onPress={() => { if (activeIdx > 0) setSelectedDate(scheduledSorted[activeIdx - 1]); }}
              style={[styles.sliderArrow, activeIdx <= 0 && styles.sliderArrowOff]}
              disabled={activeIdx <= 0}
            >
              <IconChevronRight size={18} color={theme.text} />
            </Pressable>
            <ScrollView
              ref={sliderRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              style={{ flex: 1 }}
            >
              {dayChips.map((d) => {
                const enabled = scheduledSet.has(d.iso);
                const isSel = d.iso === effectiveDate;
                return (
                  <Pressable
                    haptic="select"
                    key={d.iso}
                    onPress={() => {
                      if (!enabled) {
                        setDayNotice(`${fmtDate(d.iso)} — هذا اليوم غير مشمول بخطة الحفظ الحالية`);
                        return;
                      }
                      setDayNotice(null);
                      setSelectedDate(d.iso);
                    }}
                    style={[
                      styles.dayChip,
                      d.isToday && styles.dayChipToday,
                      !enabled && styles.dayChipOff,
                      isSel && styles.dayChipActive,
                    ]}
                  >
                    <Text style={[styles.dayChipWd, isSel && styles.dayChipTextActive]}>{d.weekday}</Text>
                    <Text style={[styles.dayChipNum, isSel && styles.dayChipTextActive]}>{d.dayNum}</Text>
                    {d.isToday && <View style={styles.todayDot} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              haptic="select"
              onPress={() => { if (activeIdx >= 0 && activeIdx < scheduledSorted.length - 1) setSelectedDate(scheduledSorted[activeIdx + 1]); }}
              style={[styles.sliderArrow, activeIdx >= scheduledSorted.length - 1 && styles.sliderArrowOff]}
              disabled={activeIdx >= scheduledSorted.length - 1}
            >
              <IconChevronLeft size={18} color={theme.text} />
            </Pressable>
          </View>
        ) : null}

        {!!dayNotice && (
          <Alert variant="warning" icon={<IconCalendarOff size={16} color="#92400E" />}>{dayNotice}</Alert>
        )}

        {!loadingPlans && scheduledSorted.length === 0 && (
          <Alert variant="warning">
            لا يوجد خطة حفظ نشطة لهذه {selected.kind === 'halqa' ? 'الحلقة' : 'المسار'} — أضف خطة من صفحة
            "الخطط الفردية" أولاً لتفعيل التقويم.
          </Alert>
        )}

        {isFutureDay && (
          <Alert variant="warning" icon={<IconClock size={16} color="#92400E" />}>
            هذا اليوم لم يحن بعد — لا يمكن تسجيل الحضور والتقييم مسبقًا لجلسة لم تُعقد.
          </Alert>
        )}

        <Card>
          <CardHeader title={`${selected.title} — ${fmtDate(effectiveDate)}`} />

          {loadingStudents && <SkeletonRows count={4} />}
          {!loadingStudents && students.length === 0 && <Text style={styles.muted}>لا يوجد طلاب</Text>}

          {students.map((st, i) => {
            const e = evalFor(st._id);
            const isAbsent = e.attendanceStatus === 'غائب';
            const total = totalOf(e);
            const isExpanded = expandedStudentId === st._id;
            const hasSaved = !!savedById[st._id];
            const isUnlocked = unlockedIds.has(st._id);
            const locked = isFutureDay || (hasSaved && !isUnlocked);
            const assignment = planCoversStudent(st._id) ? assignmentForStudent(st._id) : undefined;
            const savingThis = bulkEvaluate.isPending && lastSavedId === st._id;

            return (
              <View key={st._id} style={[styles.row, i < students.length - 1 && styles.rowBorder]}>
                <Pressable
                  style={styles.rowTop}
                  onPress={() => setExpandedStudentId((prev) => (prev === st._id ? null : st._id))}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{avatarInitials(st.name)}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.name}>{st.name}</Text>
                    <Text style={styles.sub}>
                      {hasSaved
                        ? `${e.attendanceStatus} — ${total}/${TOTAL_MAX}${isUnlocked ? ' (وضع التعديل)' : ''}`
                        : 'لم يُسجَّل لهذا اليوم بعد'}
                    </Text>
                  </View>
                  {isExpanded
                    ? <IconChevronUp size={18} color={theme.textMuted} />
                    : <IconChevronDown size={18} color={theme.textMuted} />}
                </Pressable>

                {isExpanded && (
                  <View style={styles.body}>
                    {assignment ? (() => {
                      // Swap the displayed endpoints for a reverse plan so the
                      // banner reads in the plan's own direction (back→front).
                      const reversed = reversedForStudent(st._id);
                      const from = reversed
                        ? { surah: assignment.surahEnd, ayah: assignment.ayahEnd, page: assignment.pageEnd }
                        : { surah: assignment.surahStart, ayah: assignment.ayahStart, page: assignment.pageStart };
                      const to = reversed
                        ? { surah: assignment.surahStart, ayah: assignment.ayahStart, page: assignment.pageStart }
                        : { surah: assignment.surahEnd, ayah: assignment.ayahEnd, page: assignment.pageEnd };
                      return (
                        <View style={styles.banner}>
                          <IconBook2 size={20} color={theme.green} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.bannerLabel}>
                              الورد المقرر{reversed ? ' · بالعكس' : ''}
                            </Text>
                            <Text style={styles.bannerRange}>
                              {surahName(from.surah)} : {from.ayah} ← {surahName(to.surah)} : {to.ayah}
                            </Text>
                            <View style={styles.pillRow}>
                              <Text style={styles.pill}>
                                {from.page !== to.page
                                  ? `من صفحة ${from.page} إلى صفحة ${to.page}`
                                  : `صفحة ${from.page}`}
                              </Text>
                              <Text style={styles.pill}>الجزء {assignment.juz}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })() : (
                      <Text style={styles.sub}>لا يوجد جزء مخصص لهذا اليوم</Text>
                    )}

                    {hasSaved && !isUnlocked && !isFutureDay && (
                      <Alert variant="success" icon={<IconLock size={16} color="#166534" />}>
                        تم تسجيل حضور وتقييم {st.name} لهذا اليوم. اضغط "تعديل" لتصحيح البيانات.
                      </Alert>
                    )}

                    <View style={styles.toggleRow}>
                      <Pressable
                        haptic="select"
                        disabled={locked}
                        onPress={() => setAttendance(st._id, 'حاضر')}
                        style={[
                          styles.toggle,
                          !isAbsent && { backgroundColor: theme.greenPale, borderColor: theme.greenAccent },
                          locked && styles.disabled,
                        ]}
                      >
                        <IconCheck size={14} color={!isAbsent ? theme.green : theme.textMuted} />
                        <Text style={[styles.toggleText, !isAbsent && { color: theme.green, fontFamily: theme.fontCairoBold }]}>حاضر</Text>
                      </Pressable>
                      <Pressable
                        haptic="select"
                        disabled={locked}
                        onPress={() => setAttendance(st._id, 'غائب')}
                        style={[
                          styles.toggle,
                          isAbsent && { backgroundColor: theme.red + '20', borderColor: theme.red },
                          locked && styles.disabled,
                        ]}
                      >
                        <IconX size={14} color={isAbsent ? theme.red : theme.textMuted} />
                        <Text style={[styles.toggleText, isAbsent && { color: theme.red, fontFamily: theme.fontCairoBold }]}>غائب</Text>
                      </Pressable>
                    </View>

                    {!isAbsent && assignment && (() => {
                      // "وصل إلى" and the leftover are both measured in the plan's
                      // own direction: a reverse day is worked from its high end
                      // down, so it's complete once the student reaches its low end.
                      const reversedHere = reversedForStudent(st._id);
                      const actualPoint = completedPointFor(st._id, assignment);
                      const delta = dayDeltaAyahs(assignment, reversedHere, actualPoint);
                      const isFull = delta === 0;
                      return (
                        <View style={styles.completionBox}>
                          <Text style={styles.completionLabel}>
                            الورد الفعلي — السورة والآية التي وصل إليها الطالب
                          </Text>
                          <SurahAyahPicker
                            value={actualPoint}
                            onChange={(v) => setCompletionOverrides((p) => ({ ...p, [st._id]: clampReached(v, assignment, st._id) }))}
                            bounds={reachedBounds(assignment, st._id)}
                            disabled={locked}
                          />
                          <Text style={styles.wardRange}>
                            {reversedHere
                              ? `من ${surahName(assignment.surahEnd)} : ${assignment.ayahEnd} إلى ${surahName(assignment.surahStart)} : ${assignment.ayahStart}`
                              : `من ${surahName(assignment.surahStart)} : ${assignment.ayahStart} إلى ${surahName(assignment.surahEnd)} : ${assignment.ayahEnd}`}
                          </Text>
                          {!isFull && !locked && (
                            <Button
                              label="الورد كامل"
                              variant="ghost"
                              size="sm"
                              onPress={() => setCompletionOverrides((p) => ({ ...p, [st._id]: dayFinishPoint(assignment, reversedHere) }))}
                            />
                          )}
                          <Text style={[styles.completionHint, { color: delta >= 0 ? theme.green : theme.gold }]}>
                            {isFull
                              ? 'سيُسجَّل كمكتمل'
                              : delta > 0
                                ? `سمّع ${delta} آية إضافية — سيتم خصمها من باقي أيام خطته`
                                : `سيتم تعويض ${-delta} آية في باقي أيام خطته`}
                          </Text>
                        </View>
                      );
                    })()}

                    {(['hifz', 'tajweed', 'talawah'] as ScoreCategory[]).map((cat) => (
                      <View key={cat}>
                        <Text style={styles.catLabel}>{CATEGORY_LABELS[cat]} (0-{MAX_SCORES[cat]})</Text>
                        <View style={styles.scoreChipRow}>
                          {Array.from({ length: MAX_SCORES[cat] + 1 }, (_, n) => n).map((n) => {
                            const active = !isAbsent && e[cat] === n;
                            return (
                              <Pressable
                                haptic="select"
                                key={n}
                                disabled={isAbsent || locked}
                                onPress={() => setScore(st._id, cat, n)}
                                style={[
                                  styles.scoreChip,
                                  active && { backgroundColor: theme.greenAccent, borderColor: theme.green },
                                  (isAbsent || locked) && styles.disabled,
                                ]}
                              >
                                <Text style={[styles.scoreChipText, active && { color: theme.white }]}>{n}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                    <Text style={styles.totalLine}>المجموع {total}/{TOTAL_MAX}</Text>

                    {isFutureDay ? (
                      <Button label="اليوم لم يحن بعد" variant="ghost" disabled fullWidth />
                    ) : hasSaved && !isUnlocked ? (
                      <Button
                        label="تعديل"
                        variant="ghost"
                        fullWidth
                        icon={<IconEdit size={16} color={theme.green} />}
                        onPress={() => setUnlockedIds((prev) => new Set(prev).add(st._id))}
                      />
                    ) : (
                      <Button
                        label={savingThis ? 'جارٍ الحفظ...' : isUnlocked ? 'حفظ التعديلات' : 'حفظ لهذا الطالب'}
                        fullWidth
                        loading={savingThis}
                        disabled={bulkEvaluate.isPending}
                        icon={<IconDeviceFloppy size={16} color={theme.white} />}
                        onPress={() => saveStudent(st._id, st.name)}
                      />
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </Card>

        {history.length > 0 && (
          <Card>
            <CardHeader title="سجل الجلسات" right={<IconHistory size={18} color={theme.green} />} />
            {history.map((r, i) => (
              <View key={r._id} style={[styles.histRow, i < history.length - 1 && styles.rowBorder]}>
                <View style={styles.histTop}>
                  <Text style={styles.histName}>
                    {typeof r.student === 'string' ? r.student : r.student.name}
                  </Text>
                  <Badge label={r.attendanceStatus} variant={r.attendanceStatus === 'حاضر' ? 'green' : 'red'} />
                  <Text style={styles.histDate}>{toDateOnly(r.date)}</Text>
                </View>
                <Text style={styles.histScores}>
                  حضور {r.scores.attendance}/{MAX_SCORES.attendance} · حفظ {r.scores.hifz}/{MAX_SCORES.hifz} ·
                  تجويد {r.scores.tajweed}/{MAX_SCORES.tajweed} · تلاوة {r.scores.talawah}/{MAX_SCORES.talawah} ·
                  المجموع {r.total}/{TOTAL_MAX}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {(topScoreRows.length > 0 || topAttendanceRows.length > 0) && (
          <Card>
            <CardHeader title="أبرز الطلاب" right={<IconMedal size={18} color={theme.gold} />} />
            {topScoreRows.length > 0 && (
              <>
                <View style={styles.spotTitle}>
                  <IconTrophy size={14} color={theme.gold} />
                  <Text style={styles.spotTitleText}>الأعلى تقييمًا</Text>
                </View>
                <Leaderboard rows={topScoreRows} />
              </>
            )}
            {topAttendanceRows.length > 0 && (
              <>
                <View style={styles.spotTitle}>
                  <IconCalendarCheck size={14} color={theme.green} />
                  <Text style={styles.spotTitleText}>الأعلى حضورًا</Text>
                </View>
                <Leaderboard rows={topAttendanceRows} />
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
