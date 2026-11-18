import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { toast } from '@/components/ui/Toast';
import FormPage, { useFormPageStyles } from '@/components/ui/FormPage';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import TrackStudentsPanel from '@/components/domain/TrackStudentsPanel';
import { useTracks, useCreateTrack, useUpdateTrack, type Track, type TrackTeacher } from '@/lib/queries/tracks';
import { useTeachers } from '@/lib/queries/teachers';
import { useMasajid } from '@/lib/queries/masajid';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

function getTeacherId(v: TrackTeacher | string) {
  return typeof v === 'object' ? v._id : v;
}

type FormFields = {
  title: string; type: string; timeSlot: string; masjid: string;
  isOnline: boolean; meetLink: string; teachers: string[];
  maxStudents: string; status: Track['status']; notes: string;
};
const EMPTY: FormFields = {
  title: '', type: '', timeSlot: '', masjid: '', isOnline: false, meetLink: '',
  teachers: [], maxStudents: '30', status: 'upcoming', notes: '',
};
const TYPE_OPTS = ['حفظ', 'مراجعة', 'حفظ و مراجعة', 'ختمة', 'دورة مكثفة'];
const STATUS_OPTS: { value: Track['status']; label: string }[] = [
  { value: 'upcoming', label: 'قادم' },
  { value: 'active', label: 'نشط' },
  { value: 'ended', label: 'منتهي' },
];

function fieldsFromTrack(t: Track): FormFields {
  return {
    title: t.title, type: t.type, timeSlot: t.timeSlot,
    masjid: typeof t.masjid === 'object' ? t.masjid._id : t.masjid,
    isOnline: t.isOnline ?? false, meetLink: t.meetLink ?? '',
    teachers: t.teachers.map(getTeacherId),
    maxStudents: String(t.maxStudents), status: t.status, notes: t.notes ?? '',
  };
}

/** Full-page create/edit form, mirroring web AdminTrackForm: save keeps you on
 * the page (now in edit mode) so students can be added right away. */
