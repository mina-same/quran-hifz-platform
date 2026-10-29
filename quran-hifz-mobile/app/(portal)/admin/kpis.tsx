import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { IconDownload } from '@tabler/icons-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useKpis, KPI_STATUS } from '@/lib/queries/kpis';
import ProgressBar from '@/components/ui/ProgressBar';
import { shareCsv } from '@/lib/csv';
import { useAppTheme } from '@/lib/hooks/useAppTheme';


export default function AdminKpis() {
  const theme = useAppTheme();
  const { data: kpis = [], isLoading, isError, isRefetching, refetch } = useKpis();

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
    exportBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 11,
    },
    exportBtnDisabled: { opacity: 0.5 },
    error: { fontSize: 13, color: theme.red, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
    exportText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.green },
  }), [theme]);

  const STATS = [
    { label: 'محقق',           value: kpis.filter((k) => k.status === 'achieved').length, color: theme.green },
    { label: 'قريب من الهدف',  value: kpis.filter((k) => k.status === 'near').length,     color: theme.gold },
    { label: 'دون الهدف',      value: kpis.filter((k) => k.status === 'below').length,    color: theme.red },
    { label: 'إجمالي المؤشرات', value: kpis.length,                                        color: theme.blue },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        {!isLoading && <StatsRow stats={STATS} />}

        <Pressable
          style={[styles.exportBtn, kpis.length === 0 && styles.exportBtnDisabled]}
          disabled={kpis.length === 0}
          onPress={() =>
            shareCsv(
              'تقرير مؤشرات الأداء',
              ['المؤشر', 'المستهدف', 'الفعلي', 'التقييم'],
              kpis.map((k) => [k.indicator, k.target, k.actual, KPI_STATUS[k.status].label]),
            )
          }
        >
          <IconDownload size={16} color={kpis.length === 0 ? theme.textMuted : theme.green} />
          <Text style={[styles.exportText, kpis.length === 0 && { color: theme.textMuted }]}>تصدير</Text>
        </Pressable>
        <Card noPadding>
          <CardHeader title="المؤشرات السنوية" style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {isError && <Text style={styles.error}>تعذّر تحميل المؤشرات</Text>}
            {!isLoading && kpis.length === 0 && <Text style={styles.muted}>لا توجد مؤشرات أداء مسجلة بعد</Text>}
            {kpis.map((k, i) => (
              <View key={k._id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.bold} numberOfLines={2}>{k.indicator}</Text>
                  <Badge label={KPI_STATUS[k.status].label} variant={KPI_STATUS[k.status].variant} />
                </View>
                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>الفعلي: {k.actual}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>المستهدف: {k.target}</Text>
                </View>
                <ProgressBar value={k.progress} showPercent={false} />
                <Text style={styles.infoItem}>{k.hint}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
