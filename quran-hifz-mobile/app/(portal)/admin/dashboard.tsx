import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import ProgressBar from '@/components/ui/ProgressBar';
import HalqaCard from '@/components/domain/HalqaCard';
import { STUDENTS } from '@/lib/data/students';
import { HALQAT, KPIS, MASAJID } from '@/lib/data/halqat';
import { theme } from '@/lib/theme';

const kpiVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد' ? 'gold' : r === 'مقبول' ? 'blue' : 'red';

export default function AdminDashboard() {
  const STATS = [
    { label: 'الطلاب المسجلون', value: STUDENTS.length, color: theme.green },
    { label: 'المعلمون',         value: '٥',             color: theme.gold },
    { label: 'الحلقات',          value: HALQAT.length,   color: '#3B82F6' },
    { label: 'المساجد',          value: MASAJID.length,  color: theme.red },
  ];

  const kpiRows = KPIS.slice(0, 4).map((k) => ({
    indicator: <Text style={styles.bold}>{k.indicator}</Text>,
    target:    <Text style={styles.cell}>{k.target}</Text>,
    actual:    <Text style={styles.cell}>{k.actual}</Text>,
    rating:    <Badge label={k.rating} variant={kpiVariant(k.rating) as any} />,
  }));

  const recentRows = STUDENTS.slice(0, 5).map((s) => ({
    name:     <Text style={styles.bold}>{s.name}</Text>,
    path:     <Badge label={s.path} variant="gold" />,
    halqa:    <Text style={styles.cell}>{s.halqa}</Text>,
    mosque:   <Text style={styles.cell}>{s.mosque}</Text>,
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
        {HALQAT.slice(0, 2).map((h) => (
          <HalqaCard key={h.id} halqa={h} />
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
});
