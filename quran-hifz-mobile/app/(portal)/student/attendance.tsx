import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import Alert from '@/components/ui/Alert';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAttendance } from '@/lib/queries/attendance';
import { useStudent } from '@/lib/queries/students';
import { theme } from '@/lib/theme';

export default function StudentAttendance() {
  const authUser = usePortalStore((s) => s.authUser);
  const studentId = authUser?.profileId;

  const { data: records = [], isLoading: attendanceLoading, isError: attendanceError } = useAttendance({ student: studentId });
  const { data: student, isLoading: studentLoading } = useStudent(studentId);

  const isLoading = attendanceLoading || studentLoading;

  const present = records.filter((r) => r.status === 'حاضر').length;
  const absent  = records.filter((r) => r.status === 'غائب').length;
  const late    = records.filter((r) => r.status === 'متأخر').length;

  const STATS = [
    { label: 'نسبة الحضور', value: `${student?.attendancePct ?? 0}٪`, color: theme.green },
    { label: 'حضور',        value: present,                            color: theme.gold },
    { label: 'غياب',        value: absent,                             color: theme.red },
    { label: 'تأخير',       value: late,                               color: '#3B82F6' },
  ];

  const statusBadge = (s: string) => {
    if (s === 'حاضر') return <Badge label={s} variant="green" />;
    if (s === 'غائب') return <Badge label={s} variant="red" />;
    return <Badge label={s} variant="gold" />;
  };

  const rows = records.map((r) => ({
    date:   <Text style={styles.cell}>{new Date(r.date).toLocaleDateString('ar-SA')}</Text>,
    day:    <Text style={styles.cell}>{r.day}</Text>,
    time:   <Text style={styles.cell}>{r.time || '—'}</Text>,
    status: statusBadge(r.status),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />

        {attendanceError && <Alert variant="error">تعذر تحميل سجل الحضور</Alert>}

        <Card noPadding>
          <CardHeader title="سجل الحضور" style={{ padding: 16, paddingBottom: 8 }} />
          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.green} size="large" />
            </View>
          ) : (
            <DataTable
              columns={[
                { key: 'date',   label: 'التاريخ' },
                { key: 'day',    label: 'اليوم' },
                { key: 'time',   label: 'الوقت' },
                { key: 'status', label: 'الحالة' },
              ]}
              rows={rows}
              emptyMessage="لا توجد سجلات حضور بعد"
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
  loading: { paddingVertical: 40, alignItems: 'center' },
  cell: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text },
});
