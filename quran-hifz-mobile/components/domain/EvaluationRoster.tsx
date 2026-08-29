import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import {
  IconBook2, IconCheck, IconChevronDown, IconChevronUp, IconCircleCheck,
  IconDeviceFloppy, IconEdit, IconLock, IconX,
} from '@tabler/icons-react-native';
import SurahAyahPicker from '@/components/domain/SurahAyahPicker';
import type { DaySchedule } from '@/components/domain/DaySlider';
import { useEvaluations, useBulkEvaluate, type BulkEvaluateRecord } from '@/lib/queries/evaluations';
import { useStudentPlanProgressList, useRecordStudentOccurrence, type QuranPlan } from '@/lib/queries/quranPlan';
import { MAX_SCORES, TOTAL_MAX } from '@/lib/evaluationRubric';
import {
  dayFinishPoint, dayDeltaAyahs, planFinishPoint, toFlatIndex, fromFlatIndex,
  isReversedSchedule, isReversedRange, surahName, type RangePoint, type ScheduleEntry,
} from '@/lib/quranRange';
import { toDateOnly } from '@/lib/date';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { success, warning, error } from '@/lib/haptics';

type AppTheme = ReturnType<typeof useAppTheme>;

function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
}

export type ScoreCategory = 'hifz' | 'tajweed' | 'talawah';
const CATEGORY_LABELS: Record<ScoreCategory, string> = { hifz: 'حفظ', tajweed: 'تجويد', talawah: 'تلاوة' };
export type StudentEval = { attendanceStatus: 'حاضر' | 'غائب'; hifz: number; tajweed: number; talawah: number };
/** Scores start at 0 so the teacher consciously awards points. */
function blankEval(): StudentEval {
  return { attendanceStatus: 'حاضر', hifz: 0, tajweed: 0, talawah: 0 };
}
function totalOf(e: StudentEval): number {
  if (e.attendanceStatus === 'غائب') return 0;
  return MAX_SCORES.attendance + e.hifz + e.tajweed + e.talawah;
}

export interface RosterContext {
  kind: 'halqa' | 'specialTrack';
  id: string;
}

interface Props {
  students: { _id: string; name: string }[];
  /** The halqa or track the evaluation is filed under. */
  context: RosterContext;
  /** Teacher the evaluation is recorded against. The bulk-evaluate payload
   * requires one, so a screen with no teacher in hand (the admin drill-down)
   * must pass the context's own teacher rather than the signed-in user. */
  teacherId?: string;
  /** The plan the day's ward comes from, if the context has one linked. */
  linkedPlan?: QuranPlan;
  /** The day being recorded, from `useDaySchedule`. */
  daySchedule: DaySchedule;
  /** Rendered inside the empty state instead of the default copy. */
  emptyLabel?: string;
  /** Extra content for an expanded student row, above the save button — the
   * track drill-down uses it to hang the individual-plan panel off each row. */
  renderExtra?: (student: { _id: string; name: string }) => React.ReactNode;
}

/**
 * The per-student attendance + evaluation roster: today's assigned ward
 * (الورد المقرر), the actual point the student reached (الورد الفعلي) with the
 * reflow preview, the three rubric score rows, and a per-student save that
 * feeds the outcome back into their individual plan overlay.
 *
 * Owns all of its own state and mutations so both the teacher's attendance
 * screen and the track drill-down can drop it in unchanged.
 */
export default function EvaluationRoster({
  students, context, teacherId, linkedPlan, daySchedule, emptyLabel, renderExtra,
}: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createS(theme), [theme]);
  const { effectiveDate, isFutureDay, assignmentByDate } = daySchedule;

  const bulkEvaluate = useBulkEvaluate();
  const recordOccurrence = useRecordStudentOccurrence();

  const rangeReversed = !!linkedPlan && isReversedRange(linkedPlan.rangeStart, linkedPlan.rangeEnd);

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

  // Already-saved evaluations for the selected day.
  const contextFilter = context.kind === 'halqa' ? { halqa: context.id } : { specialTrack: context.id };
  const { data: savedForDay = [] } = useEvaluations({ ...contextFilter, from: effectiveDate, to: effectiveDate });
  const savedById: Record<string, StudentEval> = {};
  for (const r of savedForDay) {
    const id = typeof r.student === 'string' ? r.student : r.student._id;
    savedById[id] = {
      attendanceStatus: r.attendanceStatus,
      hifz: r.scores.hifz, tajweed: r.scores.tajweed, talawah: r.scores.talawah,
    };
  }

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

  function saveStudent(studentId: string, studentName: string) {
    if (isFutureDay || !teacherId) return;
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
      { teacher: teacherId, ...contextFilter, date: effectiveDate, records },
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

  if (students.length === 0) {
    return <Text style={styles.muted}>{emptyLabel ?? 'لا يوجد طلاب'}</Text>;
  }

  return (
    <>
      {!!savedNotice && (
        <Alert variant="success" icon={<IconCircleCheck size={18} color={theme.tone.green.text} />}>{savedNotice}</Alert>
      )}
      {unnotified.length > 0 && (
        <Alert variant="warning">
          تعذر إرسال إشعار عن غياب: {unnotified.map((u) => u.name).join('، ')} — لا يوجد ولي أمر مرتبط بالحساب.
        </Alert>
      )}
      {bulkEvaluate.isError && <Alert variant="error">{(bulkEvaluate.error as Error).message}</Alert>}
      {recordOccurrence.isError && <Alert variant="error">{(recordOccurrence.error as Error).message}</Alert>}
      {!teacherId && (
        <Alert variant="warning">
          لا يمكن تسجيل الحضور والتقييم — لا يوجد معلم مُسنَد لهذا السياق.
        </Alert>
      )}

      {students.map((st, i) => {
        const e = evalFor(st._id);
        const isAbsent = e.attendanceStatus === 'غائب';
        const total = totalOf(e);
        const isExpanded = expandedStudentId === st._id;
        const hasSaved = !!savedById[st._id];
        const isUnlocked = unlockedIds.has(st._id);
        const locked = isFutureDay || !teacherId || (hasSaved && !isUnlocked);
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
                  <Alert variant="success" icon={<IconLock size={16} color={theme.tone.green.text} />}>
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

                {renderExtra?.(st)}

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
                    disabled={bulkEvaluate.isPending || !teacherId}
                    icon={<IconDeviceFloppy size={16} color={theme.white} />}
                    onPress={() => saveStudent(st._id, st.name)}
                  />
                )}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },

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
    disabled: { opacity: 0.5 },
  });
}
