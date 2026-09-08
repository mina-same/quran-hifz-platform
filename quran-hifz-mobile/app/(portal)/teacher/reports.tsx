import { useMemo } from 'react';
import { ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReportsScreen from '@/components/domain/ReportsScreen';
import { usePortalStore } from '@/lib/store/portalStore';
import { useTracks } from '@/lib/queries/tracks';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import type { StudentFilters } from '@/lib/queries/students';

export default function TeacherReports() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
  }), [theme]);

  // Same tracks-scoping source as teacher/tracks.tsx: every track taught by this teacher.
  const { data: tracks = [], refetch: refetchTracks, isRefetching: refetchingTracks } = useTracks(undefined, profileId);
  const isRefreshing = refetchingTracks;
  const onRefresh = () => {
    refetchTracks();
  };

  // Server's GET /students supports a comma-separated `track` list ($in). When the
  // teacher has no tracks yet, use a sentinel id that matches nothing rather than
  // an empty filter (which the query layer would treat as "no filter" = every student).
  const myTrackIds = tracks.map((t) => t._id);
  const baseFilter: StudentFilters = { track: myTrackIds.length > 0 ? myTrackIds.join(',') : '__none__' };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <ReportsScreen
          baseFilter={baseFilter}
          tracks={tracks}
          scopeAllLabel="كل مساراتي"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