export default function AdminTrackForm() {
  const theme = useAppTheme();
  const fs = useFormPageStyles();
  const s = useMemo(() => createS(theme), [theme]);
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: tracks = [] } = useTracks();
  const { data: teachers = [] } = useTeachers();
  const { data: masajid = [] } = useMasajid();
  const createTrack = useCreateTrack();
  const updateTrack = useUpdateTrack();

  const [recordId, setRecordId] = useState<string | undefined>(id);
  const trackRecord = recordId ? tracks.find((t) => t._id === recordId) : undefined;
  const [form, setForm] = useState<FormFields>(EMPTY);
  const [formError, setFormError] = useState('');

  // The list query may resolve after mount, hence an effect (same as masjid-form).
  const existing = id ? tracks.find((t) => t._id === id) : undefined;
  useEffect(() => {
    if (existing) setForm(fieldsFromTrack(existing));
  }, [existing?._id]);

  function sf<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }
  function toggleTeacher(tid: string) {
    setForm((p) => ({
      ...p,
      teachers: p.teachers.includes(tid) ? p.teachers.filter((x) => x !== tid) : [...p.teachers, tid],
    }));
  }

  async function handleSubmit() {
    const { title, type, timeSlot, isOnline, masjid, meetLink, teachers: tids, maxStudents } = form;
    if (!title.trim()) { setFormError('اسم المسار مطلوب'); return; }
    if (!type.trim()) { setFormError('نوع المسار مطلوب'); return; }
    if (tids.length === 0) { setFormError('يرجى اختيار معلم واحد على الأقل'); return; }
    if (!timeSlot.trim()) { setFormError('وقت الجلسة مطلوب'); return; }
    if (isOnline && !meetLink.trim()) { setFormError('رابط الجلسة مطلوب'); return; }
    if (!masjid) { setFormError('يرجى اختيار المسجد'); return; }

    setFormError('');
    const body = {
      title: title.trim(), type: type.trim(), status: form.status,
      timeSlot: timeSlot.trim(), masjid, isOnline,
      meetLink: isOnline ? meetLink.trim() : '',
      teachers: tids, maxStudents: Number(maxStudents) || 30,
      notes: form.notes.trim(),
    };
    try {
      const result = recordId
        ? await updateTrack.mutateAsync({ id: recordId, ...body })
        : await createTrack.mutateAsync(body);
      setRecordId(result.data._id);
      toast.success('تم حفظ المسار');
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  function chip(label: string, active: boolean, onPress: () => void) {
    return (
      <Pressable key={label} haptic="select" style={[s.chip, active && s.chipActive]} onPress={onPress}>
        <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <FormPage
      title={recordId ? 'تعديل المسار' : 'مسار جديد'}
      subtitle="أدخل بيانات المسار بالكامل"
      error={formError}
      submitLabel="حفظ المسار"
      pending={createTrack.isPending || updateTrack.isPending}
      onSubmit={handleSubmit}
    >
      <Text style={fs.sectionNote}>نوع الجلسة</Text>
      <View style={s.toggleRow}>
        {([false, true] as const).map((online) => (
          <Pressable
            key={String(online)}
            haptic="select"
            style={[s.toggle, form.isOnline === online && s.chipActive]}
            onPress={() => sf('isOnline', online)}
          >
            <Text style={[s.chipText, form.isOnline === online && s.chipTextActive]}>{online ? 'أونلاين' : 'حضوري'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={fs.sectionNote}>المعلومات الأساسية</Text>
      <Text style={fs.label}>اسم المسار *</Text>
      <FormInput placeholder="مثال: دورة المراجعة الصيفية ١٤٤٧" value={form.title} onChangeText={(v) => sf('title', v)} />

      <Text style={fs.label}>النوع *</Text>
      <View style={s.chipRow}>
        {TYPE_OPTS.map((o) => chip(o, form.type === o, () => sf('type', o)))}
      </View>

      <Text style={fs.label}>الحالة</Text>
      <View style={s.chipRow}>
        {STATUS_OPTS.map((o) => chip(o.label, form.status === o.value, () => sf('status', o.value)))}
      </View>

      <Text style={fs.label}>المسجد *</Text>
      <FormSelect
        value={form.masjid}
        onChange={(v) => sf('masjid', v)}
        options={masajid.map((m) => ({ value: m._id, label: m.name }))}
        placeholder="— اختر مسجداً —"
        title="المسجد"
        searchable
      />

      <Text style={fs.label}>الحد الأقصى للطلاب</Text>
      <FormInput keyboardType="number-pad" value={form.maxStudents} onChangeText={(v) => sf('maxStudents', v)} />

      <Text style={fs.label}>ملاحظات</Text>
      <FormInput placeholder="أي معلومات إضافية..." value={form.notes} onChangeText={(v) => sf('notes', v)} />

      <Text style={fs.sectionNote}>المعلمون المسؤولون</Text>
      <View style={[s.chipRow, { marginTop: 8 }]}>
        {teachers.length === 0 && <Text style={fs.muted}>لا يوجد معلمون مسجّلون</Text>}
        {teachers.map((tc) => chip(tc.name, form.teachers.includes(tc._id), () => toggleTeacher(tc._id)))}
      </View>

      <Text style={fs.sectionNote}>الجدول</Text>
      <Text style={fs.label}>الوقت *</Text>
      <FormInput placeholder="بعد الفجر | ٦:١٠ – ٧:٣٠" value={form.timeSlot} onChangeText={(v) => sf('timeSlot', v)} />
      {form.isOnline && (
        <>
          <Text style={fs.label}>رابط الجلسة *</Text>
          <FormInput
            style={fs.ltr}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            value={form.meetLink}
            onChangeText={(v) => sf('meetLink', v)}
          />
        </>
      )}

      <View style={fs.divider} />
      <Text style={fs.sectionNote}>طلاب المسار</Text>
      {trackRecord ? (
        <View style={{ marginTop: 10 }}>
          <TrackStudentsPanel track={trackRecord} />
        </View>
      ) : (
        <Text style={s.notice}>احفظ المسار أولاً لتتمكن من إضافة الطلاب إليه</Text>
      )}
    </FormPage>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    toggleRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    toggle: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
    chipActive: { backgroundColor: theme.tone.green.bg, borderColor: theme.tone.green.border },
    chipText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    chipTextActive: { color: theme.tone.green.text, fontFamily: theme.fontCairoBold },
    notice: { marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: theme.cardAlt, fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  });
}
