import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import AyahBar from '@/components/ui/AyahBar';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import Alert from '@/components/ui/Alert';
import { IconAlertCircle, IconCircleCheck, IconHistory, IconInfoCircle, IconReport } from '@tabler/icons-react-native';
import { useStats, useDashboardAlerts, type DashboardAlerts } from '@/lib/queries/stats';
import { useKpis, KPI_STATUS } from '@/lib/queries/kpis';
import { useStudents } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { usePortalStore } from '@/lib/store/portalStore';
import { matchesGenderScope } from '@/lib/constants/genderScope';


export default function AdminDashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const genderScope = usePortalStore((st) => st.genderScope);
  const readOnly = usePortalStore((st) => st.readOnly);
  const stats = useStats(genderScope);
  const kpisQuery = useKpis();
  const studentsQuery = useStudents();
  const alertsQuery = useDashboardAlerts(genderScope);

  const isLoading = stats.isLoading || kpisQuery.isLoading || studentsQuery.isLoading;
  const isRefreshing = stats.isRefetching || kpisQuery.isRefetching || studentsQuery.isRefetching || alertsQuery.isRefetching;
  const onRefresh = () => {
    stats.refetch();
    kpisQuery.refetch();
    studentsQuery.refetch();
    alertsQuery.refetch();
  };

  const kpis = kpisQuery.data ?? [];
  const students = (studentsQuery.data ?? []).filter((st) =>
    matchesGenderScope(typeof st.track === 'string' ? undefined : st.track.masjid, genderScope),
  );

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    row: { paddingVertical: 14, gap: 8 },
    addBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, padding: 12, alignItems: 'center' },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
    masarRow: { gap: 4, marginBottom: 10 },
    masarName: { flex: 1, fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    masarCount: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
    rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1 },
    cell: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
  }), [theme]);

  const STATS = stats.data ? [
    { label: 'إجمالي الطلاب', value: stats.data.totalStudents, color: theme.green },
    { label: 'مسارات نشطة',   value: stats.data.totalTracks,   color: theme.gold },
    { label: 'المعلمون',      value: stats.data.totalTeachers, color: theme.blue },
    { label: 'نسبة الحضور',   value: pct(stats.data.avgAttendancePct ?? 0), color: theme.green },
  ] : [];

  // توزيع المسارات — grouped client-side by Student.path, as on the web.
  const masarRows = (() => {
    const counts: Record<string, number> = {};
    for (const st of students) {
      const key = st.path || '—';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const total = students.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  })();

  const topKpis = kpis.slice(0, 4);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <AyahBar />
        {isLoading ? <SkeletonRows count={1} rowHeight={70} /> : <StatsRow stats={STATS} />}

        {!readOnly && (
          <Pressable style={styles.addBtn} onPress={() => router.push('/(portal)/admin/register' as any)}>
            <Text style={styles.addBtnText}>+ طالب جديد</Text>
          </Pressable>
        )}

        {/* Programme distribution */}
        <Card>
          <CardHeader title="توزيع المسارات" />
          {isLoading && <SkeletonRows count={3} />}
          {!isLoading && masarRows.length === 0 && <Text style={styles.muted}>لا توجد بيانات</Text>}
          {!isLoading && masarRows.map((r) => (
            <View key={r.name} style={styles.masarRow}>
              <View style={styles.rowHead}>
                <Text style={styles.masarName} numberOfLines={1}>{r.name}</Text>
                <Text style={styles.masarCount}>{r.count}</Text>
              </View>
              <ProgressBar value={r.pct} showPercent={false} />
            </View>
          ))}
        </Card>

        {/* KPIs */}
        <Card noPadding>
          <CardHeader title="مؤشرات الأداء" style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={3} />}
            {!isLoading && topKpis.length === 0 && <Text style={styles.muted}>لا توجد مؤشرات أداء بعد</Text>}
            {topKpis.map((k, i) => (
              <View key={k._id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <Text style={styles.bold} numberOfLines={2}>{k.indicator}</Text>
                  <Badge label={KPI_STATUS[k.status].label} variant={KPI_STATUS[k.status].variant} />
                </View>
                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>المستهدف: {k.target}</Text>
                  <Text style={styles.infoItem}>·</Text>
                  <Text style={styles.infoItem}>الفعلي: {k.actual}</Text>
                </View>
                <ProgressBar value={k.progress} showPercent={false} />
              </View>
            ))}
          </View>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader title="آخر التنبيهات" />
          <DashboardAlertList alerts={alertsQuery.data} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Arabic counted noun: ١ طالب، ٢ طالبان، ٣–١٠ طلاب، ١١+ طالباً (web parity). */
function countOf(n: number, forms: [one: string, two: string, few: string, many: string]): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  return `${n} ${n <= 10 ? forms[2] : forms[3]}`;
}
const STUDENTS_FORMS: [string, string, string, string] = ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'];
const HALQAS_FORMS: [string, string, string, string] = ['حلقة واحدة', 'حلقتان', 'حلقات', 'حلقة'];

