import { useMemo } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { usePortalStore } from '@/lib/store/portalStore';
import { useTracks } from '@/lib/queries/tracks';
import { useHomework } from '@/lib/queries/homework';
import { useStats } from '@/lib/queries/stats';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

function getName(v: { _id: string; name: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'name' in v) return v.name;
  if (typeof v === 'string') return v;
  return '';
}

export default function TeacherDashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const authUser = usePortalStore((s) => s.authUser);

  const { data: stats, refetch: refetchStats, isRefetching: statsRefetching } = useStats();
  const {
    data: tracks = [],
    isLoading: tracksLoading,
    isError: tracksError,
    refetch: refetchTracks,
    isRefetching: tracksRefetching,
  } = useTracks(undefined, authUser?.profileId);
  const {
    data: pendingHW = [],
    isLoading: hwLoading,
    isError: hwError,
    refetch: refetchHW,
    isRefetching: hwRefetching,
  } = useHomework({ teacher: authUser?.profileId, status: 'معلق' });

  const isError = tracksError || hwError;
  const isRefreshing = statsRefetching || tracksRefetching || hwRefetching;
  const onRefresh = () => {
    refetchStats();
    refetchTracks();
    refetchHW();
  };

  const totalStudents = tracks.reduce((sum, t) => sum + (t.studentCount ?? 0), 0);

  const STATS = [
    { label: 'طلابي الكلي', value: totalStudents, color: theme.green },
    { label: 'مساراتي', value: tracks.length, color: theme.gold },
    { label: 'متوسط الحضور', value: `${stats?.avgAttendancePct ?? 0}٪`, color: theme.blue },
    { label: 'واجبات معلقة', value: pendingHW.length, color: theme.red },
  ];

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    muted: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
    halqaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <AyahBar />
        <StatsRow stats={STATS} />

        {isError && <Alert variant="error">تعذر تحميل بيانات لوحة التحكم</Alert>}

        {/* My tracks */}
        <Card>
          <CardHeader title="مساراتي" />
          {tracksLoading ? (
            <SkeletonRows count={2} rowHeight={40} />
          ) : tracks.length === 0 ? (
            <Text style={styles.muted}>لا توجد مسارات مسجلة</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {tracks.map((t) => (
                <View key={t._id} style={styles.halqaRow}>
                  <Text style={styles.bold}>{t.title}</Text>
                  <Badge label={getName(t.masjid) || '—'} variant="gold" />
                  <Text style={styles.muted}>{t.timeSlot}</Text>
                  <Text style={styles.muted}>{t.studentCount ?? 0} طالب</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Homework needing review */}
        <Card>
          <CardHeader title="واجبات تحتاج مراجعة" />
          {hwLoading ? (
            <SkeletonRows count={1} rowHeight={40} />
          ) : pendingHW.length > 0 ? (
            <Alert variant="warning">{`${pendingHW.length} واجب صوتي بانتظار المراجعة`}</Alert>
          ) : (
            <Alert variant="success">لا توجد واجبات معلقة</Alert>
          )}
          <Button
            label="مراجعة الواجبات الآن"
            onPress={() => router.push('/(portal)/teacher/homework' as any)}
            fullWidth
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
