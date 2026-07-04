import { useMemo, useState } from 'react';
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
import { useAttendance, useBulkAttendance } from '@/lib/queries/attendance';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AttStatus = 'حاضر' | 'غائب' | 'متأخر';
const OPTIONS: AttStatus[] = ['حاضر', 'غائب', 'متأخر'];

export default function TeacherAttendance() {
  const theme = useAppTheme();
  const STATUS_COLOR: Record<AttStatus, string> = {
    'حاضر': theme.green,
    'غائب': theme.red,
    'متأخر': theme.gold,
  };
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [overrides, setOverrides] = useState<Record<string, AttStatus>>({});
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
  const [unnotified, setUnnotified] = useState<{ id: string; name: string }[]>([]);

  const today = new Date().toISOString().split('T')[0];

  // Today's already-saved attendance for this context, so re-opening the same
  // halqa/track later the same day shows what was actually recorded instead of
  // resetting every student back to the 'حاضر' default.
  const { data: savedToday = [] } = useAttendance(
    selected
      ? selected.kind === 'halqa'
        ? { halqa: selected.id, from: today, to: today }
        : { specialTrack: selected.id, from: today, to: today }
      : undefined,
  );
  const savedStatusById: Record<string, AttStatus> = {};
  for (const r of savedToday) {
    const id = typeof r.student === 'string' ? r.student : r.student._id;
    savedStatusById[id] = r.status as AttStatus;
  }
  const statusFor = (studentId: string): AttStatus => overrides[studentId] ?? savedStatusById[studentId] ?? 'حاضر';

  function setStatus(studentId: string, status: AttStatus) {
    setOverrides((p) => ({ ...p, [studentId]: status }));
  }

  function handleSave() {
    if (!selected) return;
    const records = students.map((s) => ({ student: s._id, status: statusFor(s._id) }));
    bulkAttendance.mutate(
      {
        ...(selected.kind === 'halqa' ? { halqa: selected.id } : { specialTrack: selected.id }),
        date: today,
        records,
      },
      {
        onSuccess: (res) => {
          setSaved(true);
          setUnnotified(res.unnotified);
          setTimeout(() => setSaved(false), 4000);
        },
      },
    );
  }

  const isLoading = loadingHalqat || loadingTracks;

  const styles = useMemo(() => StyleSheet.create({
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
  }), [theme]);

  if (!selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {saved && (
          <Alert variant="success" icon={<IconCircleCheck size={18} color="#166534" />}>
            تم حفظ الحضور وإرسال إشعارات لأولياء الأمور عن الطلاب الغائبين.
          </Alert>
        )}
        {saved && unnotified.length > 0 && (
          <Alert variant="error">
            تعذر إرسال إشعار عن غياب: {unnotified.map((s) => s.name).join('، ')} — لا يوجد ولي أمر مرتبط بالحساب.
          </Alert>
        )}
        {bulkAttendance.isError && (
          <Alert variant="error">{(bulkAttendance.error as Error).message}</Alert>
        )}

        <Pressable onPress={() => { setSelected(null); setOverrides({}); }}>
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
                  const active = statusFor(st._id) === opt;
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
