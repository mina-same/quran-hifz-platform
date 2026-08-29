import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowRight, IconCalendarOff, IconCalendarEvent, IconX } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import FormGroup from '@/components/forms/FormGroup';
import FormInput from '@/components/forms/FormInput';
import FormTextarea from '@/components/forms/FormTextarea';
import FormSelect from '@/components/forms/FormSelect';
import FormDatePicker from '@/components/forms/FormDatePicker';
import SurahAyahPicker from '@/components/domain/SurahAyahPicker';
import SheetTriggerRow from '@/components/ui/SheetTriggerRow';
import ScheduleSheet, { scheduleItems } from '@/components/domain/ScheduleSheet';
import { useHalqat } from '@/lib/queries/halqat';
import { useQuranPlan, useCreateQuranPlan, useUpdateQuranPlan, type PlanType } from '@/lib/queries/quranPlan';
import { computeScheduleBreakdown, isReversedRange, WEEK_DAYS, type RangePoint } from '@/lib/quranRange';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { success, error } from '@/lib/haptics';
import { AR_LOCALE } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;

const PLAN_TYPES: PlanType[] = ['حفظ', 'مراجعة', 'ترتيل', 'تلاوة'];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Human-readable Arabic label for a bare `YYYY-MM-DD` date — parsed at local
    midnight so the day never shifts (see the date-arithmetic rule in cerebrum). */
function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(AR_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' });
}

type FormFields = {
  name: string;
  type: PlanType;
  description: string;
  halqa: string;
  days: string[];
  holidays: string[];
  startDate: string;
  rangeStart: RangePoint;
  rangeEnd: RangePoint;
  endType: 'activeDays' | 'date';
  activeDaysCount: string;
  endDate: string;
};

const EMPTY: FormFields = {
  name: '', type: 'حفظ', description: '', halqa: '',
  days: [], holidays: [], startDate: todayISO(),
  rangeStart: { surahNumber: 1, ayah: 1 }, rangeEnd: { surahNumber: 1, ayah: 1 },
  endType: 'activeDays', activeDaysCount: '', endDate: '',
};

