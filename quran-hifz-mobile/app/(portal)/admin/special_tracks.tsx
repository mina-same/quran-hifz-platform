import { useState } from 'react';
import { ScrollView, View, Text, TextInput, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { useSpecialTracks, useCreateTrack, useDeleteTrack } from '@/lib/queries/specialTracks';
import type { SpecialTrack } from '@/lib/queries/specialTracks';
import { theme } from '@/lib/theme';

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return typeof v === 'string' ? v : '';
}

const STATUS_LABEL: Record<SpecialTrack['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<SpecialTrack['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

export default function AdminSpecialTracks() {
  const { data: tracks = [], isLoading } = useSpecialTracks();
  const createTrack = useCreateTrack();
  const deleteTrack = useDeleteTrack();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: '', teacher: '', location: '', timeSlot: '', maxStudents: '' });

  async function handleAdd() {
    if (!form.title.trim()) return;
    await createTrack.mutateAsync({
      title: form.title,
      type: form.type || 'عام',
      status: 'upcoming',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      daysPerWeek: '—',
      timeSlot: form.timeSlot,
      location: form.location,
      teacher: form.teacher,
      maxStudents: Number(form.maxStudents) || 30,
    });
    setForm({ title: '', type: '', teacher: '', location: '', timeSlot: '', maxStudents: '' });
    setShowForm(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {createTrack.isSuccess && <Text style={s.successBanner}>تم إضافة المسار الاستثنائي ✓</Text>}
        {createTrack.isError && <Text style={s.errorBanner}>{(createTrack.error as Error).message}</Text>}

        <Pressable style={s.addBtn} onPress={() => setShowForm(true)}>
          <Text style={s.addBtnText}>+ مسار جديد</Text>
        </Pressable>

        {showForm && (
          <Card>
            <CardHeader title="إضافة مسار استثنائي" />
            {[
              ['title', 'اسم المسار', 'مثال: حلقات الصيف'],
              ['type', 'النوع', 'صيفي / رمضاني / مكثف'],
              ['teacher', 'معرّف المعلم', 'معرّف المعلم'],
              ['location', 'الموقع', 'اسم المسجد'],
              ['timeSlot', 'الوقت', 'مثال: بعد الفجر ٦:١٠ – ٧:٣٠'],
              ['maxStudents', 'الحد الأقصى للطلاب', '٣٠'],
            ].map(([key, label, ph]) => (
              <View key={key}>
                <Text style={s.label}>{label}</Text>
                <TextInput style={s.input} placeholder={ph} value={(form as any)[key]} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))} />
              </View>
            ))}
            <View style={s.row}>
              <Pressable style={s.saveBtn} onPress={handleAdd} disabled={createTrack.isPending}>
                <Text style={s.saveBtnText}>{createTrack.isPending ? 'جارٍ الحفظ...' : 'إضافة'}</Text>
              </Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelText}>إلغاء</Text></Pressable>
            </View>
          </Card>
        )}

        {isLoading && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={theme.green} />
          </View>
        )}

        {!isLoading && tracks.map((t) => {
          const enrolled = t.enrolledStudents?.length ?? 0;
          return (
            <Card key={t._id}>
              <View style={s.trackHead}>
                <Text style={s.trackTitle}>{t.title}</Text>
                <Badge variant={STATUS_VARIANT[t.status]} label={STATUS_LABEL[t.status]} />
              </View>
              <Text style={s.trackInfo}>المعلم: {getName(t.teacher)}</Text>
              <Text style={s.trackInfo}>الموقع: {t.location}</Text>
              <View style={s.trackFoot}>
                <Text style={s.trackInfo}>المسجّلون: {enrolled}/{t.maxStudents}</Text>
                <Pressable onPress={() => deleteTrack.mutate(t._id)} disabled={deleteTrack.isPending}>
                  <Text style={s.delText}>حذف</Text>
                </Pressable>
              </View>
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
  errorBanner: { backgroundColor: '#fef2f2', color: '#991b1b', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
  addBtn: { backgroundColor: theme.green, borderRadius: 8, padding: 12, alignItems: 'center' },
  addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
  label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo, fontSize: 13, color: theme.text, backgroundColor: theme.white },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  saveBtn: { backgroundColor: theme.green, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, flex: 1, alignItems: 'center' },
  saveBtnText: { color: theme.white, fontFamily: theme.fontCairoBold },
  cancelBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, flex: 1, alignItems: 'center' },
  cancelText: { color: theme.textMuted, fontFamily: theme.fontCairo },
  trackHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  trackTitle: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1 },
  trackInfo: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 4 },
  trackFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  delText: { fontSize: 12, color: theme.red, fontFamily: theme.fontCairo },
});
