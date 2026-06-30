import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import ProgressBar from '@/components/ui/ProgressBar';
import { STUDENTS } from '@/lib/data/students';
import { theme } from '@/lib/theme';

const STATS = [
  { label: 'إجمالي الطلاب',    value: '١٢', color: theme.green },
  { label: 'حضور اليوم',        value: '١٠', color: theme.gold },
  { label: 'واجبات معلقة',      value: '٣',  color: '#3B82F6' },
  { label: 'جلسات هذا الأسبوع', value: '٣',  color: theme.red },
];

export default function TeacherDashboard() {
  const hwVariant = (s: string) =>
    s === 'submitted' ? 'green' : s === 'late' ? 'red' : 'gold';
  const hwLabel = (s: string) =>
    s === 'submitted' ? 'مُسلَّم' : s === 'late' ? 'متأخر' : 'معلق';

  const rows = STUDENTS.slice(0, 5).map((s) => ({
    name:       <Text style={styles.bold}>{s.name}</Text>,
    last:       <Text style={styles.muted}>{s.lastMemorization}</Text>,
    hw:         <Badge label={hwLabel(s.homeworkStatus)} variant={hwVariant(s.homeworkStatus) as any} />,
    attendance: <Text style={[styles.bold, { color: s.attendancePct >= 90 ? theme.green : theme.red }]}>{s.attendancePct}٪</Text>,
    progress:   (
      <View style={{ minWidth: 80 }}>
        <Text style={[styles.muted, { fontSize: 11, marginBottom: 2 }]}>{s.progressPct}٪</Text>
        <ProgressBar value={s.progressPct} showPercent={false} />
      </View>
    ),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AyahBar />
        <StatsRow stats={STATS} />

        {/* Today's session */}
        <Card>
          <CardHeader title="جلسة اليوم" />
          <View style={styles.grid}>
            {[
              ['الحلقة',             'حلقة عمر بن الخطاب'],
              ['الوقت',              '٥:٠٠ م — ٦:٣٠ م'],
              ['المسجد',             'مسجد الفاروق'],
              ['الطلاب المتوقعون',   '١٢ طالب'],
            ].map(([k, v]) => (
              <View key={k} style={styles.gridItem}>
                <Text style={styles.gridLabel}>{k}</Text>
                <Text style={styles.gridValue}>{v}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Students table */}
        <Card noPadding>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <CardHeader title="طلابي" />
          </View>
          <DataTable
            columns={[
              { key: 'name',       label: 'الطالب',  flex: 2 },
              { key: 'last',       label: 'آخر حفظ', flex: 2 },
              { key: 'hw',         label: 'الواجب',  flex: 1 },
              { key: 'attendance', label: 'الحضور',  flex: 1 },
              { key: 'progress',   label: 'التقدم',  flex: 2 },
            ]}
            rows={rows}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '46%', gap: 4 },
  gridLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  gridValue: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
});
