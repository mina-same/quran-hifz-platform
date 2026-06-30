import { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { theme } from '@/lib/theme';

type HW = { title: string; desc: string; dueDay: string };
const INITIAL: HW[] = [
  { title: 'مراجعة سورة البقرة آيات ١-٢٠', desc: 'مراجعة شاملة مع التجويد',  dueDay: 'الأحد' },
  { title: 'حفظ آل عمران آيات ١-١٠',       desc: 'حفظ جديد مع ضبط المخارج', dueDay: 'الثلاثاء' },
];

export default function TeacherGroupHomework() {
  const [hws, setHws]         = useState<HW[]>(INITIAL);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [form, setForm]       = useState({ title: '', desc: '', dueDay: 'الأحد' });

  function handleAdd() {
    if (!form.title.trim()) return;
    setHws((p) => [...p, { ...form }]);
    setForm({ title: '', desc: '', dueDay: 'الأحد' });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {saved && <Text style={s.successBanner}>تم إضافة الواجب الجماعي ✓</Text>}
        <Pressable style={s.addBtn} onPress={() => setShowForm(true)}>
          <Text style={s.addBtnText}>+ واجب جديد</Text>
        </Pressable>
        {showForm && (
          <Card>
            <CardHeader title="إضافة واجب جماعي" />
            <Text style={s.label}>عنوان الواجب</Text>
            <TextInput style={s.input} placeholder="عنوان الواجب..." value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
            <Text style={s.label}>الوصف</Text>
            <TextInput style={[s.input, { minHeight: 60 }]} placeholder="وصف الواجب..." value={form.desc} onChangeText={(v) => setForm((f) => ({ ...f, desc: v }))} multiline textAlignVertical="top" />
            <Text style={s.label}>موعد التسليم</Text>
            <TextInput style={s.input} placeholder="مثال: الأحد" value={form.dueDay} onChangeText={(v) => setForm((f) => ({ ...f, dueDay: v }))} />
            <View style={s.row}>
              <Pressable style={s.saveBtn} onPress={handleAdd}><Text style={s.saveBtnText}>إضافة</Text></Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelText}>إلغاء</Text></Pressable>
            </View>
          </Card>
        )}
        <Card>
          <CardHeader title="الواجبات الجماعية الحالية" />
          {hws.map((hw, i) => (
            <View key={i} style={[s.hwItem, i && s.border]}>
              <Text style={s.hwTitle}>{hw.title}</Text>
              <Text style={s.hwDesc}>{hw.desc}</Text>
              <View style={s.hwFoot}>
                <Badge variant="gold">موعد: {hw.dueDay}</Badge>
                <Pressable onPress={() => setHws((p) => p.filter((_, idx) => idx !== i))}>
                  <Text style={s.delText}>حذف</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
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
  hwItem: { paddingVertical: 12 },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  hwTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 4 },
  hwDesc: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginBottom: 6 },
  hwFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delText: { fontSize: 12, color: theme.red, fontFamily: theme.fontCairo },
});
