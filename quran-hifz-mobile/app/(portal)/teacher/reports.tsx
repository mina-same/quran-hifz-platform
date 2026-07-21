import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import { usePortalStore } from '@/lib/store/portalStore';
import { useHalqat } from '@/lib/queries/halqat';
import { useStudents } from '@/lib/queries/students';
import { theme } from '@/lib/theme';

function getName(v: { _id: string; name: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'name' in v) return v.name;
  if (typeof v === 'string') return v;
  return '';
}

export default function TeacherReports() {
  const authUser = usePortalStore((s) => s.authUser);
  // Web's TeacherReports page is a static placeholder with no real data source;
  // this scopes per-student report cards to the teacher's first halqa, matching
  // the same student-list scoping used on the students screen.
  const { data: halqat = [] } = useHalqat({ teacher: authUser?.profileId });
  const firstHalqaId = halqat[0]?._id;
  const { data: students = [], isLoading, isError } = useStudents({ halqa: firstHalqaId });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.green} />
          </View>
        )}

        {isError && <Alert variant="error">تعذر تحميل التقارير</Alert>}

        {!isLoading && !isError && students.length === 0 && (
          <Text style={styles.muted}>لا توجد بيانات طلاب لعرضها</Text>
        )}

        {students.map((s) => (
          <Card key={s._id}>
            <CardHeader
              title={s.name}
              right={<Badge label={s.status === 'active' ? 'نشط' : 'غير نشط'} variant={s.status === 'active' ? 'green' : 'gray'} />}
            />
            <View style={styles.rows}>
              {[
                ['الحلقة', getName(s.halqa)],
                ['آخر حفظ', s.lastMemorization || '—'],
              ].map(([k, v]) => (
                <View key={k} style={styles.row}>
                  <Text style={styles.label}>{k}</Text>
                  <Text style={styles.value}>{v}</Text>
                </View>
              ))}
              <View style={styles.row}>
                <Text style={styles.label}>نسبة الحضور</Text>
                <Text style={[styles.boldValue, { color: s.attendancePct >= 90 ? theme.green : theme.red }]}>{s.attendancePct}٪</Text>
              </View>
              <View>
                <View style={[styles.row, { marginBottom: 4 }]}>
                  <Text style={styles.label}>التقدم الكلي</Text>
                  <Text style={[styles.boldValue, { color: theme.green }]}>{s.progressPages}/{s.totalPages} صفحة</Text>
                </View>
                <ProgressBar value={s.progressPct} showPercent={false} />
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  loadingBox: { paddingVertical: 8, alignItems: 'center' },
  muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 20 },
  rows: { gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  value: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
  boldValue: { fontSize: 12, fontFamily: theme.fontCairoBold },
});
