import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { useSelectedChild } from '@/components/domain/useSelectedChild';
import { useChildAttendance } from '@/lib/queries/parent';
import { theme } from '@/lib/theme';

export default function ParentAttendance() {
  const { selectedChildId, activeChild, hasNoChildren } = useSelectedChild();
  const { data: records, isLoading } = useChildAttendance(selectedChildId ?? undefined);

  if (!selectedChildId) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <View style={s.loading}>
          {hasNoChildren ? (
            <Text style={s.emptyText}>لم يتم اختيار طالب</Text>
          ) : (
            <ActivityIndicator color={theme.green} size="large" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const present = records?.filter((r) => r.status === 'حاضر').length ?? 0;
  const late = records?.filter((r) => r.status === 'متأخر').length ?? 0;
  const absent = records?.filter((r) => r.status === 'غائب').length ?? 0;
  const total = records?.length ?? 0;
  const attendPct = total ? Math.round((present / total) * 100) : activeChild?.attendancePct ?? 0;

  const STATS = [
    { label: 'نسبة الحضور', value: `${attendPct}٪`, color: theme.green },
    { label: 'جلسة حضرها', value: String(present), color: theme.gold },
    { label: 'تأخر', value: String(late), color: theme.blue },
    { label: 'غائب', value: String(absent), color: theme.red },
  ];

  const rows = (records ?? []).map((r) => ({
    date: <Text style={s.cell}>{new Date(r.date).toLocaleDateString('ar-SA')}</Text>,
    day: <Text style={s.cell}>{r.day}</Text>,
    time: <Text style={s.cell}>{r.time}</Text>,
    status: (
      <Badge
        label={r.status}
        variant={r.status === 'حاضر' ? 'green' : r.status === 'متأخر' ? 'gold' : 'red'}
      />
    ),
  }));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />

        <Card noPadding>
          <CardHeader title="سجل الحضور" style={{ padding: 16, paddingBottom: 8 }} />
          {isLoading ? (
            <View style={s.inlineLoading}>
              <ActivityIndicator color={theme.green} />
            </View>
          ) : (
            <DataTable
              columns={[
                { key: 'date', label: 'التاريخ' },
                { key: 'day', label: 'اليوم' },
                { key: 'time', label: 'الوقت' },
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 16, gap: 14 },
  loading: { paddingVertical: 60, alignItems: 'center' },
  inlineLoading: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
  cell: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text },
});
