import { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconMicrophone, IconPlayerStop, IconSend } from '@tabler/icons-react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from 'expo-audio';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import ContextCard, { halqaToContext, trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import { useHalqat } from '@/lib/queries/halqat';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
import { useStudents, type Student } from '@/lib/queries/students';
import { useCreateRecording } from '@/lib/queries/lessonRecordings';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

const LESSON_TYPES = ['حفظ جديد', 'مراجعة قريبة', 'مراجعة بعيدة', 'تحسين تلاوة', 'اختبار'];

function StudentRecorderCard({ student, context, onSent }: { student: Student; context: TeachingContext; onSent: () => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const createRecording = useCreateRecording();

  const [type, setType] = useState(LESSON_TYPES[0]);
  const [segment, setSegment] = useState(student.lastMemorization ?? '');
  const [points, setPoints] = useState('700');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const hasStopped = !state.isRecording && !!recorder.uri;

  async function handleToggle() {
    if (state.isRecording) {
      await recorder.stop();
    } else {
      await recorder.prepareToRecordAsync();
      recorder.record();
    }
  }

  async function handleSend() {
    if (!segment.trim()) return;
    await createRecording.mutateAsync({
      student: student._id,
      ...(context.kind === 'halqa' ? { halqa: context.id } : { specialTrack: context.id }),
      type,
      segment,
      points: Number(points) || 0,
      teacherNote: note,
    });
    setSent(true);
    onSent();
  }

  return (
    <Card>
      <View style={s.studentHead}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{student.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.studentName}>{student.name}</Text>
          <Text style={s.lastHifz}>آخر حفظ: {student.lastMemorization || '—'}</Text>
        </View>
        {sent ? <Badge label="أُرسل ✓" variant="green" /> : <Badge label="لم يُسجَّل" variant="gold" />}
      </View>

      {sent ? (
        <Alert variant="success">تم الإرسال لـ {student.name} وولي أمره — النقاط: {points}</Alert>
      ) : (
        <>
          <Text style={s.label}>نوع الواجب</Text>
          <View style={s.chipsRow}>
            {LESSON_TYPES.map((t) => (
              <Pressable key={t} style={[s.chip, type === t && s.chipActive]} onPress={() => setType(t)}>
                <Text style={[s.chipText, type === t && s.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>المقطع</Text>
          <TextInput style={s.input} placeholder="البقرة ٢٤٠-٢٤٥" value={segment} onChangeText={setSegment} textAlign="right" placeholderTextColor={theme.textMuted} />

          <View style={s.recArea}>
            <Pressable style={[s.recBtn, state.isRecording && s.recBtnStop]} onPress={handleToggle}>
              {state.isRecording ? <IconPlayerStop size={18} color={theme.white} /> : <IconMicrophone size={18} color={theme.white} />}
              <Text style={s.recBtnText}>{state.isRecording ? 'إيقاف' : hasStopped ? 'تسجيل جديد' : 'ابدأ التسجيل'}</Text>
            </Pressable>
            {state.isRecording && (
              <Text style={s.timer}>{Math.floor((state.durationMillis ?? 0) / 1000)} ث</Text>
            )}
          </View>

          {hasStopped && (
            <>
              <Text style={s.label}>النقاط (٠–١٠٠٠)</Text>
              <TextInput style={s.input} keyboardType="number-pad" value={points} onChangeText={setPoints} textAlign="right" placeholderTextColor={theme.textMuted} />
              <Text style={s.label}>ملاحظة للطالب</Text>
              <TextInput style={s.input} placeholder="اختياري..." value={note} onChangeText={setNote} textAlign="right" placeholderTextColor={theme.textMuted} />
              <Pressable style={s.sendBtn} onPress={handleSend} disabled={createRecording.isPending}>
                <IconSend size={18} color={theme.white} />
                <Text style={s.recBtnText}>{createRecording.isPending ? 'جارٍ الإرسال...' : 'إرسال للطالب وولي الأمر'}</Text>
              </Pressable>
            </>
          )}
        </>
      )}
    </Card>
  );
}

export default function TeacherRecordLesson() {
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [, forceRerender] = useState(0);

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: profileId });
  const { data: tracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, profileId);

  const { data: students = [], isLoading: loadingStudents } = useStudents(
    selected
      ? selected.kind === 'halqa'
        ? { halqa: selected.id }
        : { specialTrack: selected.id }
      : undefined,
  );

  const isLoading = loadingHalqat || loadingTracks;

  if (!selected) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
          {isLoading && <Text style={s.muted}>جارٍ التحميل...</Text>}
          {!isLoading && halqat.length === 0 && tracks.length === 0 && (
            <Text style={s.muted}>لا توجد حلقات أو مسارات مسندة إليك</Text>
          )}
          {halqat.map((h) => (
            <Pressable key={h._id} onPress={() => setSelected(halqaToContext(h))}>
              <ContextCard context={halqaToContext(h)} />
            </Pressable>
          ))}
          {tracks.map((t) => (
            <Pressable key={t._id} onPress={() => setSelected(trackToContext(t))}>
              <ContextCard context={trackToContext(t)} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setSelected(null)}>
          <Text style={s.backLink}>‹ رجوع لاختيار الحلقة/المسار</Text>
        </Pressable>

        <Alert variant="info">سجّل واجب كل طالب صوتياً — يُرسل تلقائياً للطالب وولي أمره فور الانتهاء.</Alert>

        {loadingStudents && <Text style={s.muted}>جارٍ تحميل الطلاب...</Text>}
        {!loadingStudents && students.length === 0 && <Text style={s.muted}>لا يوجد طلاب في هذا السياق</Text>}

        {students.map((st) => (
          <StudentRecorderCard key={st._id} student={st} context={selected} onSent={() => forceRerender((n) => n + 1)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
  backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },
  studentHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: theme.fontCairoBold, color: theme.green },
  studentName: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
  lastHifz: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
  label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo, fontSize: 13, color: theme.text, backgroundColor: theme.white },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { backgroundColor: '#DCFCE7', borderColor: theme.green },
  chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
  chipTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
  recArea: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  recBtn: { backgroundColor: theme.green, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recBtnStop: { backgroundColor: theme.red },
  recBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 13 },
  timer: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.green },
  sendBtn: { backgroundColor: theme.gold, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 12 },
});
