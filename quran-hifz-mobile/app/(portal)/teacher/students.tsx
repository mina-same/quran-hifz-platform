import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import DataTable from '@/components/ui/DataTable';
import ProgressBar from '@/components/ui/ProgressBar';
import { usePortalStore } from '@/lib/store/portalStore';
import { useHalqat } from '@/lib/queries/halqat';
import { useStudents } from '@/lib/queries/students';
import { theme } from '@/lib/theme';

const hwVariant = (s: string) =>
  s === 'submitted' ? 'green' : s === 'late' ? 'red' : 'gold';
const hwLabel = (s: string) =>
  s === 'submitted' ? 'مُسلَّم' : s === 'late' ? 'متأخر' : 'معلق';

function getName(v: { _id: string; name: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'name' in v) return v.name;
  if (typeof v === 'string') return v;
  return '';
}

export default function TeacherStudents() {
  const authUser = usePortalStore((s) => s.authUser);
  // Teachers may run several halqat — mirrors the web TeacherStudents page,
  // which scopes the list to the teacher's first halqa.
  const { data: halqat = [] } = useHalqat({ teacher: authUser?.profileId });
  const firstHalqaId = halqat[0]?._id;
  const { data: students = [], isLoading, isError } = useStudents({ halqa: firstHalqaId });

  const rows = students.map((s) => ({
    name:       <Text style={styles.bold}>{s.name}</Text>,
    halqa:      <Text style={styles.muted}>{getName(s.halqa)}</Text>,
    last:       <Text style={styles.muted}>{s.lastMemorization || '—'}</Text>,
    attendance: <Text style={[styles.bold, { color: s.attendancePct >= 90 ? theme.green : theme.red }]}>{s.attendancePct}٪</Text>,
    hw:         <Badge label={hwLabel(s.homeworkStatus)} variant={hwVariant(s.homeworkStatus) as any} />,
    progress: (
      <View style={{ minWidth: 80 }}>
        <Text style={[styles.muted, { fontSize: 11, marginBottom: 2 }]}>{s.progressPct}٪</Text>
        <ProgressBar value={s.progressPct} showPercent={false} />
      </View>
    ),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {isError && <Alert variant="error">تعذر تحميل الطلاب</Alert>}

        <Card noPadding>
          <CardHeader title={`الطلاب (${students.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.green} />
            </View>
          ) : (
            <DataTable
              columns={[
                { key: 'name',       label: 'الاسم',   flex: 2 },
                { key: 'halqa',      label: 'الحلقة',  flex: 2 },
                { key: 'last',       label: 'آخر حفظ', flex: 2 },
                { key: 'attendance', label: 'الحضور',  flex: 1 },
                { key: 'hw',         label: 'الواجب',  flex: 1 },
                { key: 'progress',   label: 'التقدم',  flex: 2 },
              ]}
              rows={rows}
            />
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  loadingBox: { paddingVertical: 24, alignItems: 'center' },
  bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
});
