import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContextCard, { halqaToContext, trackToContext } from '@/components/domain/ContextCard';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useHalqat } from '@/lib/queries/halqat';
import { useStudents } from '@/lib/queries/students';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const ROSTER_COLUMNS = [
  { key: 'name', label: 'الطالب', flex: 2 },
  { key: 'level', label: 'المستوى', flex: 1 },
  { key: 'attendance', label: 'نسبة الحضور', flex: 1.2 },
  { key: 'progress', label: 'نسبة التقدم', flex: 1.2 },
];

export default function TeacherHalqa() {
  const theme = useAppTheme();
  const router = useRouter();
  const profileId = usePortalStore((s) => s.authUser?.profileId);

  const {
    data: halqat = [],
    isLoading: loadingHalqat,
    refetch: refetchHalqat,
    isRefetching: refetchingHalqat,
  } = useHalqat({ teacher: profileId });
  const {
    data: tracks = [],
    isLoading: loadingTracks,
    refetch: refetchTracks,
    isRefetching: refetchingTracks,
  } = useSpecialTracks(undefined, profileId);

  // The web page lists each halqa's roster with its level / attendance /
  // progress columns, so the teacher can read the halqa without drilling in.
  // There is no `teacher` filter on /students — scope by this teacher's own
  // halqa ids instead, the same comma-list the track drill-down uses.
  const halqaIds = useMemo(() => halqat.map((h) => h._id), [halqat]);
  const {
    data: students = [],
    refetch: refetchStudents,
    isRefetching: refetchingStudents,
  } = useStudents({ halqa: halqaIds.join(',') }, { enabled: halqaIds.length > 0 });

  const isLoading = loadingHalqat || loadingTracks;
  const isRefreshing = refetchingHalqat || refetchingTracks || refetchingStudents;
  const onRefresh = () => {
    refetchHalqat();
    refetchTracks();
    refetchStudents();
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    actions: { flexDirection: 'row', gap: 8, flex: 1 },
    actionBtn: { flex: 1 },
    countPill: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />}
      >
        {isLoading && <SkeletonRows count={3} rowHeight={92} />}

        {!isLoading && halqat.length === 0 && tracks.length === 0 && (
          <Text style={styles.muted}>لا توجد حلقات أو مسارات مسندة إليك</Text>
        )}

        {halqat.map((halqa) => {
          const roster = students.filter((st) => {
            const h = st.halqa;
            return (typeof h === 'object' ? h?._id : h) === halqa._id;
          });
          return (
          <View key={halqa._id} style={{ gap: 10 }}>
          <ContextCard
            context={halqaToContext(halqa)}
            actions={
              <View style={styles.actions}>
                <Button
                  label="الطلاب"
                  variant="ghost"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/students')}
                />
                <Button
                  label="الحضور"
                  variant="primary"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/attendance')}
                />
              </View>
            }
          />
          <Card>
            <CardHeader title={`طلاب ${halqa.name}`} right={<Text style={styles.countPill}>{roster.length} طالب</Text>} />
            <DataTable
              columns={ROSTER_COLUMNS}
              rows={roster.map((st) => ({
                name: st.name,
                level: typeof st.level === 'number' ? String(st.level) : '—',
                attendance: `${st.attendancePct}%`,
                progress: `${st.progressPct}%`,
              }))}
              emptyMessage="لا يوجد طلاب في هذه الحلقة"
            />
          </Card>
          </View>
          );
        })}

        {tracks.map((track) => (
          <ContextCard
            key={track._id}
            context={trackToContext(track)}
            actions={
              <View style={styles.actions}>
                <Button
                  label="الطلاب"
                  variant="ghost"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/special_tracks')}
                />
                <Button
                  label="الحضور"
                  variant="primary"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(portal)/teacher/attendance')}
                />
              </View>
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
