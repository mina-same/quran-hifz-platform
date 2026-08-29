import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useParentChildren, useChildAttendance } from '@/lib/queries/parent';
import { useEvaluations } from '@/lib/queries/evaluations';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { AR_LOCALE } from '@/lib/date';

export default function ParentAttendance() {
  const theme = useAppTheme();
  const selectedChildId = usePortalStore((s) => s.selectedChildId);
  const { data: children = [] } = useParentChildren();
  const childId = selectedChildId ?? children[0]?._id;

  const { data: records = [], isLoading, isRefetching, refetch } = useChildAttendance(childId);
  const { data: evaluations = [] } = useEvaluations(childId ? { student: childId } : undefined);

  // The evaluation for a session is keyed by its calendar day, exactly as the
  // web joins the two lists — there is no attendance→evaluation link on the API.
  const evalByDate = new Map(evaluations.map((e) => [new Date(e.date).toDateString(), e]));

  const present = records.filter((r) => r.status === 'حاضر').length;
  const late = records.filter((r) => r.status === 'متأخر').length;
  const absent = records.filter((r) => r.status === 'غائب').length;
  const pct = records.length > 0 ? Math.round((present / records.length) * 100) : 0;

  const STATS = [
    { label: 'نسبة الحضور', value: `${pct}٪`, color: theme.green },
    { label: 'جلسة حضرها', value: present, color: theme.gold },
    { label: 'تأخر', value: late, color: theme.blue },
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
    right: { alignItems: 'flex-end', gap: 4 },
    score: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
  }), [theme]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.spinner} colors={[theme.spinner]} />
        }
      >
        <StatsRow stats={STATS} />
        <Card>
          <CardHeader title="سجل الحضور" />
          {isLoading && <SkeletonRows count={4} rowHeight={48} />}
          {!isLoading && records.length === 0 && <Text style={s.muted}>لا توجد سجلات حضور</Text>}
          {records.map((r, i) => {
            const evalForDay = evalByDate.get(new Date(r.date).toDateString());
            return (
              <View key={r._id} style={[s.row, i > 0 && s.border]}>
                <View style={s.left}>
                  <Text style={s.date}>{new Date(r.date).toLocaleDateString(AR_LOCALE)} — {r.day}</Text>
                  <Text style={s.note}>{r.time}</Text>
                </View>
                <View style={s.right}>
                  <Badge label={r.status} variant={statusVariant(r.status)} />
                  {!!evalForDay && <Text style={s.score}>التقييم {evalForDay.total}/10</Text>}
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
