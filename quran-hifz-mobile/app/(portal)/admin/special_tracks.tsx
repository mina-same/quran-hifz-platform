import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
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
import { theme } from '@/lib/theme';

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

const STATUS_LABEL: Record<SpecialTrack['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<SpecialTrack['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

const TYPE_OPTS = ['مراجعة مكثّفة', 'تجويد', 'إجازة', 'ختمة مسرّعة', 'برنامج رمضاني', 'تحضير مسابقة', 'أخرى'];
const DAYS_OPTS = ['يومياً', 'مرتين أسبوعياً', 'ثلاث مرات أسبوعياً', 'عطلة نهاية الأسبوع'];

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
  teachers: [], maxStudents: '30', startDate: '', endDate: '', daysPerWeek: '', status: 'upcoming', notes: '',
};

export default function AdminSpecialTracks() {
  const { data: tracks = [], isLoading } = useSpecialTracks();
  const { data: teachers = [] } = useTeachers();
  const { data: allStudents = [] } = useStudents();

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
    setShowForm(true);
  }

  function openEdit(t: SpecialTrack) {
    const d = (s: string) => (s ? new Date(s).toISOString().split('T')[0] : '');
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
  const studentsPanelTrack = tracks.find((t) => t._id === studentsPanelId) ?? null;
  const enrolledIds = new Set((studentsPanelTrack?.enrolledStudents ?? []).map(getEnrolledId));
  const availableStudents = allStudents.filter((s) => !enrolledIds.has(s._id));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {saved && <Text style={s.successBanner}>تم حفظ المسار الاستثنائي ✓</Text>}

        <Pressable style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+ مسار جديد</Text>
        </Pressable>

        {showForm && (
          <Card>
            <CardHeader title={editId ? 'تعديل المسار' : 'إضافة مسار استثنائي'} />
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
                  <Pressable key={t._id} style={[s.teacherChip, selected && s.teacherChipActive]} onPress={() => toggleTeacher(t._id)}>
                    <Text style={[s.teacherChipText, selected && s.teacherChipTextActive]}>{t.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.rowGroup}>
              <Pressable
                style={[s.onlineToggle, !form.isOnline && s.onlineToggleActive]}
                onPress={() => sf('isOnline', false)}
              >
                <Text style={[s.onlineToggleText, !form.isOnline && s.onlineToggleTextActive]}>حضوري</Text>
              </Pressable>
              <Pressable
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
                <FormInput placeholder="اسم المسجد" value={form.location} onChangeText={(v) => sf('location', v)} />
              </>
            )}

            <Text style={s.label}>الوقت</Text>
            <FormInput placeholder="مثال: بعد الفجر" value={form.timeSlot} onChangeText={(v) => sf('timeSlot', v)} />

            <Text style={s.label}>الأيام</Text>
            <FormSelect
              value={form.daysPerWeek}
              onChange={(v) => sf('daysPerWeek', v)}
              options={DAYS_OPTS.map((o) => ({ value: o, label: o }))}
              placeholder="اختر الأيام"
            />

            <Text style={s.label}>تاريخ البداية</Text>
            <FormInput placeholder="YYYY-MM-DD" value={form.startDate} onChangeText={(v) => sf('startDate', v)} />

            <Text style={s.label}>تاريخ النهاية</Text>
            <FormInput placeholder="YYYY-MM-DD" value={form.endDate} onChangeText={(v) => sf('endDate', v)} />

            <Text style={s.label}>الحد الأقصى للطلاب</Text>
            <FormInput placeholder="30" keyboardType="number-pad" value={form.maxStudents} onChangeText={(v) => sf('maxStudents', v)} />

            <Text style={s.label}>ملاحظات</Text>
            <FormInput placeholder="اختياري" value={form.notes} onChangeText={(v) => sf('notes', v)} />

            <View style={s.row}>
              <Button label={isPending ? 'جارٍ الحفظ...' : 'حفظ'} onPress={handleSubmit} disabled={isPending} style={s.flex1} />
              <Button label="إلغاء" variant="ghost" onPress={() => setShowForm(false)} style={s.flex1} />
            </View>
          </Card>
        )}

        {isLoading && <Text style={s.muted}>جارٍ التحميل...</Text>}

        {!isLoading && tracks.length === 0 && <Text style={s.muted}>لا توجد مسارات استثنائية بعد</Text>}

        {tracks.map((t) => {
          const enrolled = t.enrolledStudents.length;
          return (
            <Card key={t._id}>
              <View style={s.trackHead}>
                <Text style={s.trackTitle}>{t.title}</Text>
                <Badge label={STATUS_LABEL[t.status]} variant={STATUS_VARIANT[t.status]} />
              </View>
              <Text style={s.trackInfo}>المعلمون: {t.teachers.map(getTeacherName).join('، ') || '—'}</Text>
              <Text style={s.trackInfo}>{t.isOnline ? 'أونلاين' : `الموقع: ${t.location}`}</Text>
              <Text style={s.trackInfo}>الوقت: {t.timeSlot} • {t.daysPerWeek}</Text>
              <View style={s.trackFoot}>
                <Text style={s.trackInfo}>المسجّلون: {enrolled}/{t.maxStudents}</Text>
                <View style={s.actionsRow}>
                  <Pressable onPress={() => { setStudentsPanelId(t._id); setAddStudentId(''); }}>
                    <Text style={s.linkText}>الطلاب</Text>
                  </Pressable>
                  <Pressable onPress={() => openEdit(t)}>
                    <Text style={s.linkText}>تعديل</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteTrack.mutate(t._id)} disabled={deleteTrack.isPending}>
                    <Text style={s.delText}>حذف</Text>
                  </Pressable>
                </View>
              </View>

              {studentsPanelId === t._id && (
                <View style={s.studentsPanel}>
                  <Text style={s.panelTitle}>إدارة الطلاب</Text>
                  {enrolled < t.maxStudents && (
                    <View style={s.row}>
                      <View style={s.flex1}>
                        <FormSelect
                          value={addStudentId}
                          onChange={setAddStudentId}
                          options={availableStudents.map((st) => ({ value: st._id, label: st.name }))}
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
                  )}
                  {t.enrolledStudents.length === 0 ? (
                    <Text style={s.muted}>لا يوجد طلاب مسجّلون بعد</Text>
                  ) : (
                    t.enrolledStudents.map((st) => (
                      <View key={getEnrolledId(st)} style={s.studentRow}>
                        <Text style={s.studentName}>{getEnrolledName(st)}</Text>
                        <Pressable
                          onPress={() => unenrollStudent.mutate({ id: t._id, studentId: getEnrolledId(st) })}
                          disabled={unenrollStudent.isPending}
                        >
                          <Text style={s.delText}>إزالة</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                  <Pressable onPress={() => setStudentsPanelId(null)}>
                    <Text style={s.closeText}>إغلاق</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 16, gap: 14 },
  successBanner: { backgroundColor: '#f0fdf4', color: '#15803d', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
  errorText: { color: theme.red, fontFamily: theme.fontCairo, fontSize: 12, marginBottom: 8 },
  addBtn: { backgroundColor: theme.green, borderRadius: 8, padding: 12, alignItems: 'center' },
  addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
  label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
  row: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' },
  rowGroup: { flexDirection: 'row', gap: 8, marginTop: 12 },
  flex1: { flex: 1 },
  onlineToggle: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  onlineToggleActive: { backgroundColor: '#DCFCE7', borderColor: theme.green },
  onlineToggleText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  onlineToggleTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
  teacherList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teacherChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  teacherChipActive: { backgroundColor: '#DCFCE7', borderColor: theme.green },
  teacherChipText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  teacherChipTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
  trackHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  trackTitle: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1 },
  trackInfo: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 4 },
  trackFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  actionsRow: { flexDirection: 'row', gap: 14 },
  linkText: { fontSize: 12, color: theme.green, fontFamily: theme.fontCairoBold },
  delText: { fontSize: 12, color: theme.red, fontFamily: theme.fontCairo },
  closeText: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', marginTop: 10 },
  studentsPanel: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, gap: 8 },
  panelTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.border },
  studentName: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text },
});
