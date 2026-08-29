import { useMemo } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Alert from '@/components/ui/Alert';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { usePortalStore } from '@/lib/store/portalStore';
import { useStudent } from '@/lib/queries/students';
import { useHomework } from '@/lib/queries/homework';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { AR_LOCALE } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return '—';
}

export default function StudentDashboard() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const authUser = usePortalStore((s) => s.authUser);
  const studentId = authUser?.profileId;

  const { data: student, isLoading: studentLoading, isError: studentError, isRefetching: studentRefetching, refetch: refetchStudent } = useStudent(studentId);
  const { data: homework = [], isLoading: hwLoading, isRefetching: hwRefetching, refetch: refetchHw } = useHomework({ student: studentId });

  const isLoading = studentLoading || hwLoading;
  const isRefetching = studentRefetching || hwRefetching;
  const onRefresh = () => {
    refetchStudent();
    refetchHw();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <SkeletonRows count={6} />
        </View>
      </SafeAreaView>
    );
  }

  if (studentError || !student) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.page}>
          <Alert variant="error">تعذر تحميل بيانات الطالب</Alert>
        </View>
      </SafeAreaView>
    );
  }

  const submittedCount = homework.filter((h) => h.status === 'مراجع').length;

  const juz = Math.round((student.progressPct / 100) * 30);
  // Same badge the web shows: strong attendance AND real progress.
  const isTopStudent = student.attendancePct >= 90 && student.progressPct >= 60;
  const halqaObj = typeof student.halqa === 'object' ? student.halqa : null;
  const halqaSchedule = halqaObj?.days && halqaObj?.time ? `${halqaObj.days} | ${halqaObj.time}` : null;

  const STATS = [
    { label: 'جزءاً محفوظاً', value: juz, color: theme.green },
    { label: 'نسبة حضوري', value: `${student.attendancePct}٪`, color: theme.gold },
    { label: 'واجبات أرسلتها', value: submittedCount, color: theme.blue },
    { label: 'نسبة الإنجاز', value: `${student.progressPct}٪`, color: theme.red },
  ];

  const recentHomework = [...homework]
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />
        }
      >
        <AyahBar />

        <StatsRow stats={STATS} />

        <View style={styles.stack}>
          {/* Current plan */}
          <Card>
            <CardHeader title="خطتي الحالية" />
            <View style={styles.planCenter}>
              <Text style={styles.planLabel}>التقدم نحو الهدف السنوي</Text>
              <Text style={styles.planPct}>{student.progressPct}٪</Text>
              <View style={styles.planBarWrap}>
                <ProgressBar value={student.progressPct} showPercent={false} />
              </View>
              <Text style={styles.planNote}>
                {student.progressPages} صفحة من {student.totalPages} صفحة
              </Text>
              <Text style={styles.planNote}>{juz} جزء من ٣٠ جزء المستهدف</Text>
              <View style={styles.planBadge}>
                <Badge label={student.path} variant="green" />
              </View>
            </View>
            {!!student.lastMemorization && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>آخر حفظ</Text>
                <Text style={styles.infoVal}>{student.lastMemorization}</Text>
              </View>
            )}
          </Card>

          {/* Halqa info */}
          <Card>
            <CardHeader title="معلومات حلقتي" />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>الحلقة</Text>
              <Text style={[styles.infoVal, { color: theme.green }]}>{getName(student.halqa)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>المسجد</Text>
              <Text style={styles.infoVal}>{getName(student.masjid)}</Text>
            </View>
            {!!halqaSchedule && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>المواعيد</Text>
                <Text style={styles.infoVal}>{halqaSchedule}</Text>
              </View>
            )}
            {isTopStudent && (
              <View style={styles.topAlert}>
                <Alert variant="success">أنت من أفضل طلاب الحلقة هذا الأسبوع!</Alert>
              </View>
            )}
          </Card>
        </View>

        {/* Recent homework */}
        <Card>
          <CardHeader title="آخر الواجبات" />
          {recentHomework.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد واجبات بعد</Text>
          ) : (
            recentHomework.map((row, i) => (
              <View key={row._id} style={[styles.hwRow, i < recentHomework.length - 1 && styles.hwBorder]}>
                <View>
                  <Text style={styles.hwSegment}>{row.segment}</Text>
                  <Text style={styles.hwDate}>{new Date(row.dueDate).toLocaleDateString(AR_LOCALE)}</Text>
                </View>
                <View style={styles.hwBadges}>
                  {row.rating && <Badge label={row.rating} variant="gold" />}
                  <Badge label={row.status} variant={row.status === 'مراجع' ? 'green' : row.status === 'متأخر' ? 'red' : 'gray'} />
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe:  { flex: 1, backgroundColor: theme.bg },
    page:  { padding: theme.pagePadding, gap: 14 },
    stack: { gap: 14 },
    topAlert: { marginTop: 10 },
    planCenter: { alignItems: 'center', paddingVertical: 8 },
    planLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, marginBottom: 4 },
    planPct: { fontSize: 30, fontFamily: theme.fontCairoBold, color: theme.green },
    planBarWrap: { width: '100%', marginTop: 10, marginBottom: 8 },
    planNote: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    planBadge: { marginTop: 10 },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 5,
    },
    infoKey: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    infoVal: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    hwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    hwBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    hwSegment: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    hwDate: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },
    hwBadges: { flexDirection: 'row', gap: 6 },
    emptyText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 20 },
  });
}