export default function TeacherPlanForm() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; id?: string; halqaId?: string }>();
  const isEdit = params.mode === 'edit' && !!params.id;
  const profileId = usePortalStore((s) => s.authUser?.profileId);

  const { data: existingPlan } = useQuranPlan(isEdit ? params.id : undefined);
  const { data: halqat = [] } = useHalqat({ teacher: profileId });

  const createPlan = useCreateQuranPlan();
  const updatePlan = useUpdateQuranPlan();

  const [form, setForm] = useState<FormFields>(() => ({
    ...EMPTY,
    halqa: params.halqaId ?? '',
  }));
  const [formError, setFormError] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  // A plan created before the mobile "halqa-only" picker (or one linked to a
  // specialTrack via the track-detail "link plan" action) may have a non-halqa
  // target — this form doesn't offer changing that, matches the web form's
  // "targetType editing not offered here" convention.
  const [lockedTarget, setLockedTarget] = useState<{ targetType: string; label: string } | null>(null);

  useEffect(() => {
    if (isEdit && existingPlan && !prefilled) {
      setForm({
        name: existingPlan.name,
        type: existingPlan.type,
        description: existingPlan.description ?? '',
        halqa: existingPlan.targetType === 'halqa'
          ? (typeof existingPlan.halqa === 'object' ? existingPlan.halqa?._id ?? '' : existingPlan.halqa ?? '')
          : '',
        days: existingPlan.days,
        holidays: existingPlan.holidays ?? [],
        startDate: existingPlan.startDate ? existingPlan.startDate.split('T')[0] : todayISO(),
        rangeStart: existingPlan.rangeStart,
        rangeEnd: existingPlan.rangeEnd,
        endType: existingPlan.endType,
        activeDaysCount: existingPlan.activeDaysCount ? String(existingPlan.activeDaysCount) : '',
        endDate: existingPlan.endDate ? existingPlan.endDate.split('T')[0] : '',
      });
      if (existingPlan.targetType !== 'halqa') {
        const label = existingPlan.targetType === 'specialTrack'
          ? `مسار: ${typeof existingPlan.specialTrack === 'object' ? existingPlan.specialTrack?.title ?? '' : ''}`
          : `${existingPlan.students?.length ?? 0} طالب محدد`;
        setLockedTarget({ targetType: existingPlan.targetType, label });
      }
      setPrefilled(true);
    }
  }, [isEdit, existingPlan, prefilled]);

  function sf<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /** Adds a holiday date, keeping the list deduped and chronological. */
  function addHoliday(date: string) {
    if (!date) return;
    setForm((f) => (f.holidays.includes(date) ? f : { ...f, holidays: [...f.holidays, date].sort() }));
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  const rangeIsReversed = useMemo(() => isReversedRange(form.rangeStart, form.rangeEnd), [form.rangeStart, form.rangeEnd]);

  const schedulePreview = useMemo(() => {
    if (form.days.length === 0) return [];
    if (form.endType === 'activeDays' && !form.activeDaysCount) return [];
    if (form.endType === 'date' && !form.endDate) return [];
    if (!form.startDate) return [];
    try {
      return computeScheduleBreakdown({
        days: form.days,
        holidays: form.holidays,
        startDate: new Date(`${form.startDate}T00:00:00`),
        endType: form.endType,
        activeDaysCount: form.endType === 'activeDays' ? Number(form.activeDaysCount) : undefined,
        endDate: form.endType === 'date' ? new Date(`${form.endDate}T00:00:00`) : undefined,
        rangeStart: form.rangeStart,
        rangeEnd: form.rangeEnd,
      });
    } catch {
      return [];
    }
  }, [form.days, form.holidays, form.startDate, form.endType, form.activeDaysCount, form.endDate, form.rangeStart, form.rangeEnd]);

  const requestedOccurrences = form.endType === 'activeDays' ? Number(form.activeDaysCount || 0) : schedulePreview.length;
  const previewShortfall = requestedOccurrences > 0 && schedulePreview.length < requestedOccurrences;

  async function handleSubmit() {
    if (!form.name.trim()) return setFormError('اسم الخطة مطلوب');
    if (form.days.length === 0) return setFormError('يرجى اختيار يوم واحد على الأقل');
    if (!lockedTarget && !form.halqa) return setFormError('يرجى اختيار حلقة');
    if (!form.startDate) return setFormError('يرجى تحديد تاريخ البداية');
    if (form.endType === 'activeDays' && !form.activeDaysCount) return setFormError('يرجى تحديد عدد الأيام النشطة');
    if (form.endType === 'date' && !form.endDate) return setFormError('يرجى تحديد تاريخ الانتهاء');
    if (form.endType === 'date' && form.endDate < form.startDate) return setFormError('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      days: form.days,
      holidays: form.holidays,
      startDate: form.startDate,
      rangeStart: form.rangeStart,
      rangeEnd: form.rangeEnd,
      endType: form.endType,
      activeDaysCount: form.endType === 'activeDays' ? Number(form.activeDaysCount) : undefined,
      endDate: form.endType === 'date' ? form.endDate : undefined,
    };
    if (!lockedTarget) {
      body.targetType = 'halqa';
      body.halqa = form.halqa;
    }
    if (!isEdit) body.teacher = profileId;

    try {
      setFormError('');
      if (isEdit && params.id) await updatePlan.mutateAsync({ id: params.id, ...body });
      else await createPlan.mutateAsync(body);
      success();
      router.back();
    } catch (e) {
      error();
      setFormError((e as Error).message);
    }
  }

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <IconArrowRight size={22} color={theme.text} />
        </Pressable>
        <Text style={s.headerTitle}>{isEdit ? 'تعديل الخطة' : 'خطة حفظ جديدة'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!!formError && (
            <Alert variant="error">{formError}</Alert>
          )}

        <Card>
          <FormGroup label="اسم الخطة" required>
            <FormInput placeholder="مثال: حفظ جزء عم" value={form.name} onChangeText={(v) => sf('name', v)} />
          </FormGroup>

          <View style={{ height: 12 }} />
          <FormGroup label="نوع الخطة" required>
            <View style={s.chipRow}>
              {PLAN_TYPES.map((t) => (
                <Pressable haptic="select" key={t} style={[s.chip, form.type === t && s.chipActive]} onPress={() => sf('type', t)}>
                  <Text style={[s.chipText, form.type === t && s.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </FormGroup>

          <View style={{ height: 12 }} />
          <FormGroup label="الوصف">
            <FormTextarea placeholder="اختياري" value={form.description} onChangeText={(v) => sf('description', v)} rows={3} />
          </FormGroup>

          <View style={{ height: 12 }} />
          {lockedTarget ? (
            <FormGroup label="الفئة المستهدفة">
              <Text style={s.lockedText}>{lockedTarget.label} (لا يمكن تغييرها من هنا)</Text>
            </FormGroup>
          ) : (
            <FormGroup label="الحلقة" required>
              <FormSelect
                value={form.halqa}
                onChange={(v) => sf('halqa', v)}
                options={halqat.map((h) => ({ value: h._id, label: h.name }))}
                placeholder="اختر حلقة"
              />
            </FormGroup>
          )}
        </Card>

        <Card>
          <CardHeader title="الأيام" />
          <View style={s.chipRow}>
            {WEEK_DAYS.map((d) => (
              <Pressable haptic="select" key={d} style={[s.chip, form.days.includes(d) && s.chipActive]} onPress={() => toggleDay(d)}>
                <Text style={[s.chipText, form.days.includes(d) && s.chipTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>

          {/* Holidays — active days the plan pauses on (Eid, exams, travel). A
              holiday consumes no occurrence, so its portion moves to the next
              working day rather than being lost. */}
          <View style={{ height: 18 }} />
          <View style={s.holidayHead}>
            <IconCalendarOff size={15} color={theme.gold} />
            <Text style={s.holidayTitle}>أيام العطلات</Text>
            {form.holidays.length > 0 && (
              <View style={s.holidayCount}>
                <Text style={s.holidayCountText}>{form.holidays.length}</Text>
              </View>
            )}
          </View>
          <FormDatePicker
            value=""
            onChange={(v) => addHoliday(v)}
            minimumDate={form.startDate ? new Date(`${form.startDate}T00:00:00`) : undefined}
            maximumDate={form.endType === 'date' && form.endDate ? new Date(`${form.endDate}T00:00:00`) : undefined}
          />
          {form.holidays.length > 0 && (
            <View style={[s.chipRow, { marginTop: 12 }]}>
              {form.holidays.map((h) => {
                // WEEK_DAYS runs Sat..Fri while getDay() runs Sun..Sat, hence the +1 shift.
                const weekday = WEEK_DAYS[(new Date(`${h}T00:00:00`).getDay() + 1) % 7];
                const active = form.days.includes(weekday);
                return (
                  <Pressable
                    key={h}
                    style={[s.holidayChip, active && s.holidayChipActive]}
                    onPress={() => sf('holidays', form.holidays.filter((d) => d !== h))}
                    accessibilityLabel={`حذف عطلة ${h}`}
                  >
                    <IconCalendarOff size={13} color={active ? theme.brown : theme.textMuted} />
                    <Text style={[s.holidayChipText, active && s.holidayChipTextActive]}>{fmtDate(h)}</Text>
                    <View style={s.holidayChipX}>
                      <IconX size={11} color={active ? theme.brown : theme.textMuted} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Text style={s.holidayHint}>
            لا يُحتسب يوم العطلة ضمن أيام الخطة حتى لو وافق يومًا نشطًا — ينتقل نصيبه إلى يوم العمل التالي.{'\n'}
            العطلة التي لا توافق يومًا من أيام الخطة تظهر بلون باهت لأنه لا أثر لها.
          </Text>
        </Card>

        <Card>
          <CardHeader title="نطاق الحفظ" />
          <FormGroup label="من">
            <SurahAyahPicker value={form.rangeStart} onChange={(v) => sf('rangeStart', v)} />
          </FormGroup>
          <View style={{ height: 12 }} />
          <FormGroup label="إلى">
            <SurahAyahPicker value={form.rangeEnd} onChange={(v) => sf('rangeEnd', v)} />
          </FormGroup>
          {rangeIsReversed && (
            <Text style={s.reverseHint}>⟲ هذا النطاق بالعكس (من نهاية المصحف نحو البداية) — سيُعرض كل يوم بترتيبه الصحيح.</Text>
          )}
        </Card>

        <Card>
          <CardHeader title="مدة الخطة" />
          <FormGroup label="تاريخ البداية" required>
            <FormDatePicker value={form.startDate} onChange={(v) => sf('startDate', v)} />
          </FormGroup>

          <View style={{ height: 12 }} />
          <View style={s.rowGroup}>
            <Pressable haptic="select" style={[s.toggleBtn, form.endType === 'activeDays' && s.toggleBtnActive]} onPress={() => sf('endType', 'activeDays')}>
              <Text style={[s.toggleBtnText, form.endType === 'activeDays' && s.toggleBtnTextActive]}>عدد أيام نشطة</Text>
            </Pressable>
            <Pressable haptic="select" style={[s.toggleBtn, form.endType === 'date' && s.toggleBtnActive]} onPress={() => sf('endType', 'date')}>
              <Text style={[s.toggleBtnText, form.endType === 'date' && s.toggleBtnTextActive]}>تاريخ انتهاء محدد</Text>
            </Pressable>
          </View>

          <View style={{ height: 12 }} />
          {form.endType === 'activeDays' ? (
            <FormGroup label="عدد الأيام النشطة" required>
              <FormInput placeholder="مثال: 30" keyboardType="number-pad" value={form.activeDaysCount} onChangeText={(v) => sf('activeDaysCount', v)} />
            </FormGroup>
          ) : (
            <FormGroup label="تاريخ الانتهاء" required>
              <FormDatePicker value={form.endDate} onChange={(v) => sf('endDate', v)} minimumDate={form.startDate ? new Date(form.startDate) : undefined} />
            </FormGroup>
          )}
        </Card>

        {schedulePreview.length > 0 && (
          <Card>
            <CardHeader title="التقسيمة اليومية (معاينة)" />
            {previewShortfall && (
              <View style={{ paddingBottom: 8 }}>
                <Alert variant="warning">عدد الأيام المطلوب أكبر من عدد الصفحات المتاحة للتوزيع.</Alert>
              </View>
            )}
            <SheetTriggerRow
              label="عرض التقسيمة اليومية"
              value={`${schedulePreview.length} يوم`}
              icon={<IconCalendarEvent size={17} color={theme.green} />}
              onPress={() => setShowSchedule(true)}
            />
          </Card>
        )}

        <ScheduleSheet
          visible={showSchedule}
          onClose={() => setShowSchedule(false)}
          title="التقسيمة اليومية (معاينة)"
          items={scheduleItems(schedulePreview, rangeIsReversed)}
        />

        <Button
          label={isPending ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء الخطة'}
          onPress={handleSubmit}
          disabled={isPending}
          fullWidth
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    // No background and no divider: the header sits directly on the page surface
    // rather than reading as a separate white bar over it.
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    headerTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    page: { padding: theme.pagePadding, gap: 14 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    chipActive: { backgroundColor: theme.greenPale, borderColor: theme.green },
    chipText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    chipTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
    lockedText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
    holidayHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    holidayTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    holidayCount: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, backgroundColor: theme.goldPale },
    holidayCountText: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.brown },
    holidayChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 999, paddingStart: 12, paddingEnd: 5, paddingVertical: 5,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cream,
    },
    holidayChipActive: { backgroundColor: theme.goldPale, borderColor: 'rgba(201, 149, 42, 0.35)' },
    holidayChipText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    holidayChipTextActive: { color: theme.brown },
    holidayChipX: {
      width: 20, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.06)',
    },
    holidayHint: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 10, lineHeight: 18 },
    reverseHint: { fontSize: 11, color: theme.gold, fontFamily: theme.fontCairo, marginTop: 10 },
    rowGroup: { flexDirection: 'row', gap: 8 },
    toggleBtn: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: theme.greenPale, borderColor: theme.green },
    toggleBtnText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
    toggleBtnTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
  });
}
