import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { useParentChildren, useChildAttendance } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export default function ParentAttendance() {
  const theme = useAppTheme();
  const selectedChildId = usePortalStore((s) => s.selectedChildId);
  const { data: children = [] } = useParentChildren();
  const childId = selectedChildId ?? children[0]?._id;

  const { data: records = [], isLoading } = useChildAttendance(childId);

  const present = records.filter((r) => r.status === 'حاضر').length;
  const absent = records.filter((r) => r.status === 'غائب').length;
  const pct = records.length > 0 ? Math.round((present / records.length) * 100) : 0;

  const STATS = [
    { label: 'نسبة الحضور', value: `${pct}٪`, color: theme.green },
    { label: 'جلسة حضرها', value: present, color: theme.gold },
    { label: 'غياب', value: absent, color: theme.red },
  ];

  const statusVariant = (status: string): 'green' | 'gold' | 'red' =>
    status === 'حاضر' ? 'green' : status === 'متأخر' ? 'gold' : 'red';

  const s = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 16, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    border: { borderTopWidth: 1, borderTopColor: theme.border },
    left: { flex: 1 },
    date: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    note: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, marginTop: 2 },
  }), [theme]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />
        <Card>
          <CardHeader title="سجل الحضور" />
          {isLoading && <Text style={s.muted}>جارٍ التحميل...</Text>}
          {!isLoading && records.length === 0 && <Text style={s.muted}>لا توجد سجلات حضور</Text>}
          {records.map((r, i) => (
            <View key={r._id} style={[s.row, i > 0 && s.border]}>
              <View style={s.left}>
                <Text style={s.date}>{new Date(r.date).toLocaleDateString('ar-SA')} — {r.day}</Text>
                <Text style={s.note}>{r.time}</Text>
              </View>
              <Badge label={r.status} variant={statusVariant(r.status)} />
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
