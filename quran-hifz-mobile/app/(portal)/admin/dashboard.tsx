import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import HalqaCard from '@/components/domain/HalqaCard';
import { STUDENTS } from '@/lib/data/students';
import { HALQAT, KPIS, MASAJID } from '@/lib/data/halqat';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const kpiVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد' ? 'gold' : r === 'مقبول' ? 'blue' : 'red';

export default function AdminDashboard() {
  const theme = useAppTheme();
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
  }), [theme]);

  const STATS = [
    { label: 'الطلاب المسجلون', value: STUDENTS.length, color: theme.green },
    { label: 'المعلمون',         value: '٥',             color: theme.gold },
    { label: 'الحلقات',          value: HALQAT.length,   color: theme.blue },
    { label: 'المساجد',          value: MASAJID.length,  color: theme.red },
  ];

  const topKpis = KPIS.slice(0, 4);
  const recentStudents = STUDENTS.slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {topKpis.map((k, i) => (
              <View key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
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
            {recentStudents.map((s, i) => (
              <View key={s.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.bold} numberOfLines={1}>{s.name}</Text>
                  <Badge label={s.path} variant="gold" />
                </View>
                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>الحلقة: {s.halqa}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>المسجد: {s.mosque}</Text>
                </View>
                <View style={styles.progressWrap}>
                  <Text style={styles.cell}>التقدم {s.progressPct}٪</Text>
                  <ProgressBar value={s.progressPct} showPercent={false} />
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
