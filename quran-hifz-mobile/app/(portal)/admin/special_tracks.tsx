import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ScrollView, View, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform, Modal, Linking,
} from 'react-native';
import {
  IconAlertCircle, IconBuildingArch, IconCalendar, IconCalendarEvent, IconCalendarOff,
  IconCalendarRepeat, IconChevronDown, IconChevronUp, IconClock, IconMapPin, IconPencil,
  IconTarget, IconTrash, IconUserCheck, IconUserMinus, IconUserOff, IconUsers, IconVideo, IconWifi,
} from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import FormDatePicker from '@/components/forms/FormDatePicker';
import {
  useSpecialTracks,
  useCreateTrack,
  useUpdateTrack,
  useDeleteTrack,
  useEnrollStudent,
  useUnenrollStudent,
  type SpecialTrack,
  type TrackTeacher,
  type EnrolledStudent,
} from '@/lib/queries/specialTracks';
import { useTeachers } from '@/lib/queries/teachers';
import { useStudents } from '@/lib/queries/students';
import { useMasajid } from '@/lib/queries/masajid';
import { useQuranPlans } from '@/lib/queries/quranPlan';
import { SURAHS } from '@/lib/data/surahs';
import { isReversedRange, orientSlice } from '@/lib/quranRange';
import { fmtDateShort } from '@/lib/date';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;
type Styles = ReturnType<typeof createS>;

function getTeacherId(v: TrackTeacher | string) {
  return typeof v === 'object' ? v._id : v;
}
function getTeacherName(v: TrackTeacher | string) {
  return typeof v === 'object' ? v.name : v;
}
function getEnrolledId(v: EnrolledStudent | string) {
  return typeof v === 'object' ? v._id : v;
}
function getEnrolledName(v: EnrolledStudent | string) {
  return typeof v === 'object' ? v.name : v;
}
function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? '';
}
/** First letter of the first two words — the same initials the web cards show. */
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
}

