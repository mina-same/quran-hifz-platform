import { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconMicrophone, IconPlayerStop, IconDeviceFloppy } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { theme } from '@/lib/theme';

type RecState = 'idle' | 'recording' | 'done';

export default function TeacherRecordLesson() {
  const [recState, setRecState] = useState<RecState>('idle');
  const [saved, setSaved]       = useState(false);
  const [segment, setSegment]   = useState('');
  const [note, setNote]         = useState('');

  function toggleRec() {
    if (recState === 'idle')      setRecState('recording');
    else if (recState === 'recording') setRecState('done');
    else setRecState('idle');
  }

  function handleSave() {
    setSaved(true);
    setRecState('idle');
    setSegment('');
    setNote('');
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {saved && <Text style={s.successBanner}>تم حفظ التسجيل بنجاح ✓</Text>}
        <Card>
          <CardHeader title="بيانات الدرس" />
          <Text style={s.label}>المقطع</Text>
          <TextInput style={s.input} placeholder="مثال: البقرة ٢٤٠-٢٤٥" value={segment} onChangeText={setSegment} />
          <Text style={s.label}>ملاحظة المعلم</Text>
          <TextInput style={s.input} placeholder="ملاحظة مختصرة..." value={note} onChangeText={setNote} />
        </Card>
        <Card>
          <CardHeader title="التسجيل الصوتي" />
          <View style={s.recArea}>
            <View style={[s.recIcon, recState === 'recording' && s.recIconActive]}>
              <IconMicrophone size={48} color={recState === 'recording' ? theme.white : theme.red} />
            </View>
            <Text style={s.recStatus}>
              {recState === 'idle'      ? 'اضغط لبدء التسجيل' :
               recState === 'recording' ? 'جارٍ التسجيل...' :
               'تم التسجيل — جاهز للحفظ ✓'}
            </Text>
            <View style={s.btnRow}>
              <Pressable style={[s.recBtn, recState === 'recording' && s.recBtnStop]} onPress={toggleRec}>
                {recState === 'recording'
                  ? <IconPlayerStop size={18} color={theme.white} />
                  : <IconMicrophone size={18} color={theme.white} />}
                <Text style={s.recBtnText}>
                  {recState === 'idle' ? 'ابدأ التسجيل' : recState === 'recording' ? 'إيقاف' : 'تسجيل جديد'}
                </Text>
              </Pressable>
              {recState === 'done' && (
                <Pressable style={s.saveBtn} onPress={handleSave}>
                  <IconDeviceFloppy size={18} color={theme.white} />
                  <Text style={s.recBtnText}>حفظ الدرس</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.cream },
  page: { padding: 16, gap: 14 },
  successBanner: { backgroundColor: '#f0fdf4', color: '#15803d', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
  label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo, fontSize: 13, color: theme.text, backgroundColor: theme.white },
  recArea: { alignItems: 'center', gap: 16, padding: 16 },
  recIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },
  recIconActive: { backgroundColor: theme.red },
  recStatus: { fontSize: 14, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 12 },
  recBtn: { backgroundColor: theme.green, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recBtnStop: { backgroundColor: theme.red },
  recBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 13 },
  saveBtn: { backgroundColor: theme.gold, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
