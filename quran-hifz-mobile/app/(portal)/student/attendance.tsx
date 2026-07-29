import { useMemo } from 'react';
import { ScrollView, View, Text, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useAttendance } from '@/lib/queries/attendance';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export default function StudentAttendance() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: records = [], isLoading, isRefetching, refetch } = useAttendance({ student: profileId });

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
  const pct = records.length > 0 ? Math.round((present / records.length) * 100) : 0;

  const STATS = [
    { label: 'إجمالي الجلسات', value: records.length, color: theme.green },
    { label: 'حضور', value: present, color: theme.gold },
    { label: 'غياب', value: absent, color: theme.red },
    { label: 'نسبة الحضور', value: `${pct}٪`, color: theme.blue },
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
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.green]} tintColor={theme.green} />
        }
      >
        <StatsRow stats={STATS} />
        <Card noPadding>
          <CardHeader title="سجل الحضور" style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && records.length === 0 && <Text style={styles.empty}>لا توجد سجلات حضور بعد</Text>}

            {!isLoading && records.map((r, i) => (
              <View key={r._id} style={[styles.row, i < records.length - 1 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.name}>{new Date(r.date).toLocaleDateString('ar-SA')}</Text>
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
