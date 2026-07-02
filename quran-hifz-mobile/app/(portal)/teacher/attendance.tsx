import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCircleCheck } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import ContextCard, { halqaToContext, trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import { useHalqat } from '@/lib/queries/halqat';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
import { useStudents } from '@/lib/queries/students';
import { useBulkAttendance } from '@/lib/queries/attendance';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

type AttStatus = 'حاضر' | 'غائب' | 'متأخر';
const OPTIONS: AttStatus[] = ['حاضر', 'غائب', 'متأخر'];

const STATUS_COLOR: Record<AttStatus, string> = {
  'حاضر': theme.green,
  'غائب': theme.red,
  'متأخر': theme.gold,
};

export default function TeacherAttendance() {
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttStatus>>({});
  const [saved, setSaved] = useState(false);

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: profileId });
  const { data: tracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, profileId);

  const { data: students = [], isLoading: loadingStudents } = useStudents(
    selected
      ? selected.kind === 'halqa'
        ? { halqa: selected.id }
        : { specialTrack: selected.id }
      : undefined,
  );

  const bulkAttendance = useBulkAttendance();

  const today = new Date().toISOString().split('T')[0];

  function setStatus(studentId: string, status: AttStatus) {
    setStatuses((p) => ({ ...p, [studentId]: status }));
  }

  function handleSave() {
    if (!selected) return;
    const records = students.map((s) => ({ student: s._id, status: statuses[s._id] ?? 'حاضر' }));
    bulkAttendance.mutate(
      {
        ...(selected.kind === 'halqa' ? { halqa: selected.id } : { specialTrack: selected.id }),
        date: today,
        records,
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 4000);
        },
      },
    );
  }

  const isLoading = loadingHalqat || loadingTracks;

  if (!selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          {isLoading && <Text style={styles.muted}>جارٍ التحميل...</Text>}
          {!isLoading && halqat.length === 0 && tracks.length === 0 && (
            <Text style={styles.muted}>لا توجد حلقات أو مسارات مسندة إليك</Text>
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
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {saved && (
          <Alert variant="success" icon={<IconCircleCheck size={18} color="#166534" />}>
            تم حفظ الحضور وإرسال إشعارات لأولياء الأمور عن الطلاب الغائبين.
          </Alert>
        )}
        {bulkAttendance.isError && (
          <Alert variant="error">{(bulkAttendance.error as Error).message}</Alert>
        )}

        <Pressable onPress={() => setSelected(null)}>
          <Text style={styles.backLink}>‹ رجوع لاختيار الحلقة/المسار</Text>
        </Pressable>

        <Card>
          <CardHeader title={`${selected.title} — ${today}`} />

          {loadingStudents && <Text style={styles.muted}>جارٍ تحميل الطلاب...</Text>}

          {!loadingStudents && students.length === 0 && (
            <Text style={styles.muted}>لا يوجد طلاب</Text>
          )}

          {students.map((st, i) => (
            <View key={st._id} style={[styles.studentRow, i < students.length - 1 && styles.rowBorder]}>
              <Text style={styles.studentName}>{st.name}</Text>
              <Text style={styles.lastHifz}>{st.lastMemorization || '—'}</Text>
              <View style={styles.optionRow}>
                {OPTIONS.map((opt) => {
                  const active = (statuses[st._id] ?? 'حاضر') === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setStatus(st._id, opt)}
                      style={[styles.optionBtn, active && { backgroundColor: STATUS_COLOR[opt] + '20', borderColor: STATUS_COLOR[opt] }]}
                    >
                      <View style={[styles.radio, active && { backgroundColor: STATUS_COLOR[opt] }]} />
                      <Text style={[styles.optionText, active && { color: STATUS_COLOR[opt], fontFamily: theme.fontCairoBold }]}>
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>

        <Button
          label={bulkAttendance.isPending ? 'جارٍ الحفظ...' : 'حفظ وإرسال إشعارات'}
          onPress={handleSave}
          disabled={bulkAttendance.isPending || students.length === 0}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
  backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },
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
});
