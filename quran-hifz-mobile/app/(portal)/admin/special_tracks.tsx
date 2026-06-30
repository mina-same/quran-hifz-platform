import { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { theme } from '@/lib/theme';

type Track = { id: string; title: string; type: string; status: 'active' | 'upcoming' | 'ended'; teacher: string; location: string; enrolled: number; max: number };

const INITIAL: Track[] = [
  { id: '1', title: 'حلقات الصيف ١٤٤٦', type: 'صيفي',   status: 'active',   teacher: 'أ. ناصر الحميداني', location: 'جامع العماير القديمة', enrolled: 24, max: 30 },
  { id: '2', title: 'برنامج رمضان',       type: 'رمضاني', status: 'upcoming', teacher: 'أ. خالد المحمدي',    location: 'جامع العماير الجديدة', enrolled: 0,  max: 40 },
];

const STATUS_LABEL: Record<Track['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<Track['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

export default function AdminSpecialTracks() {
  const [tracks, setTracks]   = useState<Track[]>(INITIAL);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [form, setForm]       = useState({ title: '', type: '', teacher: '', location: '' });

  function handleAdd() {
    if (!form.title.trim()) return;
    setTracks((p) => [...p, { id: String(Date.now()), ...form, status: 'upcoming', enrolled: 0, max: 30 }]);
    setForm({ title: '', type: '', teacher: '', location: '' });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {saved && <Text style={s.successBanner}>تم إضافة المسار الاستثنائي ✓</Text>}
        <Pressable style={s.addBtn} onPress={() => setShowForm(true)}>
          <Text style={s.addBtnText}>+ مسار جديد</Text>
        </Pressable>
        {showForm && (
          <Card>
            <CardHeader title="إضافة مسار استثنائي" />
            {[['title', 'اسم المسار', 'مثال: حلقات الصيف'], ['type', 'النوع', 'صيفي / رمضاني / مكثف'], ['teacher', 'المعلم المسؤول', 'اسم المعلم'], ['location', 'الموقع', 'اسم المسجد']].map(([key, label, ph]) => (
              <View key={key}>
                <Text style={s.label}>{label}</Text>
                <TextInput style={s.input} placeholder={ph} value={(form as any)[key]} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))} />
              </View>
            ))}
            <View style={s.row}>
              <Pressable style={s.saveBtn} onPress={handleAdd}><Text style={s.saveBtnText}>إضافة</Text></Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelText}>إلغاء</Text></Pressable>
            </View>
          </Card>
        )}
        {tracks.map((t) => (
          <Card key={t.id}>
            <View style={s.trackHead}>
              <Text style={s.trackTitle}>{t.title}</Text>
              <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
            </View>
            <Text style={s.trackInfo}>المعلم: {t.teacher}</Text>
            <Text style={s.trackInfo}>الموقع: {t.location}</Text>
            <View style={s.trackFoot}>
              <Text style={s.trackInfo}>المسجّلون: {t.enrolled}/{t.max}</Text>
              <Pressable onPress={() => setTracks((p) => p.filter((x) => x.id !== t.id))}>
                <Text style={s.delText}>حذف</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.cream },
  page: { padding: 16, gap: 14 },
  successBanner: { backgroundColor: '#f0fdf4', color: '#15803d', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
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
