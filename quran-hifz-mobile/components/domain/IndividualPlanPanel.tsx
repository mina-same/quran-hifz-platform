import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import SheetTriggerRow from '@/components/ui/SheetTriggerRow';
import { fmtShortDate, type ScheduleItem } from '@/components/domain/ScheduleSheet';
import PlanStudentScheduleSheet from '@/components/domain/PlanStudentScheduleSheet';
import FormGroup from '@/components/forms/FormGroup';
import FormInput from '@/components/forms/FormInput';
import { toast } from '@/components/ui/Toast';
import SurahAyahPicker from '@/components/domain/SurahAyahPicker';
import {
  useStudentPlanProgress, useInitStudentPlanProgress, useReflowStudentPlan, useUpdateStudentScheduleEntry, planSegment, isOpenPlan,
  type QuranPlan, type StudentOccurrenceStatus,
} from '@/lib/queries/quranPlan';
import OpenWardLogSheet from '@/components/domain/OpenWardLogSheet';
import type { PlanType } from '@/lib/quranRange';
import { IconCalendarEvent } from '@tabler/icons-react-native';
import { fractionalPage, isReversedRange, isReversedSchedule, orientSlice, surahName, type RangePoint } from '@/lib/quranRange';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

const STATUS_LABEL: Record<StudentOccurrenceStatus, string> = {
  pending: 'قادم', done: 'منجَز', partial: 'جزئي', absent: 'غياب',
};

/** A clean page boundary shows as an integer, a mid-page position with one
 *  decimal (e.g. 2.7) — same as web's pageLabel. */
function pageLabel(point: RangePoint, edge: 'start' | 'end'): string {
  const { value, isPartial } = fractionalPage(point, edge);
  return isPartial ? value.toFixed(1) : String(value);
}

const clampInt = (v: string, max: number) => Math.max(1, Math.min(max, Number(v) || 1));
const STATUS_VARIANT: Record<StudentOccurrenceStatus, 'gray' | 'green' | 'gold' | 'red'> = {
  pending: 'gray', done: 'green', partial: 'gold', absent: 'red',
};

interface Props {
  planId: string;
  studentId: string;
  studentName: string;
  /** The shared track plan this student's overlay hangs off — used as the
   * default custom-range seed and the direction fallback before the student has
   * any occurrences of their own. */
  basePlan: QuranPlan;
  /** Which of the plan's types this panel is for. A custom range belongs to one
   * type — each covers its own stretch of the mushaf — so with a multi-type
   * plan the caller must say which. Falls back to the only segment when the
   * plan has just one. */
  type?: PlanType;
  /** Supervisor viewing this track — hides "إنشاء الخطة الفردية" /
   * "إعادة حساب التوزيع" (both mutations); the schedule view stays visible. */
  readOnly?: boolean;
}

/** Per-student "individual plan" overlay: shows the student's own effective
 * schedule (base/original vs current, after any partial-day shrink or manual
 * edit), lets the teacher/admin create it on demand, and re-run the
 * redistribution algorithm. Direction (reversed) is inferred from the
 * student's own occurrences first, falling back to the base plan's direction —
 * a custom-range overlay can run opposite to the plan it hangs off. */
