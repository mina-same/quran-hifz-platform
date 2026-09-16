import { useMemo } from 'react';
import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReportsScreen from '@/components/domain/ReportsScreen';
import { useTracks } from '@/lib/queries/tracks';
import { useKpis } from '@/lib/queries/kpis';
import { useTeachers } from '@/lib/queries/teachers';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { usePortalStore } from '@/lib/store/portalStore';

export default function AdminReports() {
  const theme = useAppTheme();
  const genderScope = usePortalStore((st) => st.genderScope);
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
  }), [theme]);

  const { data: tracks = [], isRefetching: tracksRefetching, refetch: refetchTracks } = useTracks();
  const { data: kpis = [], isRefetching: kpisRefetching, refetch: refetchKpis } = useKpis();
  const { data: teachers = [], isRefetching: teachersRefetching, refetch: refetchTeachers } = useTeachers();

  const refreshing = tracksRefetching || kpisRefetching || teachersRefetching;
  const onRefresh = () => {
    refetchTracks();
    refetchKpis();
    refetchTeachers();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <ReportsScreen
          baseFilter={{}}
          tracks={tracks}
          scopeAllLabel="كل المدرسة"
          showAdmin
          kpis={kpis}
          teachers={teachers}
          genderScope={genderScope}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
