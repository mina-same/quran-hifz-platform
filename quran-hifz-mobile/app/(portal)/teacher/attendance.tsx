import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCircleCheck } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import ContextCard, { halqaToContext, trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import SurahAyahPicker from '@/components/domain/SurahAyahPicker';
import { useHalqat } from '@/lib/queries/halqat';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
import { useStudents } from '@/lib/queries/students';
import { useAttendance, useBulkAttendance } from '@/lib/queries/attendance';
import { useQuranPlans, useStudentPlanProgressList, useRecordStudentOccurrence } from '@/lib/queries/quranPlan';
import { dayFinishPoint, dayDeltaAyahs, planFinishPoint, toFlatIndex, fromFlatIndex, isReversedSchedule, isReversedRange, type RangePoint, type ScheduleEntry } from '@/lib/quranRange';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AttStatus = 'حاضر' | 'غائب' | 'متأخر';
const OPTIONS: AttStatus[] = ['حاضر', 'غائب', 'متأخر'];

export default function TeacherAttendance() {
  const theme = useAppTheme();
  const STATUS_COLOR: Record<AttStatus, string> = {
    'حاضر': theme.green,
    'غائب': theme.red,
    'متأخر': theme.gold,
  };
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [overrides, setOverrides] = useState<Record<string, AttStatus>>({});
  const [saved, setSaved] = useState(false);

  const {
    data: halqat = [],
    isLoading: loadingHalqat,
    refetch: refetchHalqat,
    isRefetching: refetchingHalqat,
  } = useHalqat({ teacher: profileId });
  const {
    data: tracks = [],
    isLoading: loadingTracks,
    refetch: refetchTracks,
    isRefetching: refetchingTracks,
  } = useSpecialTracks(undefined, profileId);

  const contextFilter = selected
    ? selected.kind === 'halqa' ? { halqa: selected.id } : { specialTrack: selected.id }
    : undefined;

  const {
    data: students = [],
    isLoading: loadingStudents,
    refetch: refetchStudents,
    isRefetching: refetchingStudents,
  } = useStudents(contextFilter);

  const bulkAttendance = useBulkAttendance();
  const [unnotified, setUnnotified] = useState<{ id: string; name: string }[]>([]);

  const today = new Date().toISOString().split('T')[0];

  // Today's already-saved attendance for this context, so re-opening the same
  // halqa/track later the same day shows what was actually recorded instead of
  // resetting every student back to the 'حاضر' default.
  const {
    data: savedToday = [],
    refetch: refetchAttendance,
    isRefetching: refetchingAttendance,
  } = useAttendance(
    contextFilter ? { ...contextFilter, from: today, to: today } : undefined,
  );
  const savedStatusById: Record<string, AttStatus> = {};
  for (const r of savedToday) {
    const id = typeof r.student === 'string' ? r.student : r.student._id;
    savedStatusById[id] = r.status as AttStatus;
  }
  const statusFor = (studentId: string): AttStatus => overrides[studentId] ?? savedStatusById[studentId] ?? 'حاضر';

  function setStatus(studentId: string, status: AttStatus) {
    setOverrides((p) => ({ ...p, [studentId]: status }));
  }

  // ── Actual-completion ("الورد الفعلي") tracking against any active Quran plan ──
  const { data: plans = [], refetch: refetchPlans, isRefetching: refetchingPlans } = useQuranPlans(contextFilter);
  const linkedPlan = plans.find((p) => p.targetType === (selected?.kind === 'specialTrack' ? 'specialTrack' : 'halqa')) ?? plans[0];

  // Today's assignment straight from the plan's own computed schedule.
  const todayAssignment = useMemo(() => {
    for (const e of linkedPlan?.schedule ?? []) {
      if (e.date && e.date.slice(0, 10) === today) return e;
    }
    return undefined;
  }, [linkedPlan, today]);

  function planCoversStudent(studentId: string): boolean {
    if (!linkedPlan) return false;
    if (linkedPlan.targetType === 'students') {
      return (linkedPlan.students ?? []).some((s) => (typeof s === 'string' ? s : s._id) === studentId);
    }
    return true; // halqa/specialTrack plan covers every student fetched under that context
  }

  const coveredStudentIds = useMemo(
    () => (todayAssignment ? students.map((s) => s._id).filter(planCoversStudent) : []),
    [students, linkedPlan, todayAssignment],
  );
  const progressByStudentId = useStudentPlanProgressList(linkedPlan?._id, coveredStudentIds);
  const recordOccurrence = useRecordStudentOccurrence();

  // A student's own effective schedule (absence/shortfall reflow already
  // applied) takes priority; falls back to the shared plan's own schedule for
  // anyone without an individual overlay yet.
  function assignmentForStudent(studentId: string): ScheduleEntry | undefined {
    const perStudent = progressByStudentId[studentId]?.effectiveSchedule.find((o) => o.date?.slice(0, 10) === today);
    return perStudent ?? todayAssignment;
  }
  // A student's own overlay can run the opposite direction to the shared plan
  // (a custom-range individual plan), so infer direction from their own
  // schedule first and only fall back to the base plan's direction.
  function reversedForStudent(studentId: string): boolean {
    return isReversedSchedule(progressByStudentId[studentId]?.effectiveSchedule) ??
      (linkedPlan ? isReversedRange(linkedPlan.rangeStart, linkedPlan.rangeEnd) : false);
  }

  const [completionOverrides, setCompletionOverrides] = useState<Record<string, RangePoint>>({});
  function completedPointFor(studentId: string, assignment: ScheduleEntry): RangePoint {
    return completionOverrides[studentId] ?? dayFinishPoint(assignment, reversedForStudent(studentId));
  }
  /** Clamps a teacher-picked completion point to what the student could
   * plausibly have reached: no earlier than the start of the day's own ward,
   * and no further than the end of their whole plan — a keen student may
   * recite past today's ward into the following days, but never past the plan
   * itself. Both bounds are read in the plan's own direction, then applied
   * low→high the way slices are always stored. */
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
  /** The picker's own selectable window — the same bounds as `clampReached`,
   * obtained by clamping the mushaf's own extremes. */
  function reachedBounds(assignment: ScheduleEntry, studentId: string) {
    return {
      lo: clampReached({ surahNumber: 1, ayah: 1 }, assignment, studentId),
      hi: clampReached({ surahNumber: 114, ayah: 6 }, assignment, studentId),
    };
  }

  function handleSave() {
    if (!selected) return;
    const records = students.map((s) => ({ student: s._id, status: statusFor(s._id) }));
    bulkAttendance.mutate(
      {
        ...(selected.kind === 'halqa' ? { halqa: selected.id } : { specialTrack: selected.id }),
        date: today,
        records,
      },
      {
        onSuccess: (res) => {
          setSaved(true);
          setUnnotified(res.unnotified);
          setTimeout(() => setSaved(false), 4000);

          // Feed each covered student's actual completion into their Quran-plan
          // overlay so an absence/shortfall gets redistributed across their
          // remaining days.
          if (linkedPlan) {
            for (const studentId of coveredStudentIds) {
              const assignment = assignmentForStudent(studentId);
              if (!assignment) continue;
              if (statusFor(studentId) === 'غائب') {
                recordOccurrence.mutate({ planId: linkedPlan._id, studentId, occurrenceIndex: assignment.occurrenceIndex, status: 'absent' });
                continue;
              }
              const completedPoint = completedPointFor(studentId, assignment);
              // Signed in the plan's own direction: negative = fell short of
              // the day's ward, positive = recited past it. Either way the
              // point is sent, so the server can settle the difference against
              // the student's remaining days (heavier for a shortfall, lighter
              // for a surplus).
              const delta = dayDeltaAyahs(assignment, reversedForStudent(studentId), completedPoint);
              recordOccurrence.mutate(
                delta === 0
                  ? { planId: linkedPlan._id, studentId, occurrenceIndex: assignment.occurrenceIndex, status: 'done' }
                  : {
                      planId: linkedPlan._id, studentId, occurrenceIndex: assignment.occurrenceIndex,
                      status: delta < 0 ? 'partial' : 'done',
                      completedThroughSurah: completedPoint.surahNumber,
                      completedThroughAyah: completedPoint.ayah,
                    },
              );
            }
          }
        },
      },
    );
  }

  const isLoading = loadingHalqat || loadingTracks;
  const isRefreshingSelection = refetchingHalqat || refetchingTracks;
  const onRefreshSelection = () => {
    refetchHalqat();
    refetchTracks();
  };
  const isRefreshingDetail = refetchingStudents || refetchingAttendance || refetchingPlans;
  const onRefreshDetail = () => {
    refetchStudents();
    refetchAttendance();
    refetchPlans();
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },
    studentRow: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    studentName: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    lastHifz: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    optionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radiusSm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    radio: {
      width: 12, height: 12, borderRadius: 6,
      backgroundColor: theme.border,
    },
    optionText: {
      fontSize: 12,
      fontFamily: theme.fontCairo,
      color: theme.text,
    },
    completionBox: {
      marginTop: 4,
      padding: 10,
      borderRadius: theme.radiusSm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      gap: 6,
    },
    completionLabel: {
      fontSize: 11,
      fontFamily: theme.fontCairoBold,
      color: theme.textMuted,
    },
    completionHint: {
      fontSize: 11,
      fontFamily: theme.fontCairo,
    },
  }), [theme]);

  if (!selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshingSelection} onRefresh={onRefreshSelection} colors={[theme.green]} tintColor={theme.green} />}
        >
          {isLoading && <SkeletonRows count={3} rowHeight={92} />}
          {!isLoading && halqat.length === 0 && tracks.length === 0 && (
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshingDetail} onRefresh={onRefreshDetail} colors={[theme.green]} tintColor={theme.green} />}
      >
        {saved && (
          <Alert variant="success" icon={<IconCircleCheck size={18} color="#166534" />}>
            تم حفظ الحضور وإرسال إشعارات لأولياء الأمور عن الطلاب الغائبين.
          </Alert>
        )}
        {saved && unnotified.length > 0 && (
          <Alert variant="error">
            تعذر إرسال إشعار عن غياب: {unnotified.map((s) => s.name).join('، ')} — لا يوجد ولي أمر مرتبط بالحساب.
          </Alert>
        )}
        {bulkAttendance.isError && (
          <Alert variant="error">{(bulkAttendance.error as Error).message}</Alert>
        )}

        <Pressable onPress={() => { setSelected(null); setOverrides({}); }}>
          <Text style={styles.backLink}>‹ رجوع لاختيار الحلقة/المسار</Text>
        </Pressable>

        <Card>
          <CardHeader title={`${selected.title} — ${today}`} />

          {loadingStudents && <SkeletonRows count={4} />}

          {!loadingStudents && students.length === 0 && (
            <Text style={styles.muted}>لا يوجد طلاب</Text>
          )}

          {students.map((st, i) => (
            <View key={st._id} style={[styles.studentRow, i < students.length - 1 && styles.rowBorder]}>
              <Text style={styles.studentName}>{st.name}</Text>
              <Text style={styles.lastHifz}>{st.lastMemorization || '—'}</Text>
              <View style={styles.optionRow}>
                {OPTIONS.map((opt) => {
                  const active = statusFor(st._id) === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setStatus(st._id, opt)}
                      style={[styles.optionBtn, active && { backgroundColor: STATUS_COLOR[opt] + '20', borderColor: STATUS_COLOR[opt] }]}
                    >
                      <View style={[styles.radio, active && { backgroundColor: STATUS_COLOR[opt] }]} />
                      <Text style={[styles.optionText, active && { color: STATUS_COLOR[opt], fontFamily: theme.fontCairoBold }]}>
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {(() => {
                const assignment = assignmentForStudent(st._id);
                if (!assignment || statusFor(st._id) === 'غائب') return null;
                const reversed = reversedForStudent(st._id);
                const completedPoint = completedPointFor(st._id, assignment);
                const delta = dayDeltaAyahs(assignment, reversed, completedPoint);
                return (
                  <View style={styles.completionBox}>
                    <Text style={styles.completionLabel}>الورد الفعلي — وصل إلى</Text>
                    <SurahAyahPicker
                      value={completedPoint}
                      onChange={(v) => setCompletionOverrides((p) => ({ ...p, [st._id]: clampReached(v, assignment, st._id) }))}
                      bounds={reachedBounds(assignment, st._id)}
                    />
                    <Text style={[styles.completionHint, { color: delta >= 0 ? theme.green : theme.gold }]}>
                      {delta === 0
                        ? 'سيُسجَّل كمكتمل'
                        : delta > 0
                          ? `سمّع ${delta} آية إضافية — سيتم خصمها من باقي أيام خطته`
                          : `سيتم تعويض ${-delta} آية في باقي أيام خطته`}
                    </Text>
                  </View>
                );
              })()}
            </View>
          ))}
        </Card>

        <Button
          label={bulkAttendance.isPending ? 'جارٍ الحفظ...' : 'حفظ وإرسال إشعارات'}
          onPress={handleSave}
          disabled={bulkAttendance.isPending || students.length === 0}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}
