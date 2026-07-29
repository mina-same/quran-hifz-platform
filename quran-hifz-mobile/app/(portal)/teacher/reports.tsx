import { useMemo } from 'react';
import { ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReportsScreen from '@/components/domain/ReportsScreen';
import { usePortalStore } from '@/lib/store/portalStore';
import { useHalqat } from '@/lib/queries/halqat';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import type { StudentFilters } from '@/lib/queries/students';

export default function TeacherReports() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
  }), [theme]);

  // Same halqat-scoping source as myhalqa.tsx: every halqa taught by this teacher.
  const { data: halqat = [], refetch: refetchHalqat, isRefetching: refetchingHalqat } = useHalqat({ teacher: profileId });
  const { data: tracks = [], refetch: refetchTracks, isRefetching: refetchingTracks } = useSpecialTracks(undefined, profileId);
  const isRefreshing = refetchingHalqat || refetchingTracks;
  const onRefresh = () => {
    refetchHalqat();
    refetchTracks();
  };

  // Server's GET /students supports a comma-separated `halqa` list ($in). When the
  // teacher has no halqat yet, use a sentinel id that matches nothing rather than
  // an empty filter (which the query layer would treat as "no filter" = every student).
  const myHalqaIds = halqat.map((h) => h._id);
  const baseFilter: StudentFilters = { halqa: myHalqaIds.length > 0 ? myHalqaIds.join(',') : '__none__' };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />}
      >
        <ReportsScreen
          baseFilter={baseFilter}
          halqat={halqat}
          tracks={tracks}
          scopeAllLabel="كل حلقاتي"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
