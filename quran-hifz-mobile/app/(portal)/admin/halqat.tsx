import { useMemo } from 'react';
import { ScrollView, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HalqaCard from '@/components/domain/HalqaCard';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useHalqat } from '@/lib/queries/halqat';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export default function AdminHalqat() {
  const theme = useAppTheme();
  const { data: halqat = [], isLoading, isRefetching, refetch } = useHalqat();

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.green]} tintColor={theme.green} />}
      >
        {isLoading && <SkeletonRows count={4} rowHeight={180} />}
        {!isLoading && halqat.length === 0 && <Text style={styles.muted}>لا توجد حلقات مسجلة بعد</Text>}
        {halqat.map((halqa) => (
          <HalqaCard key={halqa._id} halqa={halqa} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
