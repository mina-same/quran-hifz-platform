import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import ProgressBar from '@/components/ui/ProgressBar';
import Alert from '@/components/ui/Alert';
import HalqaCard from '@/components/domain/HalqaCard';
import { useStats } from '@/lib/queries/stats';
import { useHalqat, type Halqa as HalqaAPI } from '@/lib/queries/halqat';
import { useKpis } from '@/lib/queries/kpis';
import { useStudents } from '@/lib/queries/students';
import type { Halqa as LocalHalqa } from '@/lib/types/halqa';
import { theme } from '@/lib/theme';

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return '';
}

function toCardHalqa(h: HalqaAPI): LocalHalqa {
  return {
    id: h._id,
    name: h.name,
    teacher: getName(h.teacher),
    mosque: getName(h.masjid),
    days: h.days,
    time: h.time,
    studentCount: h.studentCount ?? 0,
    capacity: h.capacity,
    attendancePct: h.attendancePct,
    completionPct: h.completionPct,
  };
}

const kpiVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد' ? 'gold' : r === 'مقبول' ? 'blue' : 'red';

export default function AdminDashboard() {
  const statsQuery = useStats();
  const halqatQuery = useHalqat();
  const kpisQuery = useKpis();
  const studentsQuery = useStudents();

  const isLoading =
    statsQuery.isLoading || halqatQuery.isLoading || kpisQuery.isLoading || studentsQuery.isLoading;
  const error = statsQuery.error || halqatQuery.error || kpisQuery.error || studentsQuery.error;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={theme.green} size="large" />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <Alert variant="warning">{error.message}</Alert>
        </View>
      </SafeAreaView>
    );
  }

  const stats = statsQuery.data;
  const halqat = halqatQuery.data ?? [];
  const kpis = kpisQuery.data ?? [];
  const students = studentsQuery.data ?? [];

  const STATS = [
    { label: 'الطلاب المسجلون', value: stats?.totalStudents ?? 0, color: theme.green },
    { label: 'المعلمون',         value: stats?.totalTeachers ?? 0, color: theme.gold },
    { label: 'الحلقات',          value: stats?.totalHalqat ?? 0,   color: '#3B82F6' },
    { label: 'المساجد',          value: stats?.totalMasajid ?? 0,  color: theme.red },
  ];

  const kpiRows = kpis.slice(0, 4).map((k) => ({
    indicator: <Text style={styles.bold}>{k.indicator}</Text>,
    target:    <Text style={styles.cell}>{k.target}</Text>,
    actual:    <Text style={styles.cell}>{k.actual}</Text>,
    rating:    <Badge label={k.rating} variant={kpiVariant(k.rating) as any} />,
  }));

  const recentRows = students.slice(0, 5).map((s) => ({
    name:     <Text style={styles.bold}>{s.name}</Text>,
    path:     <Badge label={s.path} variant="gold" />,
    halqa:    <Text style={styles.cell}>{getName(s.halqa)}</Text>,
    mosque:   <Text style={styles.cell}>{getName(s.masjid)}</Text>,
    progress: (
      <View style={{ minWidth: 80 }}>
        <Text style={[styles.cell, { fontSize: 11, marginBottom: 2 }]}>{s.progressPct}٪</Text>
        <ProgressBar value={s.progressPct} showPercent={false} />
      </View>
    ),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AyahBar />
        <StatsRow stats={STATS} />

        {/* Halqat overview (first 2) */}
        {halqat.slice(0, 2).map((h) => (
          <HalqaCard key={h._id} halqa={toCardHalqa(h)} />
        ))}

        {/* KPIs */}
        <Card noPadding>
          <CardHeader title="مؤشرات الأداء" style={{ padding: 16, paddingBottom: 8 }} />
          <DataTable
            columns={[
              { key: 'indicator', label: 'المؤشر',    flex: 2 },
              { key: 'target',    label: 'المستهدف',  flex: 1 },
              { key: 'actual',    label: 'الفعلي',    flex: 1 },
              { key: 'rating',    label: 'التقييم',   flex: 1 },
            ]}
            rows={kpiRows}
          />
        </Card>

        {/* Recent registrations */}
        <Card noPadding>
          <CardHeader title="آخر التسجيلات" style={{ padding: 16, paddingBottom: 8 }} />
          <DataTable
            columns={[
              { key: 'name',     label: 'الاسم',   flex: 2 },
              { key: 'path',     label: 'المسار',  flex: 1 },
              { key: 'halqa',    label: 'الحلقة',  flex: 2 },
              { key: 'mosque',   label: 'المسجد',  flex: 2 },
              { key: 'progress', label: 'التقدم',  flex: 2 },
            ]}
            rows={recentRows}
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
  loadingCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
});
