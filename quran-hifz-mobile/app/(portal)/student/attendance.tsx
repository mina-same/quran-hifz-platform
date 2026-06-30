import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconCalendarCheck, IconCircleCheck, IconCircleX, IconClock,
} from '@tabler/icons-react-native';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { MY_ATTENDANCE } from '@/lib/data/students';
import { theme } from '@/lib/theme';

export default function StudentAttendance() {
  const present = MY_ATTENDANCE.filter((r) => r.status === 'حاضر').length;
  const absent  = MY_ATTENDANCE.filter((r) => r.status === 'غائب').length;
  const pct     = Math.round((present / MY_ATTENDANCE.length) * 100);

  const STATS = [
    { label: 'إجمالي الجلسات', value: MY_ATTENDANCE.length, color: theme.green },
    { label: 'حضور',            value: present,              color: theme.gold },
    { label: 'غياب',            value: absent,               color: theme.red },
    { label: 'نسبة الحضور',     value: `${pct}٪`,           color: '#3B82F6' },
  ];

  const statusBadge = (s: string) => {
    if (s === 'حاضر') return <Badge label={s} variant="green" />;
    if (s === 'غائب') return <Badge label={s} variant="red" />;
    return <Badge label={s} variant="gold" />;
  };

  const rows = MY_ATTENDANCE.map((r) => ({
    date:   <Text style={styles.cell}>{r.date}</Text>,
    day:    <Text style={styles.cell}>{r.day}</Text>,
    time:   <Text style={styles.cell}>{r.time}</Text>,
    status: statusBadge(r.status),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />
        <Card noPadding>
          <CardHeader title="سجل الحضور" style={{ padding: 16, paddingBottom: 8 }} />
          <DataTable
            columns={[
              { key: 'date',   label: 'التاريخ' },
              { key: 'day',    label: 'اليوم' },
              { key: 'time',   label: 'الوقت' },
              { key: 'status', label: 'الحالة' },
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
  cell: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text },
});
