import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { useStats } from '@/lib/queries/stats';
import { useStudents } from '@/lib/queries/students';
import { useHalqat } from '@/lib/queries/halqat';
import { theme } from '@/lib/theme';

const EXPORT_BTNS = [
  { label: 'تقرير الطلاب PDF',    variant: 'danger' },
  { label: 'تقرير الحضور Excel',  variant: 'ghost' },
  { label: 'تقرير المعلمين PDF',  variant: 'danger' },
  { label: 'تقرير الأداء Excel',  variant: 'ghost' },
  { label: 'تقرير الحلقات PDF',   variant: 'danger' },
] as const;

export default function AdminReports() {
  const statsQuery = useStats();
  const studentsQuery = useStudents();
  const halqatQuery = useHalqat();

  const isLoading = statsQuery.isLoading || studentsQuery.isLoading || halqatQuery.isLoading;
  const error = statsQuery.error || studentsQuery.error || halqatQuery.error;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={theme.green} size="large" />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <Alert variant="warning">{error.message}</Alert>
        </View>
      </SafeAreaView>
    );
  }

  const stats = statsQuery.data;
  const students = studentsQuery.data ?? [];
  const halqat = halqatQuery.data ?? [];

  const newStudents = students.filter((s) => s.status === 'new').length;
  const totalPagesMemorized = students.reduce((a, s) => a + s.progressPages, 0);

  const STATS = [
    { label: 'إجمالي الطلاب',   value: stats?.totalStudents ?? 0,               color: theme.green },
    { label: 'متوسط الحضور',     value: `${stats?.avgAttendancePct ?? 0}٪`,      color: theme.gold },
    { label: 'متوسط التقدم',     value: `${stats?.avgProgressPct ?? 0}٪`,        color: '#3B82F6' },
    { label: 'الحلقات النشطة',   value: stats?.totalHalqat ?? 0,                 color: theme.red },
  ];

  const SUMMARY = [
    { label: 'طلاب جدد',                  val: newStudents },
    { label: 'صفحات محفوظة إجمالاً',     val: totalPagesMemorized },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />

        {/* Export */}
        <Card>
          <CardHeader title="تصدير التقارير" />
          <View style={styles.exportGrid}>
            {EXPORT_BTNS.map((btn, i) => (
              <Button key={i} label={btn.label} variant={btn.variant} />
            ))}
          </View>
        </Card>

        {/* Two-column summary cards */}
        <View style={styles.twoCol}>
          <Card style={styles.half}>
            <CardHeader title="ملخص عام" />
            {SUMMARY.map((row, i) => (
              <View key={i} style={[styles.row, i < SUMMARY.length - 1 && styles.rowBorder]}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.val}>{row.val}</Text>
              </View>
            ))}
          </Card>

          <Card style={styles.half}>
            <CardHeader title="أداء الحلقات" />
            {halqat.map((h, i) => (
              <View key={h._id} style={[styles.row, i < halqat.length - 1 && styles.rowBorder]}>
                <Text style={[styles.label, { flex: 1 }]} numberOfLines={1}>{h.name}</Text>
                <Text style={[styles.val, { color: theme.green }]}>{h.attendancePct}٪ حضور</Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  exportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  twoCol: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  label: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  val: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.green },
  loadingCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
});
