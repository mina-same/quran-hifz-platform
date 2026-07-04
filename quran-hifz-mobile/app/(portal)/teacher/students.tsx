import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import ProgressBar from '@/components/ui/ProgressBar';
import { STUDENTS } from '@/lib/data/students';
import { theme } from '@/lib/theme';

const hwVariant = (s: string) =>
  s === 'submitted' ? 'green' : s === 'late' ? 'red' : 'gold';
const hwLabel = (s: string) =>
  s === 'submitted' ? 'مُسلَّم' : s === 'late' ? 'متأخر' : 'معلق';

export default function TeacherStudents() {
  const rows = STUDENTS.map((s) => ({
    name:       <Text style={styles.bold}>{s.name}</Text>,
    halqa:      <Text style={styles.muted}>{s.halqa}</Text>,
    last:       <Text style={styles.muted}>{s.lastMemorization}</Text>,
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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Card noPadding>
          <CardHeader title={`الطلاب (${STUDENTS.length})`} style={{ padding: 16, paddingBottom: 8 }} />
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
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
});
