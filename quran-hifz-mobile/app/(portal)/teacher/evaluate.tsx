import { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { theme } from '@/lib/theme';

const STUDENTS = ['عبدالله الحميداني', 'محمد القحطاني', 'يوسف الشمري', 'عمر العتيبي'];
const RATINGS  = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول'];

export default function TeacherEvaluate() {
  const [student, setStudent] = useState(0);
  const [rating, setRating]   = useState(0);
  const [segment, setSegment] = useState('');
  const [points, setPoints]   = useState('');
  const [note, setNote]       = useState('');
  const [saved, setSaved]     = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {saved && <Text style={s.successBanner}>تم حفظ التقييم بنجاح ✓</Text>}
        <Card>
          <CardHeader title="تقييم الطالب" />
          <Text style={s.label}>الطالب</Text>
          <View style={s.pills}>
            {STUDENTS.map((st, i) => (
              <Pressable key={st} onPress={() => setStudent(i)} style={[s.pill, student === i && s.pillActive]}>
                <Text style={[s.pillText, student === i && s.pillTextActive]}>{st}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>المقطع / الآيات</Text>
          <TextInput style={s.input} placeholder="مثال: البقرة ٢٤٠-٢٤٥" value={segment} onChangeText={setSegment} />
          <Text style={s.label}>النقاط</Text>
          <TextInput style={s.input} placeholder="٠ — ١٠٠٠" keyboardType="number-pad" value={points} onChangeText={setPoints} />
          <Text style={s.label}>التقييم العام</Text>
          <View style={s.pills}>
            {RATINGS.map((r, i) => (
              <Pressable key={r} onPress={() => setRating(i)} style={[s.pill, rating === i && s.pillActive]}>
                <Text style={[s.pillText, rating === i && s.pillTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>ملاحظات</Text>
          <TextInput style={[s.input, { minHeight: 80 }]} placeholder="ملاحظاتك للطالب وولي الأمر..." value={note} onChangeText={setNote} multiline textAlignVertical="top" />
          <Pressable style={s.saveBtn} onPress={handleSave}>
            <Text style={s.saveBtnText}>حفظ التقييم</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.cream },
  page: { padding: 16 },
  successBanner: { backgroundColor: '#f0fdf4', color: '#15803d', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, marginBottom: 12, textAlign: 'center' },
  label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo, fontSize: 13, color: theme.text, backgroundColor: theme.white },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.white },
  pillActive: { backgroundColor: theme.green, borderColor: theme.green },
  pillText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.text },
  pillTextActive: { color: theme.white, fontFamily: theme.fontCairoBold },
  saveBtn: { backgroundColor: theme.green, borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center' },
  saveBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
});
