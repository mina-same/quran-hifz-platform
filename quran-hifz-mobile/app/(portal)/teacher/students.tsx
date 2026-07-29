import { useMemo } from 'react';
import { ScrollView, View, Text, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { usePortalStore } from '@/lib/store/portalStore';
import { useHalqat } from '@/lib/queries/halqat';
import { useStudents } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const hwVariant = (s: string) =>
  s === 'submitted' ? 'green' : s === 'late' ? 'red' : 'gold';
const hwLabel = (s: string) =>
  s === 'submitted' ? 'مُسلَّم' : s === 'late' ? 'متأخر' : 'معلق';

function getName(v: { _id: string; name: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'name' in v) return v.name;
  if (typeof v === 'string') return v;
  return '';
}

export default function TeacherStudents() {
  const theme = useAppTheme();
  const authUser = usePortalStore((s) => s.authUser);
  // Teachers may run several halqat — mirrors the web TeacherStudents page,
  // which scopes the list to the teacher's first halqa.
  const { data: halqat = [], refetch: refetchHalqat, isRefetching: refetchingHalqat } = useHalqat({ teacher: authUser?.profileId });
  const firstHalqaId = halqat[0]?._id;
  const {
    data: students = [],
    isLoading,
    isError,
    refetch: refetchStudents,
    isRefetching: refetchingStudents,
  } = useStudents({ halqa: firstHalqaId });

  const isRefreshing = refetchingHalqat || refetchingStudents;
  const onRefresh = () => {
    refetchHalqat();
    refetchStudents();
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
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    progressWrap: { gap: 4 },
    empty: { textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13, paddingVertical: 24 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />}
      >
        {isError && <Alert variant="error">تعذر تحميل الطلاب</Alert>}

        <Card noPadding>
          <CardHeader title={`الطلاب (${students.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && students.length === 0 && <Text style={styles.empty}>لا يوجد طلاب</Text>}

            {!isLoading && students.map((s, i) => {
              const guardianName = s.parentName || s.guardian || '—';
              return (
                <View key={s._id} style={[styles.row, i < students.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowHead}>
                    <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                    <Badge label={hwLabel(s.homeworkStatus)} variant={hwVariant(s.homeworkStatus) as any} />
                  </View>

                  <View style={styles.infoGrid}>
                    <Text style={styles.infoItem}>الحلقة: {getName(s.halqa)}</Text>
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
