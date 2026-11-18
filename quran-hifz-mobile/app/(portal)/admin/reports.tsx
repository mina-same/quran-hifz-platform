import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import PromoReportSection from '@/components/domain/PromoReportSection';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { usePortalStore } from '@/lib/store/portalStore';

/** Admin / supervisor reports — like web, the page IS «تقرير الإنجاز والتميّز». */
export default function AdminReports() {
  const theme = useAppTheme();
  const genderScope = usePortalStore((st) => st.genderScope);
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
  }), [theme]);

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['rankings'] }),
      queryClient.invalidateQueries({ queryKey: ['tracks'] }),
      queryClient.invalidateQueries({ queryKey: ['masajid'] }),
    ]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <PromoReportSection genderScope={genderScope} />
      </ScrollView>
    </SafeAreaView>
  );
}
