import { useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCircleCheck } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { useHalqat } from '@/lib/queries/halqat';
import { useStudents } from '@/lib/queries/students';
import { useBulkAttendance } from '@/lib/queries/attendance';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

type AttStatus = 'حاضر' | 'غائب' | 'متأخر';
const OPTIONS: AttStatus[] = ['حاضر', 'غائب', 'متأخر'];

const STATUS_COLOR: Record<AttStatus, string> = {
  'حاضر':  theme.green,
  'غائب':  theme.red,
  'متأخر': theme.gold,
};

export default function TeacherAttendance() {
  const authUser = usePortalStore((s) => s.authUser);
  const { data: halqat = [] } = useHalqat({ teacher: authUser?.profileId });
  const firstHalqa = halqat[0];
  const { data: students = [], isLoading } = useStudents({ halqa: firstHalqa?._id });
  const bulkAttendance = useBulkAttendance();

  const today = new Date().toISOString().split('T')[0];
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  function handleSave() {
    if (!firstHalqa) return;
    const records = students.map((s) => ({
      student: s._id,
      status: attendance[s._id] ?? 'حاضر',
    }));
    bulkAttendance.mutate({ halqa: firstHalqa._id, date: today, records });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {bulkAttendance.isSuccess && (
          <Alert variant="success" icon={<IconCircleCheck size={18} color="#166534" />}>
            تم حفظ الحضور وإرسال إشعارات لأولياء الأمور عن الطلاب الغائبين.
          </Alert>
        )}
        {bulkAttendance.isError && (
          <Alert variant="warning">{(bulkAttendance.error as Error).message}</Alert>
        )}

        <Card>
          <CardHeader title={firstHalqa ? `الحضور — ${firstHalqa.name}` : 'الحضور اليومي'} />

          {isLoading && (
            <View style={styles.center}>
              <ActivityIndicator color={theme.green} />
            </View>
          )}

          {!isLoading && !firstHalqa && (
            <Text style={styles.empty}>لا توجد حلقات مسجلة لهذا المعلم</Text>
          )}

          {!isLoading && firstHalqa && students.map((s, i) => {
            const status = attendance[s._id] ?? 'حاضر';
            return (
              <View key={s._id} style={[styles.studentRow, i < students.length - 1 && styles.rowBorder]}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.lastHifz}>{s.lastMemorization || '—'}</Text>

                <View style={styles.optionRow}>
                  {OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => setAttendance((p) => ({ ...p, [s._id]: opt }))}
                      style={[
                        styles.optionBtn,
                        status === opt && { backgroundColor: STATUS_COLOR[opt] + '20', borderColor: STATUS_COLOR[opt] },
                      ]}
                    >
                      <View style={[styles.radio, status === opt && { backgroundColor: STATUS_COLOR[opt] }]} />
                      <Text style={[styles.optionText, status === opt && { color: STATUS_COLOR[opt], fontFamily: theme.fontCairoBold }]}>
                        {opt}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  value={notes[s._id] ?? ''}
                  onChangeText={(t) => setNotes((p) => ({ ...p, [s._id]: t }))}
                  placeholder="ملاحظة..."
                  placeholderTextColor={theme.textMuted}
                  style={styles.noteInput}
                  textAlign="right"
                />
              </View>
            );
          })}
        </Card>

        <Button
          label={bulkAttendance.isPending ? 'جارٍ الحفظ...' : 'حفظ وإرسال إشعارات'}
          onPress={handleSave}
          loading={bulkAttendance.isPending}
          disabled={!firstHalqa}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  center: { paddingVertical: 24, alignItems: 'center' },
  empty: { padding: 16, textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13 },
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