const STATUS_LABEL: Record<SpecialTrack['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<SpecialTrack['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

const TYPE_OPTS = ['مراجعة مكثّفة', 'تجويد', 'إجازة', 'ختمة مسرّعة', 'برنامج رمضاني', 'تحضير مسابقة', 'أخرى'];
const DAYS_OPTS = [
  'يومياً',
  'السبت والثلاثاء',
  'السبت والاثنين والأربعاء',
  'عطلة نهاية الأسبوع',
  'ثلاث مرات أسبوعياً',
  'مرتين أسبوعياً',
];
/** Sentinel for the "أخرى (أدخل يدوياً)" option, mirroring the web selects. */
const CUSTOM = '__custom__';

/** Rotating chip tones for teacher/student avatars — theme.tone so dark mode holds. */
function avatarTone(theme: AppTheme, i: number) {
  const order = ['green', 'gold', 'blue', 'red'] as const;
  return theme.tone[order[i % order.length]];
}

/** Capacity ink: red once nearly full, amber when filling, green otherwise. */
function capacityColor(theme: AppTheme, pct: number) {
  if (pct >= 90) return theme.red;
  if (pct >= 70) return theme.amber;
  return theme.mode === 'dark' ? theme.greenLight : theme.green;
}

type FormFields = {
  title: string;
  type: string;
  timeSlot: string;
  location: string;
  isOnline: boolean;
  meetLink: string;
  teachers: string[];
  maxStudents: string;
  startDate: string;
  endDate: string;
  daysPerWeek: string;
  status: SpecialTrack['status'];
  notes: string;
};
const EMPTY: FormFields = {
  title: '', type: '', timeSlot: '', location: '', isOnline: false, meetLink: '',
  teachers: [], maxStudents: '30', startDate: '', endDate: '', daysPerWeek: '',
  status: 'upcoming', notes: '',
};

export default function AdminSpecialTracks() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const { data: tracks = [], isLoading, isRefetching, refetch } = useSpecialTracks();
  const { data: teachers = [], isRefetching: teachersRefetching, refetch: refetchTeachers } = useTeachers();
  const { data: allStudents = [], isRefetching: studentsRefetching, refetch: refetchStudents } = useStudents();
  const { data: masajid = [] } = useMasajid();

  const refreshing = isRefetching || teachersRefetching || studentsRefetching;
  const onRefresh = () => {
    refetch();
    refetchTeachers();
    refetchStudents();
  };

  const createTrack = useCreateTrack();
  const updateTrack = useUpdateTrack();
  const deleteTrack = useDeleteTrack();
  const enrollStudent = useEnrollStudent();
  const unenrollStudent = useUnenrollStudent();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormFields>(EMPTY);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [studentsPanelId, setStudentsPanelId] = useState<string | null>(null);
  const [addStudentId, setAddStudentId] = useState('');
  const [studentsSearch, setStudentsSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Free-text fallbacks: the pickers list masajid / preset day patterns, and
  // either can drop to a manual entry the way the web selects do.
  const [customLocation, setCustomLocation] = useState(false);
  const [customDays, setCustomDays] = useState(false);

  function sf<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleTeacher(id: string) {
    setForm((f) => ({
      ...f,
      teachers: f.teachers.includes(id) ? f.teachers.filter((x) => x !== id) : [...f.teachers, id],
    }));
  }

  function openAdd() {
    setForm(EMPTY);
    setFormError('');
    setEditId(null);
    setCustomLocation(false);
    setCustomDays(false);
    setShowForm(true);
  }

  function openEdit(t: SpecialTrack) {
    const d = (v: string) => (v ? new Date(v).toISOString().split('T')[0] : '');
    setForm({
      title: t.title,
      type: t.type,
      timeSlot: t.timeSlot,
      location: t.location,
      isOnline: t.isOnline,
      meetLink: t.meetLink ?? '',
      teachers: t.teachers.map(getTeacherId),
      maxStudents: String(t.maxStudents),
      startDate: d(t.startDate),
      endDate: d(t.endDate),
      daysPerWeek: t.daysPerWeek,
      status: t.status,
      notes: t.notes ?? '',
    });
    setCustomLocation(!!t.location && !masajid.some((m) => m.name === t.location));
    setCustomDays(!!t.daysPerWeek && !DAYS_OPTS.includes(t.daysPerWeek));
    setFormError('');
    setEditId(t._id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setFormError('اسم المسار مطلوب'); return; }
    if (!form.type.trim()) { setFormError('نوع المسار مطلوب'); return; }
    if (form.teachers.length === 0) { setFormError('يرجى اختيار معلم واحد على الأقل'); return; }
    if (!form.timeSlot.trim()) { setFormError('وقت الجلسة مطلوب'); return; }
    if (!form.daysPerWeek.trim()) { setFormError('الأيام مطلوبة'); return; }
    if (!form.startDate || !form.endDate) { setFormError('التواريخ مطلوبة'); return; }
    if (form.isOnline && !form.meetLink.trim()) { setFormError('رابط الجلسة مطلوب'); return; }
    if (!form.isOnline && !form.location.trim()) { setFormError('الموقع مطلوب'); return; }

    const body = {
      title: form.title.trim(),
      type: form.type.trim(),
      status: form.status,
      timeSlot: form.timeSlot.trim(),
      location: form.isOnline ? 'عبر الإنترنت' : form.location.trim(),
      isOnline: form.isOnline,
      meetLink: form.isOnline ? form.meetLink.trim() : '',
      teachers: form.teachers,
      maxStudents: Number(form.maxStudents) || 30,
      startDate: form.startDate,
      endDate: form.endDate,
      daysPerWeek: form.daysPerWeek.trim(),
      notes: form.notes.trim(),
    };

    try {
      setFormError('');
      if (editId) await updateTrack.mutateAsync({ id: editId, ...body });
      else await createTrack.mutateAsync(body);
      setShowForm(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  const isPending = createTrack.isPending || updateTrack.isPending;

  // Same three buckets the web page renders, in the same order.
  const active = tracks.filter((t) => t.status === 'active');
  const upcoming = tracks.filter((t) => t.status === 'upcoming');
  const ended = tracks.filter((t) => t.status === 'ended');

  function renderStudentsPanel(t: SpecialTrack) {
    if (studentsPanelId !== t._id) return null;

    const enrolledCnt = t.enrolledStudents.length;
    const capPct = Math.min(100, Math.round((enrolledCnt / t.maxStudents) * 100));
    const barClr = capacityColor(theme, capPct);
    const isFull = enrolledCnt >= t.maxStudents;
    const enrolledIds = new Set(t.enrolledStudents.map(getEnrolledId));
    const q = studentsSearch.trim();
    const available = allStudents.filter((st) => !enrolledIds.has(st._id));
    const shown = t.enrolledStudents.filter((st) => !q || getEnrolledName(st).includes(q));

    return (
      <View style={s.studentsPanel}>
        <Text style={s.panelTitle}>إدارة طلاب المسار</Text>

        <View style={s.capacityBox}>
          <View style={s.capacityHead}>
            <View style={s.iconLabel}>
              <IconUserCheck size={14} color={theme.textMuted} />
              <Text style={s.capacityLabel}>طاقة المسار</Text>
            </View>
            <Text style={[s.capacityValue, { color: barClr }]}>{enrolledCnt} / {t.maxStudents}</Text>
          </View>
          <View style={s.capacityTrack}>
            <View style={[s.capacityFill, { width: `${capPct}%`, backgroundColor: barClr }]} />
          </View>
          {isFull && (
            <View style={[s.iconLabel, { marginTop: 8 }]}>
              <IconAlertCircle size={13} color={theme.red} />
              <Text style={s.fullWarning}>وصل المسار للحد الأقصى</Text>
            </View>
          )}
        </View>

        {!isFull && (
          <View style={s.addStudentBox}>
            <Text style={s.addStudentLabel}>إضافة طالب</Text>
            <View style={s.row}>
              <View style={s.flex1}>
                <FormSelect
                  value={addStudentId}
                  onChange={setAddStudentId}
                  options={available.map((st) => ({ value: st._id, label: st.name }))}
                  placeholder="اختر طالباً"
                />
              </View>
              <Button
                label="إضافة"
                onPress={() => {
                  if (!addStudentId) return;
                  enrollStudent.mutate({ id: t._id, studentId: addStudentId });
                  setAddStudentId('');
                }}
                disabled={!addStudentId || enrollStudent.isPending}
              />
            </View>
          </View>
        )}

        <View style={s.enrolledHead}>
          <Text style={s.enrolledTitle}>الطلاب المسجّلون</Text>
          {enrolledCnt > 0 && (
            <View style={s.searchBox}>
              <FormInput placeholder="بحث..." value={studentsSearch} onChangeText={setStudentsSearch} />
            </View>
          )}
        </View>

        {enrolledCnt === 0 ? (
          <View style={s.emptyBox}>
            <IconUserOff size={26} color={theme.textMuted} />
            <Text style={s.muted}>لا يوجد طلاب مسجّلون بعد</Text>
          </View>
        ) : (
          shown.map((st, idx) => {
            const tone = avatarTone(theme, idx);
            const name = getEnrolledName(st);
            return (
              <View key={getEnrolledId(st)} style={s.studentRow}>
                <View style={s.studentIdentity}>
                  <View style={[s.avatar, { backgroundColor: tone.bg }]}>
                    <Text style={[s.avatarText, { color: tone.text }]}>{avatarInitials(name)}</Text>
                  </View>
                  <View style={s.flex1}>
                    <Text style={s.studentName} numberOfLines={1}>{name}</Text>
                    <Text style={s.studentIndex}>#{idx + 1}</Text>
                  </View>
                </View>
                <Pressable
                  haptic="medium"
                  style={s.iconBtnDanger}
                  onPress={() => unenrollStudent.mutate({ id: t._id, studentId: getEnrolledId(st) })}
                  disabled={unenrollStudent.isPending}
                >
                  <IconUserMinus size={16} color={theme.red} />
                </Pressable>
              </View>
            );
          })
        )}

        <Pressable onPress={() => { setStudentsPanelId(null); setStudentsSearch(''); }}>
          <Text style={s.closeText}>إغلاق</Text>
        </Pressable>
      </View>
    );
  }

  function renderSection(label: string, color: string, list: SpecialTrack[], dimmed?: boolean) {
    if (list.length === 0) return null;
    return (
      <View style={s.section}>
        <View style={s.sectionHead}>
          <View style={[s.sectionBar, { backgroundColor: color }]} />
          <Text style={s.sectionLabel}>{label}</Text>
          <View style={[s.sectionCount, { backgroundColor: theme.cardAlt }]}>
            <Text style={[s.sectionCountText, { color }]}>{list.length}</Text>
          </View>
        </View>
        <View style={[s.sectionList, dimmed && s.dimmed]}>
          {list.map((t) => (
            <TrackCard
              key={t._id}
              t={t}
              theme={theme}
              s={s}
              onOpen={() => router.push({ pathname: '/(portal)/admin/track-detail', params: { id: t._id } } as any)}
              onManageStudents={() => {
                setStudentsPanelId((cur) => (cur === t._id ? null : t._id));
                setAddStudentId('');
                setStudentsSearch('');
              }}
              onEdit={() => openEdit(t)}
              onDelete={() => setDeleteId(t._id)}
            >
              {renderStudentsPanel(t)}
            </TrackCard>
          ))}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />}
      >
        {saved && <Text style={s.successBanner}>تم حفظ المسار ✓</Text>}

        <Pressable style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+ مسار جديد</Text>
        </Pressable>

        {showForm && (
          <Card>
            <CardHeader title={editId ? 'تعديل المسار' : 'إضافة مسار جديد'} />
            {!!formError && <Text style={s.errorText}>{formError}</Text>}

            <Text style={s.label}>اسم المسار</Text>
            <FormInput placeholder="مثال: حلقات الصيف" value={form.title} onChangeText={(v) => sf('title', v)} />

            <Text style={s.label}>النوع</Text>
            <FormSelect
              value={form.type}
              onChange={(v) => sf('type', v)}
              options={TYPE_OPTS.map((o) => ({ value: o, label: o }))}
              placeholder="اختر النوع"
            />

            <Text style={s.label}>الحالة</Text>
            <FormSelect
              value={form.status}
              onChange={(v) => sf('status', v as SpecialTrack['status'])}
              options={[
                { value: 'upcoming', label: 'قادم' },
                { value: 'active', label: 'نشط' },
                { value: 'ended', label: 'منتهي' },
              ]}
            />

            <Text style={s.label}>المعلمون المسؤولون</Text>
            <View style={s.teacherList}>
              {teachers.length === 0 && <Text style={s.muted}>لا يوجد معلمون مسجّلون</Text>}
              {teachers.map((t) => {
                const selected = form.teachers.includes(t._id);
                return (
                  <Pressable haptic="select" key={t._id} style={[s.teacherChip, selected && s.teacherChipActive]} onPress={() => toggleTeacher(t._id)}>
                    <Text style={[s.teacherChipText, selected && s.teacherChipTextActive]}>{t.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.rowGroup}>
              <Pressable
                haptic="select"
                style={[s.onlineToggle, !form.isOnline && s.onlineToggleActive]}
                onPress={() => sf('isOnline', false)}
              >
                <Text style={[s.onlineToggleText, !form.isOnline && s.onlineToggleTextActive]}>حضوري</Text>
              </Pressable>
              <Pressable
                haptic="select"
                style={[s.onlineToggle, form.isOnline && s.onlineToggleActive]}
                onPress={() => sf('isOnline', true)}
              >
                <Text style={[s.onlineToggleText, form.isOnline && s.onlineToggleTextActive]}>أونلاين</Text>
              </Pressable>
            </View>

            {form.isOnline ? (
              <>
                <Text style={s.label}>رابط الجلسة</Text>
                <FormInput placeholder="https://meet.google.com/xxx" value={form.meetLink} onChangeText={(v) => sf('meetLink', v)} />
              </>
            ) : (
              <>
                <Text style={s.label}>الموقع</Text>
                <FormSelect
                  value={customLocation ? CUSTOM : form.location}
                  onChange={(v) => {
                    if (v === CUSTOM) { setCustomLocation(true); sf('location', ''); }
                    else { setCustomLocation(false); sf('location', v); }
                  }}
                  options={[
                    ...masajid.map((m) => ({ value: m.name, label: m.name })),
                    { value: CUSTOM, label: 'موقع آخر (أدخل يدوياً)' },
                  ]}
                  placeholder="اختر المسجد"
                />
                {customLocation && (
                  <View style={{ marginTop: 6 }}>
                    <FormInput placeholder="اسم المسجد أو القاعة" value={form.location} onChangeText={(v) => sf('location', v)} />
                  </View>
                )}
              </>
            )}

            <Text style={s.label}>الوقت</Text>
            <FormInput placeholder="بعد الفجر | ٦:١٠ – ٧:٣٠" value={form.timeSlot} onChangeText={(v) => sf('timeSlot', v)} />

            <Text style={s.label}>الأيام</Text>
            <FormSelect
              value={customDays ? CUSTOM : form.daysPerWeek}
              onChange={(v) => {
                if (v === CUSTOM) { setCustomDays(true); sf('daysPerWeek', ''); }
                else { setCustomDays(false); sf('daysPerWeek', v); }
              }}
              options={[
                ...DAYS_OPTS.map((o) => ({ value: o, label: o })),
                { value: CUSTOM, label: 'أخرى (أدخل يدوياً)' },
              ]}
              placeholder="اختر الأيام"
            />
            {customDays && (
              <View style={{ marginTop: 6 }}>
                <FormInput placeholder="مثال: السبت والثلاثاء والخميس" value={form.daysPerWeek} onChangeText={(v) => sf('daysPerWeek', v)} />
              </View>
            )}

            <Text style={s.label}>تاريخ البداية</Text>
            <FormDatePicker value={form.startDate} onChange={(v) => sf('startDate', v)} />

            <Text style={s.label}>تاريخ النهاية</Text>
            <FormDatePicker value={form.endDate} onChange={(v) => sf('endDate', v)} minimumDate={form.startDate ? new Date(form.startDate) : undefined} />

            <Text style={s.label}>الحد الأقصى للطلاب</Text>
            <FormInput placeholder="30" keyboardType="number-pad" value={form.maxStudents} onChangeText={(v) => sf('maxStudents', v)} />

            <Text style={s.label}>ملاحظات</Text>
            <FormInput placeholder="أي معلومات إضافية..." value={form.notes} onChangeText={(v) => sf('notes', v)} />

            <View style={s.row}>
              <Button label={isPending ? 'جارٍ الحفظ...' : 'حفظ'} onPress={handleSubmit} disabled={isPending} style={s.flex1} />
              <Button label="إلغاء" variant="ghost" onPress={() => setShowForm(false)} style={s.flex1} />
            </View>
          </Card>
        )}

        {isLoading && <SkeletonRows count={4} />}

        {!isLoading && tracks.length === 0 && (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <IconCalendarEvent size={30} color={theme.mode === 'dark' ? theme.greenLight : theme.green} />
            </View>
            <Text style={s.emptyTitle}>لا توجد مسارات بعد</Text>
            <Text style={s.emptySub}>أضف أول مسار</Text>
            <Button label="+ مسار جديد" onPress={openAdd} />
          </View>
        )}

        {!isLoading && renderSection('المسارات النشطة', theme.mode === 'dark' ? theme.greenLight : theme.green, active)}
        {!isLoading && renderSection('المسارات القادمة', theme.amber, upcoming)}
        {!isLoading && renderSection('المسارات المنتهية', theme.textMuted, ended, true)}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!deleteId} transparent animationType="fade" onRequestClose={() => setDeleteId(null)}>
        <Pressable haptic="none" style={s.overlay} onPress={() => setDeleteId(null)}>
          <Pressable haptic="none" style={s.dialog} onPress={() => {}}>
            <View style={s.dialogIcon}>
              <IconTrash size={26} color={theme.red} />
            </View>
            <Text style={s.dialogTitle}>حذف المسار</Text>
            <Text style={s.dialogBody}>سيُحذف المسار نهائياً ولا يمكن التراجع.</Text>
            <View style={s.dialogActions}>
              <View style={s.flex1}>
                <Button
                  label={deleteTrack.isPending ? 'جارٍ الحذف...' : 'حذف'}
                  variant="danger"
                  fullWidth
                  onPress={async () => {
                    if (!deleteId) return;
                    await deleteTrack.mutateAsync(deleteId);
                    setDeleteId(null);
                  }}
                  disabled={deleteTrack.isPending}
                />
              </View>
              <View style={s.flex1}>
                <Button label="إلغاء" variant="ghost" fullWidth onPress={() => setDeleteId(null)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ── Track card ──────────────────────────────────────────────
 * Its own component so each card can run the `useQuranPlans` lookup for the
 * plan linked to that track — the same per-card query the web page makes.  */
function TrackCard({
  t, theme, s, onOpen, onManageStudents, onEdit, onDelete, children,
}: {
  t: SpecialTrack;
  theme: AppTheme;
  s: Styles;
  onOpen: () => void;
  onManageStudents: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const { data: linkedPlans = [] } = useQuranPlans({ specialTrack: t._id });
  // A plan keeps its `specialTrack` ref after its targetType is switched to
  // "students", so this filter can return several plans for one track. Prefer
  // the one actually targeting the whole track, or this card's "مقرَّر اليوم"
  // disagrees with the track-detail screen for the same track.
  const linkedPlan = linkedPlans.find((p) => p.targetType === 'specialTrack') ?? linkedPlans[0];

  const enrolled = t.enrolledStudents.length;
  const pct = Math.min(100, Math.round((enrolled / t.maxStudents) * 100));
  const barClr = capacityColor(theme, pct);
  const statusTone = theme.tone[STATUS_VARIANT[t.status]];
  const stripColor = t.status === 'active'
    ? (theme.mode === 'dark' ? theme.greenLight : theme.green)
    : t.status === 'upcoming' ? theme.amber : theme.border;

  const todayText = (() => {
    if (!linkedPlan?.todayAssignment) return 'لا يوجد جزء مخصص لليوم';
    const a = orientSlice(linkedPlan.todayAssignment, isReversedRange(linkedPlan.rangeStart, linkedPlan.rangeEnd));
    const pages = a.pageEnd !== a.pageStart ? `${a.pageStart} - ${a.pageEnd}` : `${a.pageStart}`;
    return `مقرَّر اليوم: ${surahName(a.surahStart)} : ${a.ayahStart} — ${surahName(a.surahEnd)} : ${a.ayahEnd} (صفحة ${pages})`;
  })();

  return (
    <Card noPadding>
      <View style={[s.strip, { backgroundColor: stripColor }]} />
      <View style={s.cardBody}>
      {/* Tapping the card opens the track detail — the students panel sits
          OUTSIDE this Pressable so a stray tap in it doesn't navigate away. */}
      <Pressable haptic="none" style={s.cardMain} onPress={onOpen}>
        {/* chips */}
        <View style={s.chipsRow}>
          <Badge label={STATUS_LABEL[t.status]} variant={STATUS_VARIANT[t.status]} />
          <View style={[s.chip, { backgroundColor: statusTone.bg }]}>
            <Text style={[s.chipText, { color: statusTone.text }]} numberOfLines={1}>{t.type}</Text>
          </View>
          <View style={[s.chip, s.chipIcon, { backgroundColor: t.isOnline ? theme.tone.blue.bg : theme.cardAlt }]}>
            {t.isOnline
              ? <IconWifi size={12} color={theme.tone.blue.text} />
              : <IconBuildingArch size={12} color={theme.textMuted} />}
            <Text style={[s.chipText, { color: t.isOnline ? theme.tone.blue.text : theme.textMuted }]}>
              {t.isOnline ? 'أونلاين' : 'حضوري'}
            </Text>
          </View>
        </View>

        <Text style={s.trackTitle}>{t.title}</Text>

        {/* info grid — two columns that collapse to one on a narrow screen */}
        <View style={s.infoGrid}>
          <InfoItem s={s} icon={<IconClock size={15} color={theme.green} />} label="الوقت" val={t.timeSlot} />
          <InfoItem s={s} icon={<IconCalendarRepeat size={15} color={theme.green} />} label="الأيام" val={t.daysPerWeek} />
          <InfoItem s={s} icon={<IconCalendar size={15} color={theme.green} />} label="البداية" val={fmtDateShort(t.startDate)} />
          <InfoItem s={s} icon={<IconCalendarOff size={15} color={theme.green} />} label="النهاية" val={fmtDateShort(t.endDate)} />
          <InfoItem
            s={s}
            icon={t.isOnline ? <IconVideo size={15} color={theme.green} /> : <IconMapPin size={15} color={theme.green} />}
            label="المكان"
            val={t.isOnline ? 'أونلاين' : t.location}
            span
          />
        </View>

        {/* teachers */}
        <Text style={s.blockLabel}>المعلمون</Text>
        <View style={s.teacherAvatars}>
          {t.teachers.length === 0 && <Text style={s.mutedInline}>— لا يوجد معلم —</Text>}
          {t.teachers.map((tc, i) => {
            const tone = avatarTone(theme, i);
            const name = getTeacherName(tc);
            return (
              <View key={getTeacherId(tc)} style={[s.teacherAvatarChip, { backgroundColor: tone.bg }]}>
                <View style={[s.avatarSm, { backgroundColor: tone.text }]}>
                  <Text style={[s.avatarSmText, { color: tone.bg }]}>{avatarInitials(name)}</Text>
                </View>
                <Text style={[s.teacherAvatarText, { color: tone.text }]} numberOfLines={1}>{name}</Text>
              </View>
            );
          })}
        </View>

        {/* capacity */}
        <View style={s.capacityBox}>
          <View style={s.capacityHead}>
            <View style={s.iconLabel}>
              <IconUserCheck size={14} color={theme.textMuted} />
              <Text style={s.capacityLabel}>الطاقة الاستيعابية</Text>
            </View>
            <Text style={[s.capacityValue, { color: barClr }]}>{enrolled} / {t.maxStudents}</Text>
          </View>
          <View style={s.capacityTrack}>
            <View style={[s.capacityFill, { width: `${pct}%`, backgroundColor: barClr }]} />
          </View>
        </View>

        {/* linked Quran plan */}
        <View style={[s.planBox, linkedPlan?.todayAssignment && { backgroundColor: theme.greenPale }]}>
          <Pressable
            haptic="select"
            disabled={!linkedPlan}
            onPress={() => setPlanOpen((o) => !o)}
            style={s.planHead}
          >
            <View style={s.iconLabel}>
              <IconTarget size={14} color={linkedPlan?.todayAssignment ? theme.green : theme.textMuted} />
              <Text style={[s.planTitle, linkedPlan?.todayAssignment && { color: theme.green }]}>الخطة القرآنية</Text>
              {linkedPlan?.progress && (
                <View style={s.planPct}>
                  <Text style={s.planPctText}>{linkedPlan.progress.percent}%</Text>
                </View>
              )}
            </View>
            {linkedPlan && (planOpen
              ? <IconChevronUp size={14} color={theme.textMuted} />
              : <IconChevronDown size={14} color={theme.textMuted} />)}
          </Pressable>

          {!linkedPlan && <Text style={s.planEmpty}>لا توجد خطة حفظ مرتبطة بهذا المسار</Text>}

          {linkedPlan && planOpen && (
            <View style={s.planDetail}>
              <Text style={s.planName}>{linkedPlan.name}</Text>
              {linkedPlan.progress && (
                <>
                  <View style={s.planTrack}>
                    <View style={[s.planFill, { width: `${linkedPlan.progress.percent}%` }]} />
                  </View>
                  <Text style={s.planMeta}>
                    {linkedPlan.juzProgress ? `${linkedPlan.juzProgress.completed} / ${linkedPlan.juzProgress.total} جزء · ` : ''}
                    {linkedPlan.progress.completed} / {linkedPlan.progress.total} يوم
                  </Text>
                </>
              )}
              <Text style={s.planToday}>{todayText}</Text>
            </View>
          )}
        </View>

        {t.isOnline && !!t.meetLink && (
          <Pressable style={s.joinBtn} onPress={() => Linking.openURL(t.meetLink!)}>
            <IconVideo size={14} color={theme.tone.blue.text} />
            <Text style={s.joinText}>انضم للجلسة</Text>
          </Pressable>
        )}

        {/* actions */}
        <View style={s.actionsRow}>
          <Pressable style={s.actionBtn} onPress={onManageStudents}>
            <IconUsers size={15} color={theme.green} />
            <Text style={s.actionText}>الطلاب</Text>
            {enrolled > 0 && (
              <View style={s.countPill}><Text style={s.countPillText}>{enrolled}</Text></View>
            )}
          </Pressable>
          <Pressable style={s.actionBtn} onPress={onEdit}>
            <IconPencil size={15} color={theme.textMuted} />
            <Text style={[s.actionText, { color: theme.textMuted }]}>تعديل</Text>
          </Pressable>
          <Pressable haptic="medium" style={[s.actionBtn, s.actionBtnDanger]} onPress={onDelete}>
            <IconTrash size={15} color={theme.red} />
            <Text style={[s.actionText, { color: theme.red }]}>حذف</Text>
          </Pressable>
        </View>

      </Pressable>
      {children}
      </View>
    </Card>
  );
}

function InfoItem({ s, icon, label, val, span }: { s: Styles; icon: React.ReactNode; label: string; val: string; span?: boolean }) {
  return (
    <View style={[s.infoItem, span && s.infoItemSpan]}>
      {icon}
      <View style={s.flex1}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={2}>{val || '—'}</Text>
      </View>
    </View>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 16, gap: 14 },
    successBanner: { backgroundColor: theme.tone.green.bg, color: theme.tone.green.text, fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
    errorText: { color: theme.red, fontFamily: theme.fontCairo, fontSize: 12, marginBottom: 8 },
    addBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, padding: 12, alignItems: 'center' },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
    label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
    mutedInline: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
    row: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' },
    rowGroup: { flexDirection: 'row', gap: 8, marginTop: 12 },
    flex1: { flex: 1 },

    onlineToggle: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    onlineToggleActive: { backgroundColor: theme.tone.green.bg, borderColor: theme.tone.green.border },
    onlineToggleText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
    onlineToggleTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
    teacherList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    teacherChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    teacherChipActive: { backgroundColor: theme.tone.green.bg, borderColor: theme.tone.green.border },
    teacherChipText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    teacherChipTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },

    // ── sections ──
    section: { gap: 12 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionBar: { width: 4, height: 18, borderRadius: 2 },
    sectionLabel: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    sectionCount: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    sectionCountText: { fontSize: 11, fontFamily: theme.fontCairoBold },
    sectionList: { gap: 14 },
    dimmed: { opacity: 0.75 },

    // ── empty state ──
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: { width: 72, height: 72, borderRadius: 18, backgroundColor: theme.greenPale, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    emptySub: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, marginBottom: 10 },

    // ── track card ──
    strip: { height: 4, borderTopLeftRadius: theme.radius, borderTopRightRadius: theme.radius },
    cardBody: { padding: 16, gap: 10 },
    cardMain: { gap: 10 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    chip: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3, flexShrink: 1, maxWidth: '100%' },
    chipIcon: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    chipText: { fontSize: 11, fontFamily: theme.fontCairoBold },
    trackTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },

    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexBasis: '46%', flexGrow: 1 },
    infoItemSpan: { flexBasis: '100%' },
    infoLabel: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    infoValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 1 },

    blockLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    teacherAvatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    teacherAvatarChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, maxWidth: '100%', flexShrink: 1 },
    avatarSm: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    avatarSmText: { fontSize: 9, fontFamily: theme.fontCairoBold },
    teacherAvatarText: { fontSize: 12, fontFamily: theme.fontCairoBold, flexShrink: 1 },

    capacityBox: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 12, gap: 6 },
    capacityHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    capacityLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    capacityValue: { fontSize: 11, fontFamily: theme.fontCairoBold },
    capacityTrack: { height: 6, backgroundColor: theme.border, borderRadius: 999, overflow: 'hidden' },
    capacityFill: { height: '100%', borderRadius: 999 },
    fullWarning: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.red },

    planBox: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 12 },
    planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    planTitle: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    planPct: { backgroundColor: theme.greenAccent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
    planPctText: { fontSize: 10, fontFamily: theme.fontCairoBold, color: theme.white },
    planEmpty: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 6 },
    planDetail: { marginTop: 8, gap: 4 },
    planName: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    planTrack: { height: 6, backgroundColor: theme.border, borderRadius: 999, overflow: 'hidden' },
    planFill: { height: '100%', borderRadius: 999, backgroundColor: theme.mode === 'dark' ? theme.greenLight : theme.green },
    planMeta: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    planToday: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.text },

    joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: theme.tone.blue.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    joinText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.tone.blue.text },

    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 9 },
    actionBtnDanger: { borderColor: theme.tone.red.border },
    actionText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
    countPill: { backgroundColor: theme.greenAccent, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
    countPillText: { fontSize: 10, fontFamily: theme.fontCairoBold, color: theme.white },

    // ── students panel ──
    studentsPanel: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, gap: 10 },
    panelTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    addStudentBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, borderRadius: 10, padding: 12 },
    addStudentLabel: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    enrolledHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    enrolledTitle: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    searchBox: { width: 150 },
    emptyBox: { alignItems: 'center', backgroundColor: theme.cardAlt, borderRadius: 10, paddingVertical: 16 },
    studentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: theme.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 9 },
    studentIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 11, fontFamily: theme.fontCairoBold },
    studentName: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    studentIndex: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    iconBtnDanger: { borderWidth: 1, borderColor: theme.tone.red.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6 },
    closeText: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', marginTop: 4 },

    // ── delete dialog ──
    overlay: { flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
    dialog: { width: '100%', maxWidth: 360, backgroundColor: theme.card, borderRadius: 16, padding: 24, alignItems: 'center' },
    dialogIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.tone.red.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    dialogTitle: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 8 },
    dialogBody: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center' },
    dialogActions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
  });
}
