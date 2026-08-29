import { useMemo } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useAttendance } from '@/lib/queries/attendance';
import { useStudent } from '@/lib/queries/students';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { AR_LOCALE } from '@/lib/date';

export default function StudentAttendance() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: records = [], isLoading, isRefetching, refetch } = useAttendance({ student: profileId });
  const { data: student } = useStudent(profileId);

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    empty: { textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13, paddingVertical: 24 },
  }), [theme]);

  const present = records.filter((r) => r.status === 'حاضر').length;
  const absent = records.filter((r) => r.status === 'غائب').length;
  const late = records.filter((r) => r.status === 'متأخر').length;
  // Prefer the server's own figure (it spans the whole enrolment, not just the
  // records fetched here) and fall back to the local ratio.
  const pct = student?.attendancePct ?? (records.length > 0 ? Math.round((present / records.length) * 100) : 0);

  const STATS = [
    { label: 'نسبة حضوري', value: `${pct}٪`, color: theme.green },
    { label: 'جلسة حضرتها', value: present, color: theme.gold },
    { label: 'غيابات', value: absent, color: theme.red },
    { label: 'تأخيرات', value: late, color: theme.blue },
  ];

  const statusBadge = (s: string) => {
    if (s === 'حاضر') return <Badge label={s} variant="green" />;
    if (s === 'غائب') return <Badge label={s} variant="red" />;
    return <Badge label={s} variant="gold" />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />
        }
      >
        <StatsRow stats={STATS} />
        <Card noPadding>
          <CardHeader title="سجل حضوري" style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && records.length === 0 && <Text style={styles.empty}>لا توجد سجلات حضور بعد</Text>}

            {!isLoading && records.map((r, i) => (
              <View key={r._id} style={[styles.row, i < records.length - 1 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.name}>{new Date(r.date).toLocaleDateString(AR_LOCALE)}</Text>
                  {statusBadge(r.status)}
                </View>
                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>اليوم: {r.day}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>الوقت: {r.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
