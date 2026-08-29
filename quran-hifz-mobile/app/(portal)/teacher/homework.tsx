import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormSelect from '@/components/forms/FormSelect';
import { useHomework, useGradeHomework } from '@/lib/queries/homework';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { AR_LOCALE } from '@/lib/date';

function getName(v: { name: string } | string | undefined): string {
  if (!v) return '—';
  return typeof v === 'object' ? v.name : v;
}
function getTitle(v: { title: string } | string | undefined): string {
  if (!v) return '—';
  return typeof v === 'object' ? v.title : v;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = { 'مراجع': 'green', 'معلق': 'gold', 'متأخر': 'red' };
const RATING_OPTS = [
  { value: 'ممتاز', label: 'ممتاز' },
  { value: 'جيد جداً', label: 'جيد جداً' },
  { value: 'جيد', label: 'جيد' },
  { value: 'مقبول', label: 'مقبول' },
];

export default function TeacherHomework() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: homework = [], isLoading, refetch, isRefetching } = useHomework({ teacher: profileId });
  const gradeHW = useGradeHomework();

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    empty: { textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13, paddingVertical: 24 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <Card noPadding>
          <CardHeader title={`واجبات الطلاب (${homework.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && homework.length === 0 && <Text style={styles.empty}>لا توجد واجبات بعد</Text>}

            {!isLoading && homework.map((h, i) => (
              <View key={h._id} style={[styles.row, i < homework.length - 1 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.name} numberOfLines={1}>{getName(h.student)}</Text>
                  <Badge label={h.status} variant={STATUS_VARIANT[h.status] ?? 'gray'} />
                </View>

                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>{h.type}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>{h.segment}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>{h.specialTrack ? `مسار: ${getTitle(h.specialTrack)}` : getName(h.halqa)}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>{h.dueDate ? new Date(h.dueDate).toLocaleDateString(AR_LOCALE) : '—'}</Text>
                </View>

                <FormSelect
                  value={h.rating ?? ''}
                  onChange={(v) => gradeHW.mutate({ id: h._id, rating: v, status: 'مراجع' })}
                  options={RATING_OPTS}
                  placeholder="اختر التقييم"
                />
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
