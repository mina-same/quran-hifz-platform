import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import HalqaCard from '@/components/domain/HalqaCard';
import { useStats } from '@/lib/queries/stats';
import { useHalqat } from '@/lib/queries/halqat';
import { useKpis } from '@/lib/queries/kpis';
import { useStudents, type Student } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const kpiVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد' ? 'gold' : r === 'مقبول' ? 'blue' : 'red';

function nameOf(v: { name: string } | string | undefined): string {
  if (v && typeof v === 'object') return v.name;
  if (typeof v === 'string') return v;
  return '—';
}

/** المسار: real track lives one hop away via halqa.specialTrack, not the unused legacy `path` enum — same fallback chain as admin/students.tsx. */
function trackLabel(s: Student): string | null {
  const halqa = typeof s.halqa === 'object' ? s.halqa : null;
  const track = halqa?.specialTrack;
  if (track && typeof track === 'object' && track.title) return track.title;
  if (s.path) return s.path;
  return null;
}

export default function AdminDashboard() {
  const theme = useAppTheme();
  const stats = useStats();
  const halqatQuery = useHalqat();
  const kpisQuery = useKpis();
  const studentsQuery = useStudents();

  const isLoading = stats.isLoading || halqatQuery.isLoading || kpisQuery.isLoading || studentsQuery.isLoading;
  const isRefreshing = stats.isRefetching || halqatQuery.isRefetching || kpisQuery.isRefetching || studentsQuery.isRefetching;
  const onRefresh = () => {
    stats.refetch();
    halqatQuery.refetch();
    kpisQuery.refetch();
    studentsQuery.refetch();
  };

  const halqat = halqatQuery.data ?? [];
  const kpis = kpisQuery.data ?? [];
  const students = studentsQuery.data ?? [];

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1 },
    cell: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    progressWrap: { gap: 4 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
  }), [theme]);

  const STATS = stats.data ? [
    { label: 'الطلاب المسجلون', value: stats.data.totalStudents, color: theme.green },
    { label: 'المعلمون',         value: stats.data.totalTeachers, color: theme.gold },
    { label: 'الحلقات',          value: stats.data.totalHalqat,   color: theme.blue },
    { label: 'المساجد',          value: stats.data.totalMasajid,  color: theme.red },
  ] : [];

  const topKpis = kpis.slice(0, 4);
  const recentStudents = students.slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />}
      >
        <AyahBar />
        {isLoading ? <SkeletonRows count={1} rowHeight={70} /> : <StatsRow stats={STATS} />}

        {/* Halqat overview (first 2) */}
        {!isLoading && halqat.slice(0, 2).map((h) => (
          <HalqaCard key={h._id} halqa={h} />
        ))}

        {/* KPIs */}
        <Card noPadding>
          <CardHeader title="مؤشرات الأداء" style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={3} />}
            {!isLoading && topKpis.length === 0 && <Text style={styles.muted}>لا توجد مؤشرات أداء بعد</Text>}
            {topKpis.map((k, i) => (
              <View key={k._id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.bold} numberOfLines={2}>{k.indicator}</Text>
                  <Badge label={k.rating} variant={kpiVariant(k.rating) as any} />
                </View>
                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>المستهدف: {k.target}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>الفعلي: {k.actual}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Recent registrations */}
        <Card noPadding>
          <CardHeader title="آخر التسجيلات" style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={3} rowHeight={80} />}
            {!isLoading && recentStudents.length === 0 && <Text style={styles.muted}>لا يوجد طلاب مسجلون بعد</Text>}
            {recentStudents.map((s, i) => {
              const track = trackLabel(s);
              return (
                <View key={s._id} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <View style={styles.rowHead}>
                    <Text style={styles.bold} numberOfLines={1}>{s.name}</Text>
                    {track ? <Badge label={track} variant="gold" /> : <Text style={styles.cell}>—</Text>}
                  </View>
                  <View style={styles.infoGrid}>
                    <Text style={styles.infoItem}>الحلقة: {nameOf(s.halqa)}</Text>
                    <Text style={styles.infoItem}>·</Text>
                    <Text style={styles.infoItem}>المسجد: {nameOf(s.masjid)}</Text>
                  </View>
                  <View style={styles.progressWrap}>
                    <Text style={styles.cell}>التقدم {s.progressPct}٪</Text>
                    <ProgressBar value={s.progressPct} showPercent={false} />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