export default function IndividualPlanPanel({ planId, studentId, studentName, basePlan, type, readOnly }: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const { data: progress, isLoading } = useStudentPlanProgress(planId, studentId);
  const initProgress = useInitStudentPlanProgress();
  const reflow = useReflowStudentPlan();
  const updateEntry = useUpdateStudentScheduleEntry();

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
  // Web's per-row inline edit of one occurrence.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [rangeStart, setRangeStart] = useState<RangePoint>({ surahNumber: 1, ayah: 1 });
  const [rangeEnd, setRangeEnd] = useState<RangePoint>({ surahNumber: 1, ayah: 1 });
  const [pageStart, setPageStart] = useState(1);
  const [pageEnd, setPageEnd] = useState(1);
  const [juz, setJuz] = useState(1);
  const [error, setError] = useState('');

  // Only this type's days — a multi-type plan's overlay holds every type's
  // occurrences in one array, and mixing them would read as one jumbled
  // schedule and infer the wrong direction.
  const ownSchedule = useMemo(
    () => (progress?.effectiveSchedule ?? []).filter((o) => !segType || o.type === segType),
    [progress?.effectiveSchedule, segType],
  );

  const reversed = useMemo(
    () => isReversedSchedule(ownSchedule)
      ?? (segment?.rangeStart && segment.rangeEnd ? isReversedRange(segment.rangeStart, segment.rangeEnd) : false),
    [ownSchedule, segment],
  );

  // An open-ward plan has no per-student schedule to reshape — show what the
  // student actually recorded instead. Callers render one panel per segment,
  // so only the first segment's panel draws the (type-mixed) log.
  if (isOpenPlan(basePlan)) {
    if (type && type !== basePlan.segments[0]?.type) return null;
    return (
      <View style={{ gap: 6 }}>
        <Text style={s.muted}>خطة بدون مقطع محدد — هذا سجل ما حفظه {studentName}.</Text>
        <OpenWardLogSheet planId={planId} studentId={studentId} label="سجل ورد الطالب" />
      </View>
    );
  }

  if (isLoading) {
    return <Text style={s.muted}>جارٍ التحميل...</Text>;
  }

  function startEdit(index: number) {
    const entry = ownSchedule.find((o) => o.occurrenceIndex === index);
    if (!entry) return;
    setShowSchedule(false);
    setEditingIndex(index);
    setRangeStart({ surahNumber: entry.surahStart, ayah: entry.ayahStart });
    setRangeEnd({ surahNumber: entry.surahEnd, ayah: entry.ayahEnd });
    setPageStart(entry.pageStart);
    setPageEnd(entry.pageEnd);
    setJuz(entry.juz);
    setError('');
  }

  async function saveEdit() {
    if (editingIndex == null) return;
    const startsBeforeEnd =
      rangeStart.surahNumber < rangeEnd.surahNumber ||
      (rangeStart.surahNumber === rangeEnd.surahNumber && rangeStart.ayah <= rangeEnd.ayah);
    if (!startsBeforeEnd) { setError('نقطة البداية يجب أن تسبق نقطة النهاية'); return; }
    if (pageStart > pageEnd) { setError('صفحة البداية يجب أن تسبق صفحة النهاية'); return; }
    setError('');
    try {
      await updateEntry.mutateAsync({
        planId, studentId, occurrenceIndex: editingIndex,
        surahStart: rangeStart.surahNumber, ayahStart: rangeStart.ayah,
        surahEnd: rangeEnd.surahNumber, ayahEnd: rangeEnd.ayah,
        pageStart, pageEnd, juz,
      });
      setEditingIndex(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!progress?.progressIsPersisted) {
    return (
      <View style={s.box}>
        <View style={s.headRow}>
          <Text style={s.boxTitle}>إنشاء خطة فردية لـ{studentName}</Text>
          {segType && <Badge label={segType} variant={segType === 'حفظ' ? 'green' : 'gold'} />}
        </View>
        {!readOnly && (
          <>
            <Text style={s.label}>
              اختر النطاق الذي سيحفظه {studentName} — سيُقسَّم على نفس أيام الخطة العامة. يمكن أن تكون نقطة "من" بعد نقطة "إلى" في المصحف (خطة بالعكس).
            </Text>
            <View style={{ gap: 10 }}>
              <FormGroup label="من">
                <SurahAyahPicker value={customStart} onChange={setCustomStart} />
              </FormGroup>
              <FormGroup label="إلى">
                <SurahAyahPicker value={customEnd} onChange={setCustomEnd} />
              </FormGroup>
            </View>
            <Button
              label={initProgress.isPending ? 'جارٍ الإنشاء...' : 'إنشاء الخطة الفردية'}
              onPress={() => initProgress.mutate({ planId, studentId, type: segType, rangeStart: customStart, rangeEnd: customEnd })}
              disabled={initProgress.isPending}
              style={{ marginTop: 10 }}
              fullWidth
            />
          </>
        )}
      </View>
    );
  }

  // One card per occurrence: the six-column table this replaced could only be
  // read by scrolling sideways inside an already-nested, already-scrolling row.
  const items: ScheduleItem[] = ownSchedule.map((occ) => {
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
      pages: occ.noWard ? '—' : reversed
        ? `${pageLabel({ surahNumber: occ.surahEnd, ayah: occ.ayahEnd }, 'end')} - ${pageLabel({ surahNumber: occ.surahStart, ayah: occ.ayahStart }, 'start')}`
        : `${pageLabel({ surahNumber: occ.surahStart, ayah: occ.ayahStart }, 'start')} - ${pageLabel({ surahNumber: occ.surahEnd, ayah: occ.ayahEnd }, 'end')}`,
      strikeRange: changed
        ? `${surahName(baseOriented.surahStart)}:${baseOriented.ayahStart} — ${surahName(baseOriented.surahEnd)}:${baseOriented.ayahEnd}`
        : undefined,
      badge: { label: statusLabel, variant: STATUS_VARIANT[occ.status] },
    };
  });

  const doneCount = ownSchedule.filter((o) => o.status === 'done').length;

  return (
    <View style={s.box}>
      <View style={s.headRow}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Badge label="توزيع فردي محفوظ" variant="green" />
          {segType && <Badge label={segType} variant={segType === 'حفظ' ? 'green' : 'gold'} />}
        </View>
        {!readOnly && (
          <Button
            label={reflow.isPending ? 'جارٍ إعادة الحساب...' : 'إعادة حساب التوزيع'}
            variant="ghost"
            onPress={() => reflow.mutate({ planId, studentId }, { onError: (e) => toast.error((e as Error).message) })}
            disabled={reflow.isPending}
          />
        )}
      </View>

      {progress.overflowPages > 0 && (
        <Alert variant="warning">
          يوجد {progress.overflowPages} صفحة متبقية بلا مكان في الأيام المتاحة — أضف يومًا جديدًا للخطة العامة لاستيعابها.
        </Alert>
      )}

      <SheetTriggerRow
        label="التوزيع اليومي للطالب"
        value={`${doneCount} / ${items.length} مكتمل`}
        icon={<IconCalendarEvent size={17} color={theme.green} />}
        onPress={() => setShowSchedule(true)}
      />

      {editingIndex != null && (() => {
        const entry = ownSchedule.find((o) => o.occurrenceIndex === editingIndex);
        return (
          <View style={s.editBox}>
            <Text style={s.boxTitle}>{editingIndex}{entry ? ` · ${fmtShortDate(entry.date)}` : ''}</Text>
            <FormGroup label="من">
              <SurahAyahPicker value={rangeStart} onChange={setRangeStart} />
            </FormGroup>
            <FormGroup label="إلى">
              <SurahAyahPicker value={rangeEnd} onChange={setRangeEnd} />
            </FormGroup>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <FormGroup label="الصفحات">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ flex: 1 }}>
                      <FormInput keyboardType="number-pad" value={String(pageStart)} onChangeText={(v) => setPageStart(clampInt(v, 604))} />
                    </View>
                    <Text style={s.label}>-</Text>
                    <View style={{ flex: 1 }}>
                      <FormInput keyboardType="number-pad" value={String(pageEnd)} onChangeText={(v) => setPageEnd(clampInt(v, 604))} />
                    </View>
                  </View>
                </FormGroup>
              </View>
              <View style={{ width: 72 }}>
                <FormGroup label="الجزء">
                  <FormInput keyboardType="number-pad" value={String(juz)} onChangeText={(v) => setJuz(clampInt(v, 30))} />
                </FormGroup>
              </View>
            </View>
            {!!error && <Alert variant="error">{error}</Alert>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button label={updateEntry.isPending ? '...' : 'حفظ'} onPress={saveEdit} disabled={updateEntry.isPending} fullWidth />
              </View>
              <Button label="إلغاء" variant="ghost" onPress={() => setEditingIndex(null)} />
            </View>
          </View>
        );
      })()}

      <PlanStudentScheduleSheet
        visible={showSchedule}
        onClose={() => setShowSchedule(false)}
        title={`توزيع ${studentName}`}
        items={items}
        onEdit={readOnly ? undefined : startEdit}
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
    editBox: { gap: 10, borderWidth: 1, borderColor: theme.green, backgroundColor: theme.greenPale, borderRadius: 10, padding: 10 },
  });
}
