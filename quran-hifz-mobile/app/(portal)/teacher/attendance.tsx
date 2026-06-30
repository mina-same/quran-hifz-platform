import { useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCircleCheck } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { STUDENTS } from '@/lib/data/students';
import { theme } from '@/lib/theme';

type AttStatus = 'حاضر' | 'غائب' | 'متأخر';
const OPTIONS: AttStatus[] = ['حاضر', 'غائب', 'متأخر'];

const STATUS_COLOR: Record<AttStatus, string> = {
  'حاضر':  theme.green,
  'غائب':  theme.red,
  'متأخر': theme.gold,
};

export default function TeacherAttendance() {
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>(
    Object.fromEntries(STUDENTS.map((s) => [s.id, 'حاضر']))
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {saved && (
          <Alert variant="success" icon={<IconCircleCheck size={18} color="#166534" />}>
            تم حفظ الحضور وإرسال إشعارات لأولياء الأمور عن الطلاب الغائبين.
          </Alert>
        )}

        <Card>
          <CardHeader title="الحضور — الخميس ١٤٤٥/١٠/٢٠" />

          {STUDENTS.map((s, i) => (
            <View key={s.id} style={[styles.studentRow, i < STUDENTS.length - 1 && styles.rowBorder]}>
              <Text style={styles.studentName}>{s.name}</Text>
              <Text style={styles.lastHifz}>{s.lastMemorization}</Text>

              {/* Attendance options */}
              <View style={styles.optionRow}>
                {OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => setAttendance((p) => ({ ...p, [s.id]: opt }))}
                    style={[
                      styles.optionBtn,
                      attendance[s.id] === opt && { backgroundColor: STATUS_COLOR[opt] + '20', borderColor: STATUS_COLOR[opt] },
                    ]}
                  >
                    <View style={[styles.radio, attendance[s.id] === opt && { backgroundColor: STATUS_COLOR[opt] }]} />
                    <Text style={[styles.optionText, attendance[s.id] === opt && { color: STATUS_COLOR[opt], fontFamily: theme.fontCairoBold }]}>
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Note */}
              <TextInput
                value={notes[s.id] ?? ''}
                onChangeText={(t) => setNotes((p) => ({ ...p, [s.id]: t }))}
                placeholder="ملاحظة..."
                placeholderTextColor={theme.textMuted}
                style={styles.noteInput}
                textAlign="right"
              />
            </View>
          ))}
        </Card>

        <Button label="حفظ وإرسال إشعارات" onPress={handleSave} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  studentRow: { paddingVertical: 14, gap: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  studentName: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
  lastHifz: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  radio: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: theme.border,
  },
  optionText: {
    fontSize: 12,
    fontFamily: theme.fontCairo,
    color: theme.text,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontFamily: theme.fontCairo,
    color: theme.text,
  },
});
