import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import SheetTriggerRow from '@/components/ui/SheetTriggerRow';
import ScheduleSheet, { fmtShortDate, fmtPages, type ScheduleItem } from '@/components/domain/ScheduleSheet';
import SurahAyahPicker from '@/components/domain/SurahAyahPicker';
import {
  useStudentPlanProgress, useInitStudentPlanProgress, useReflowStudentPlan, planSegment,
  type QuranPlan, type StudentOccurrenceStatus,
} from '@/lib/queries/quranPlan';
import type { PlanType } from '@/lib/quranRange';
import { IconCalendarEvent } from '@tabler/icons-react-native';
import { isReversedRange, isReversedSchedule, orientSlice, surahName, type RangePoint } from '@/lib/quranRange';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

const STATUS_LABEL: Record<StudentOccurrenceStatus, string> = {
  pending: 'قيد الانتظار', done: 'مكتمل', partial: 'جزئي', absent: 'غائب',
};
const STATUS_VARIANT: Record<StudentOccurrenceStatus, 'gray' | 'green' | 'gold' | 'red'> = {
  pending: 'gray', done: 'green', partial: 'gold', absent: 'red',
};

interface Props {
  planId: string;
  studentId: string;
  studentName: string;
  /** The shared halqa/track plan this student's overlay hangs off — used as the
   * default custom-range seed and the direction fallback before the student has
   * any occurrences of their own. */
  basePlan: QuranPlan;
  /** Which of the plan's types this panel is for. A custom range belongs to one
   * type — each covers its own stretch of the mushaf — so with a multi-type
   * plan the caller must say which. Falls back to the only segment when the
   * plan has just one. */
  type?: PlanType;
}

/** Per-student "individual plan" overlay: shows the student's own effective
 * schedule (base/original vs current, after any partial-day shrink or manual
 * edit), lets the teacher/admin create it on demand, and re-run the
 * redistribution algorithm. Direction (reversed) is inferred from the
 * student's own occurrences first, falling back to the base plan's direction —
 * a custom-range overlay can run opposite to the plan it hangs off. */
export default function IndividualPlanPanel({ planId, studentId, studentName, basePlan, type }: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const { data: progress, isLoading } = useStudentPlanProgress(planId, studentId);
  const initProgress = useInitStudentPlanProgress();
  const reflow = useReflowStudentPlan();

  // The segment this panel covers, and the range it seeds the pickers with.
  const segment = planSegment(basePlan, type);
  const segType = segment?.type ?? type;

  const [customStart, setCustomStart] = useState<RangePoint>(
    segment?.rangeStart ?? { surahNumber: 1, ayah: 1 },
  );
  const [customEnd, setCustomEnd] = useState<RangePoint>(
    segment?.rangeEnd ?? { surahNumber: 114, ayah: 6 },
  );
  const [showSchedule, setShowSchedule] = useState(false);

  // Only this type's days — a multi-type plan's overlay holds every type's
  // occurrences in one array, and mixing them would read as one jumbled
  // schedule and infer the wrong direction.
  const ownSchedule = useMemo(
    () => (progress?.effectiveSchedule ?? []).filter((o) => !segType || o.type === segType),
    [progress?.effectiveSchedule, segType],
  );

  const reversed = useMemo(
    () => isReversedSchedule(ownSchedule)
      ?? (segment ? isReversedRange(segment.rangeStart, segment.rangeEnd) : false),
    [ownSchedule, segment],
  );

  if (isLoading) {
    return <Text style={s.muted}>جارٍ التحميل...</Text>;
  }

  if (!progress?.progressIsPersisted) {
    return (
      <View style={s.box}>
        <Text style={s.boxTitle}>لا توجد خطة فردية لـ{studentName} بعد</Text>
        <Text style={s.label}>نطاق مخصص (اختياري — افتراضيًا نفس نطاق الخطة)</Text>
        <View style={{ gap: 10 }}>
          <SurahAyahPicker value={customStart} onChange={setCustomStart} />
          <SurahAyahPicker value={customEnd} onChange={setCustomEnd} />
        </View>
        <Button
          label={initProgress.isPending ? 'جارٍ الإنشاء...' : 'إنشاء الخطة الفردية'}
          onPress={() => initProgress.mutate({ planId, studentId, type: segType, rangeStart: customStart, rangeEnd: customEnd })}
          disabled={initProgress.isPending}
          style={{ marginTop: 10 }}
          fullWidth
        />
      </View>
    );
  }

  // One card per occurrence: the six-column table this replaced could only be
  // read by scrolling sideways inside an already-nested, already-scrolling row.
  const items: ScheduleItem[] = progress.effectiveSchedule.map((occ) => {
    const changed = occ.baseSurahStart !== occ.surahStart || occ.baseAyahStart !== occ.ayahStart
      || occ.baseSurahEnd !== occ.surahEnd || occ.baseAyahEnd !== occ.ayahEnd;
    const baseOriented = orientSlice(
      { surahStart: occ.baseSurahStart, ayahStart: occ.baseAyahStart, surahEnd: occ.baseSurahEnd, ayahEnd: occ.baseAyahEnd, pageStart: occ.basePageStart, pageEnd: occ.basePageEnd },
      reversed,
    );
    const curOriented = orientSlice(occ, reversed);
    const statusLabel = STATUS_LABEL[occ.status]
      + (occ.noWard ? ' · لا ورد' : '')
      + (occ.manualOverride ? ' · معدَّلة يدويًا' : '');

    return {
      key: `${occ.occurrenceIndex}-${occ.date}`,
      index: occ.occurrenceIndex,
      date: fmtShortDate(occ.date),
      range: occ.noWard
        ? 'لا يوجد ورد'
        : `${surahName(curOriented.surahStart)}:${curOriented.ayahStart} — ${surahName(curOriented.surahEnd)}:${curOriented.ayahEnd}`,
      pages: occ.noWard ? '—' : fmtPages(curOriented.pageStart, curOriented.pageEnd),
      strikeRange: changed
        ? `${surahName(baseOriented.surahStart)}:${baseOriented.ayahStart} — ${surahName(baseOriented.surahEnd)}:${baseOriented.ayahEnd}`
        : undefined,
      badge: { label: statusLabel, variant: STATUS_VARIANT[occ.status] },
    };
  });

  const doneCount = progress.effectiveSchedule.filter((o) => o.status === 'done').length;

  return (
    <View style={s.box}>
      <View style={s.headRow}>
        <Badge label="توزيع فردي محفوظ" variant="green" />
        <Button
          label={reflow.isPending ? '...' : 'إعادة حساب التوزيع'}
          variant="ghost"
          onPress={() => reflow.mutate({ planId, studentId })}
          disabled={reflow.isPending}
        />
      </View>

      {progress.overflowPages > 0 && (
        <Alert variant="warning">
          يحتاج {studentName} إلى {progress.overflowPages} صفحة إضافية — قد يتطلب الأمر يومًا إضافيًا لإكمال الورد.
        </Alert>
      )}

      <SheetTriggerRow
        label="التوزيع اليومي للطالب"
        value={`${doneCount} / ${items.length} مكتمل`}
        icon={<IconCalendarEvent size={17} color={theme.green} />}
        onPress={() => setShowSchedule(true)}
      />

      <ScheduleSheet
        visible={showSchedule}
        onClose={() => setShowSchedule(false)}
        title={`توزيع ${studentName}`}
        items={items}
      />
    </View>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    box: { gap: 10, marginTop: 10 },
    boxTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    label: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    muted: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 10 },
    headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  });
}
