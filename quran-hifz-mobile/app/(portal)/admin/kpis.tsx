import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useKpis } from '@/lib/queries/kpis';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const ratingVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد' ? 'gold' : r === 'مقبول' ? 'blue' : 'red';

export default function AdminKpis() {
  const theme = useAppTheme();
  const { data: kpis = [], isLoading, isRefetching, refetch } = useKpis();

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    bold: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
  }), [theme]);

  const excellent = kpis.filter((k) => k.rating === 'ممتاز').length;
  const good      = kpis.filter((k) => k.rating === 'جيد').length;
  const poor      = kpis.filter((k) => k.rating === 'ضعيف').length;

  const STATS = [
    { label: 'إجمالي المؤشرات', value: kpis.length,    color: theme.green },
    { label: 'ممتاز',            value: excellent,       color: theme.gold },
    { label: 'جيد',              value: good,            color: theme.blue },
    { label: 'يحتاج تحسين',     value: poor,            color: theme.red },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.green]} tintColor={theme.green} />}
      >
        {!isLoading && <StatsRow stats={STATS} />}
        <Card noPadding>
          <CardHeader title="مؤشرات الأداء الرئيسية (KPIs)" style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && kpis.length === 0 && <Text style={styles.muted}>لا توجد مؤشرات أداء مسجلة بعد</Text>}
            {kpis.map((k, i) => (
              <View key={k._id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.bold} numberOfLines={2}>{k.indicator}</Text>
                  <Badge label={k.rating} variant={ratingVariant(k.rating) as any} />
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
      </ScrollView>
    </SafeAreaView>
  );
}
