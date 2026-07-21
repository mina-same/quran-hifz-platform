import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Alert from '@/components/ui/Alert';
import { usePortalStore } from '@/lib/store/portalStore';
import { useStudent } from '@/lib/queries/students';
import { useHomework } from '@/lib/queries/homework';
import { theme } from '@/lib/theme';

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return '—';
}

export default function StudentDashboard() {
  const authUser = usePortalStore((s) => s.authUser);
  const studentId = authUser?.profileId;

  const { data: student, isLoading: studentLoading, isError: studentError } = useStudent(studentId);
  const { data: homework = [], isLoading: hwLoading } = useHomework({ student: studentId });

  const isLoading = studentLoading || hwLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.green} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (studentError || !student) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <Alert variant="error">تعذر تحميل بيانات الطالب</Alert>
        </View>
      </SafeAreaView>
    );
  }

  const submittedCount = homework.filter((h) => h.status === 'مراجع').length;

  const STATS = [
    { label: 'صفحات محفوظة', value: student.progressPages, color: theme.green },
    { label: 'نسبة الحضور', value: `${student.attendancePct}٪`, color: theme.gold },
    { label: 'واجبات مراجعة', value: submittedCount, color: '#3B82F6' },
    { label: 'نسبة الإنجاز', value: `${student.progressPct}٪`, color: theme.red },
  ];

  const recentHomework = [...homework]
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AyahBar />

        <StatsRow stats={STATS} />

        <View style={styles.twoCol}>
          {/* Current plan */}
          <Card style={styles.half}>
            <CardHeader title="خطتي الحالية" />
            <View style={styles.planCenter}>
              <Text style={styles.planLabel}>التقدم نحو الهدف السنوي</Text>
              <Text style={styles.planPct}>{student.progressPct}٪</Text>
              <View style={styles.planBarWrap}>
                <ProgressBar value={student.progressPct} showPercent={false} />
              </View>
              <Text style={styles.planNote}>
                {student.progressPages} صفحة من {student.totalPages} صفحة
              </Text>
              <View style={styles.planBadge}>
                <Badge label={student.path} variant="green" />
              </View>
            </View>
            {!!student.lastMemorization && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>آخر حفظ</Text>
                <Text style={styles.infoVal}>{student.lastMemorization}</Text>
              </View>
            )}
          </Card>

          {/* Halqa info */}
          <Card style={styles.half}>
            <CardHeader title="معلومات حلقتي" />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>الحلقة</Text>
              <Text style={[styles.infoVal, { color: theme.green }]}>{getName(student.halqa)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>المسجد</Text>
              <Text style={styles.infoVal}>{getName(student.masjid)}</Text>
            </View>
          </Card>
        </View>

        {/* Recent homework */}
        <Card>
          <CardHeader title="آخر الواجبات" />
          {recentHomework.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد واجبات بعد</Text>
          ) : (
            recentHomework.map((row, i) => (
              <View key={row._id} style={[styles.hwRow, i < recentHomework.length - 1 && styles.hwBorder]}>
                <View>
                  <Text style={styles.hwSegment}>{row.segment}</Text>
                  <Text style={styles.hwDate}>{new Date(row.dueDate).toLocaleDateString('ar-SA')}</Text>
                </View>
                <View style={styles.hwBadges}>
                  {row.rating && <Badge label={row.rating} variant="gold" />}
                  <Badge label={row.status} variant={row.status === 'مراجع' ? 'green' : row.status === 'متأخر' ? 'red' : 'gray'} />
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page:  { padding: theme.pagePadding, gap: 14 },
  twoCol:{ flexDirection: 'row', gap: 12 },
  half:  { flex: 1 },
  planCenter: { alignItems: 'center', paddingVertical: 8 },
  planLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, marginBottom: 4 },
  planPct: { fontSize: 30, fontFamily: theme.fontCairoBold, color: theme.green },
  planBarWrap: { width: '100%', marginTop: 10, marginBottom: 8 },
  planNote: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  planBadge: { marginTop: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  infoKey: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  infoVal: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
  hwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  hwBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  hwSegment: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  hwDate: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },
  hwBadges: { flexDirection: 'row', gap: 6 },
  emptyText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 20 },
});
