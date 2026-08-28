import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useTeachers } from '@/lib/queries/teachers';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const ratingVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد جداً' ? 'gold' : r === 'جيد' ? 'blue' : 'gray';

export default function AdminTeachers() {
  const theme = useAppTheme();
  const { data: teachers = [], isLoading, isRefetching, refetch } = useTeachers();

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    rowFoot: { flexDirection: 'row', alignItems: 'center' },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.green]} tintColor={theme.green} />}
      >
        <Card noPadding>
          <CardHeader title={`المعلمون (${teachers.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && teachers.length === 0 && <Text style={styles.muted}>لا يوجد معلمون مسجلون بعد</Text>}
            {teachers.map((t, i) => (
              <View key={t._id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.name} numberOfLines={1}>{t.name}</Text>
                  <Badge label={t.status === 'active' ? 'نشط' : 'غير نشط'} variant={t.status === 'active' ? 'green' : 'gray'} />
                </View>
                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>التخصص: {t.specialty}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>الحلقات: {t.halqatCount ?? 0}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>الطلاب: {t.studentCount ?? 0}</Text>
                </View>
                <View style={styles.rowFoot}>
                  <Badge label={t.rating} variant={ratingVariant(t.rating) as any} />
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
