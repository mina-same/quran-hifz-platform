import { useMemo } from 'react';
import { ScrollView, View, Text, RefreshControl, StyleSheet } from 'react-native';
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
import { useHalqat } from '@/lib/queries/halqat';
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
    data: halqat = [],
    isLoading: halqatLoading,
    isError: halqatError,
    refetch: refetchHalqat,
    isRefetching: halqatRefetching,
  } = useHalqat({ teacher: authUser?.profileId });
  const {
    data: pendingHW = [],
    isLoading: hwLoading,
    isError: hwError,
    refetch: refetchHW,
    isRefetching: hwRefetching,
  } = useHomework({ teacher: authUser?.profileId, status: 'معلق' });

  const isError = halqatError || hwError;
  const isRefreshing = statsRefetching || halqatRefetching || hwRefetching;
  const onRefresh = () => {
    refetchStats();
    refetchHalqat();
    refetchHW();
  };

  const totalStudents = halqat.reduce((sum, h) => sum + (h.studentCount ?? 0), 0);

  const STATS = [
    { label: 'طلابي الكلي', value: totalStudents, color: theme.green },
    { label: 'حلقاتي', value: halqat.length, color: theme.gold },
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
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />}
      >
        <AyahBar />
        <StatsRow stats={STATS} />

        {isError && <Alert variant="error">تعذر تحميل بيانات لوحة التحكم</Alert>}

        {/* My halqat */}
        <Card>
          <CardHeader title="حلقاتي" />
          {halqatLoading ? (
            <SkeletonRows count={2} rowHeight={40} />
          ) : halqat.length === 0 ? (
            <Text style={styles.muted}>لا توجد حلقات مسجلة</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {halqat.map((h) => (
                <View key={h._id} style={styles.halqaRow}>
                  <Text style={styles.bold}>{h.name}</Text>
                  <Badge label={getName(h.masjid) || '—'} variant="gold" />
                  <Text style={styles.muted}>{h.time}</Text>
                  <Text style={styles.muted}>{h.studentCount ?? 0} طالب</Text>
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
