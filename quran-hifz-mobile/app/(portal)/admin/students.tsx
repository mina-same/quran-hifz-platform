import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import ProgressBar from '@/components/ui/ProgressBar';
import { STUDENTS } from '@/lib/data/students';
import { theme } from '@/lib/theme';

export default function AdminStudents() {
  const active   = STUDENTS.filter((s) => s.status === 'active').length;
  const inactive = STUDENTS.filter((s) => s.status === 'inactive').length;

  const STATS = [
    { label: 'إجمالي الطلاب',   value: STUDENTS.length, color: theme.green },
    { label: 'نشطون',            value: active,           color: theme.gold },
    { label: 'غير نشطين',        value: inactive,         color: theme.red },
    { label: 'مسجلون هذا الشهر', value: '٢',             color: '#3B82F6' },
  ];

  const rows = STUDENTS.map((s) => ({
    name:       <Text style={styles.bold}>{s.name}</Text>,
    path:       <Badge label={s.path} variant="gold" />,
    halqa:      <Text style={styles.cell}>{s.halqa}</Text>,
    mosque:     <Text style={styles.cell}>{s.mosque}</Text>,
    attendance: <Text style={[styles.bold, { color: s.attendancePct >= 90 ? theme.green : theme.red }]}>{s.attendancePct}٪</Text>,
    progress: (
      <View style={{ minWidth: 80 }}>
        <Text style={[styles.cell, { fontSize: 11, marginBottom: 2 }]}>{s.progressPct}٪</Text>
        <ProgressBar value={s.progressPct} showPercent={false} />
      </View>
    ),
    guardian: <Text style={styles.cell}>{s.guardian}</Text>,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />
        <Card noPadding>
          <CardHeader title={`الطلاب (${STUDENTS.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <DataTable
            columns={[
              { key: 'name',       label: 'الاسم',    flex: 2 },
              { key: 'path',       label: 'المسار',   flex: 1 },
              { key: 'halqa',      label: 'الحلقة',   flex: 2 },
              { key: 'mosque',     label: 'المسجد',   flex: 2 },
              { key: 'attendance', label: 'الحضور',   flex: 1 },
              { key: 'progress',   label: 'التقدم',   flex: 2 },
              { key: 'guardian',   label: 'ولي الأمر', flex: 2 },
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
  cell: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
});
