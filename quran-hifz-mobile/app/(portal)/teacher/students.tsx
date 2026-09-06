import { useMemo, useState } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { usePortalStore } from '@/lib/store/portalStore';
import ScopeTabs from '@/components/ui/ScopeTabs';
import { useTracks } from '@/lib/queries/tracks';
import { useStudents } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const hwVariant = (s: string) =>
  s === 'submitted' ? 'green' : s === 'late' ? 'red' : 'gold';
const hwLabel = (s: string) =>
  s === 'submitted' ? 'مُسلَّم' : s === 'late' ? 'متأخر' : 'معلق';

function getTrackName(v: { title: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'title' in v) return v.title;
  return typeof v === 'string' ? v : '—';
}

export default function TeacherStudents() {
  const theme = useAppTheme();
  const authUser = usePortalStore((s) => s.authUser);
  // "all" | "track:<id>" — narrower vocabulary now that a student belongs to
  // exactly one track (no more halqa-vs-track duality to filter across).
  const [filter, setFilter] = useState('all');

  const { data: myTracks = [], refetch: refetchTracks, isRefetching: refetchingTracks } = useTracks(undefined, authUser?.profileId);
  // A teacher can run several tracks — fetch across all of them, not just the
  // first, or every student outside track #1 silently disappears.
  const trackIds = useMemo(() => myTracks.map((t) => t._id), [myTracks]);
  const {
    data: students = [],
    isLoading,
    isError,
    refetch: refetchStudents,
    isRefetching: refetchingStudents,
  } = useStudents({ track: trackIds.join(',') }, { enabled: trackIds.length > 0 });

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'كل الطلاب' },
    ...myTracks.map((t) => ({ value: `track:${t._id}`, label: t.title })),
  ], [myTracks]);

  const shown = useMemo(() => {
    if (filter.startsWith('track:')) {
      const id = filter.slice(6);
      return students.filter((st) => (typeof st.track === 'object' ? st.track?._id : st.track) === id);
    }
    return students;
  }, [students, filter]);

  const isRefreshing = refetchingStudents || refetchingTracks;
  const onRefresh = () => {
    refetchStudents();
    refetchTracks();
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    filterLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    progressWrap: { gap: 4 },
    empty: { textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13, paddingVertical: 24 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        {isError && <Alert variant="error">تعذر تحميل الطلاب</Alert>}

        {filterOptions.length > 1 && (
          <View style={{ gap: 6 }}>
            <Text style={styles.filterLabel}>تصفية الطلاب</Text>
            <ScopeTabs options={filterOptions} value={filter} onChange={setFilter} />
          </View>
        )}

        <Card noPadding>
          <CardHeader title={`الطلاب (${shown.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && shown.length === 0 && <Text style={styles.empty}>لا يوجد طلاب</Text>}

            {!isLoading && shown.map((s, i) => {
              const guardianName = s.parentName || s.guardian || '—';
              return (
                <View key={s._id} style={[styles.row, i < shown.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowHead}>
                    <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                    <Badge label={hwLabel(s.homeworkStatus)} variant={hwVariant(s.homeworkStatus) as any} />
                  </View>

                  <View style={styles.infoGrid}>
                    <Text style={styles.infoItem}>المسار: {getTrackName(s.track)}</Text>
                    <Text style={styles.infoItem}>·</Text>
                    <Text style={styles.infoItem}>آخر حفظ: {s.lastMemorization || '—'}</Text>
                  </View>

                  <View style={styles.rowHead}>
                    <Text style={[styles.muted, { color: s.attendancePct >= 90 ? theme.green : theme.red, fontFamily: theme.fontCairoBold }]}>
                      الحضور {s.attendancePct}٪
                    </Text>
                    <Text style={styles.muted}>ولي الأمر: {guardianName}</Text>
                  </View>

                  <View style={styles.progressWrap}>
                    <Text style={styles.muted}>التقدم {s.progressPct}٪</Text>
                    <ProgressBar value={s.progressPct} showPercent={false} />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
