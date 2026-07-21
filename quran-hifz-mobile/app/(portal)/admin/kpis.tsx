import { useMemo } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { KPIS } from '@/lib/data/halqat';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const ratingVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد' ? 'gold' : r === 'مقبول' ? 'blue' : 'red';

export default function AdminKpis() {
  const theme = useAppTheme();
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  }), [theme]);

  const excellent = KPIS.filter((k) => k.rating === 'ممتاز').length;
  const good      = KPIS.filter((k) => k.rating === 'جيد').length;
  const poor      = KPIS.filter((k) => k.rating === 'ضعيف').length;

  const STATS = [
    { label: 'إجمالي المؤشرات', value: KPIS.length,    color: theme.green },
    { label: 'ممتاز',            value: excellent,       color: theme.gold },
    { label: 'جيد',              value: good,            color: '#3B82F6' },
    { label: 'يحتاج تحسين',     value: poor,            color: theme.red },
  ];

  const rows = KPIS.map((k) => ({
    indicator: <Text style={styles.bold}>{k.indicator}</Text>,
    target:    <Text style={styles.muted}>{k.target}</Text>,
    actual:    <Text style={styles.bold}>{k.actual}</Text>,
    rating:    <Badge label={k.rating} variant={ratingVariant(k.rating) as any} />,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <StatsRow stats={STATS} />
        <Card noPadding>
          <CardHeader title="مؤشرات الأداء الرئيسية (KPIs)" style={{ padding: 16, paddingBottom: 8 }} />
          <DataTable
            columns={[
              { key: 'indicator', label: 'المؤشر',    flex: 3 },
              { key: 'target',    label: 'المستهدف',  flex: 1 },
              { key: 'actual',    label: 'الفعلي',    flex: 1 },
              { key: 'rating',    label: 'التقييم',   flex: 1 },
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
  bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
});