/** Up to three names, then «و N آخرين». */
function namesPreview(names: string[]): string {
  const shown = names.slice(0, 3).join('، ');
  return names.length > 3 ? `${shown} و${names.length - 3} آخرين` : shown;
}

const pct = (n: number) => `${Math.round(n)}٪`;

/** «آخر التنبيهات» — same messages as the web dashboard, one Alert card each. */
function DashboardAlertList({ alerts }: { alerts?: DashboardAlerts }) {
  const theme = useAppTheme();
  const router = useRouter();
  const styles = useMemo(() => StyleSheet.create({
    list: { gap: 8 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo },
  }), [theme]);

  if (!alerts) return <SkeletonRows count={2} />;
  const { absent, nearCapacity, excellent, reportMissing, gradeEdits } = alerts;
  if (!absent.length && !nearCapacity.length && !excellent.length && !reportMissing.length && !gradeEdits) {
    return <Text style={styles.muted}>لا توجد تنبيهات حالياً</Text>;
  }
  const icon = (Icon: typeof IconInfoCircle, tone: 'gold' | 'blue' | 'green') =>
    <Icon size={16} color={theme.tone[tone].text} />;
  return (
    <View style={styles.list}>
      {absent.length > 0 && (
        <Alert variant="warning" icon={icon(IconAlertCircle, 'gold')}>
          {`${countOf(absent.length, STUDENTS_FORMS)} تجاوزت نسبة غيابهم 25٪ — يُنصح بالتواصل مع أولياء الأمور (${namesPreview(absent.map((a) => `${a.name} ${pct(a.pct)}`))})`}
        </Alert>
      )}
      {gradeEdits > 0 && (
        <Pressable onPress={() => router.push('/(portal)/admin/dailyreports' as any)}>
          <Alert variant="info" icon={icon(IconHistory, 'blue')}>
            {`${gradeEdits} ${gradeEdits === 1 ? 'تعديل' : 'تعديلات'} على درجات أو حضور بعد إرسال تقرير اليوم — عرض التقارير اليومية`}
          </Alert>
        </Pressable>
      )}
      {reportMissing.length > 0 && (
        <Alert variant="info" icon={icon(IconReport, 'blue')}>
          {`${countOf(reportMissing.length, HALQAS_FORMS)} سجّلت تقييم اليوم ولم ترسل التقرير اليومي بعد (${namesPreview(reportMissing)})`}
        </Alert>
      )}
      {nearCapacity.map((t) => (
        <Alert key={t.title} variant="info" icon={icon(IconInfoCircle, 'blue')}>
          {`حلقة ${t.title} وصلت لـ ${pct(t.pct)} من طاقتها الاستيعابية`}
        </Alert>
      ))}
      {excellent.length > 0 && (
        <Alert variant="success" icon={icon(IconCircleCheck, 'green')}>
          {`${countOf(excellent.length, STUDENTS_FORMS)} متوسط تقييمهم 9 من 10 فأكثر هذا الشهر (${namesPreview(excellent)})`}
        </Alert>
      )}
    </View>
  );
}
