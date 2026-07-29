import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useStudents, type Student } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

function getName(v: { _id: string; name: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'name' in v) return v.name;
  if (typeof v === 'string') return v;
  return '—';
}

/** المسار: real track lives one hop away via halqa.specialTrack, not the unused legacy `path` enum. */
function trackLabel(s: Student): string | null {
  const halqa = typeof s.halqa === 'object' ? s.halqa : null;
  const track = halqa?.specialTrack;
  if (track && typeof track === 'object' && track.title) return track.title;
  if (s.path) return s.path;
  return null;
}

export default function AdminStudents() {
  const theme = useAppTheme();
  const { data: students = [], isLoading, isError, isRefetching, refetch } = useStudents();

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

  const active = students.filter((s) => s.status === 'active').length;
  const inactive = students.filter((s) => s.status === 'inactive').length;

  const STATS = [
    { label: 'إجمالي الطلاب', value: students.length, color: theme.green },
    { label: 'نشطون',          value: active,          color: theme.gold },
    { label: 'غير نشطين',      value: inactive,        color: theme.red },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.green]} tintColor={theme.green} />}
      >
        {isError && <Alert variant="error">تعذر تحميل بيانات الطلاب</Alert>}

        {!isLoading && <StatsRow stats={STATS} />}

        <Card noPadding>
          <CardHeader title={`الطلاب (${students.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && students.length === 0 && <Text style={styles.empty}>لا يوجد طلاب مسجلون بعد</Text>}

            {!isLoading && students.map((s, i) => {
              const track = trackLabel(s);
              const guardianName = s.parentName || s.guardian || null;
              const guardianContact = s.parentEmail || s.guardianPhone || null;
              return (
                <View key={s._id} style={[styles.row, i < students.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowHead}>
                    <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                    {track ? <Badge label={track} variant="gold" /> : <Text style={styles.muted}>—</Text>}
                  </View>

                  <View style={styles.infoGrid}>
                    <Text style={styles.infoItem}>الحلقة: {getName(s.halqa)}</Text>
                    <Text style={styles.infoItem}>·</Text>
                    <Text style={styles.infoItem}>المسجد: {getName(s.masjid)}</Text>
                    {typeof s.level === 'number' && (
                      <>
                        <Text style={styles.infoItem}>·</Text>
                        <Text style={styles.infoItem}>المستوى: {s.level}</Text>
                      </>
                    )}
                  </View>

                  <View style={styles.rowHead}>
                    <Text style={[styles.muted, { color: s.attendancePct >= 90 ? theme.green : theme.red, fontFamily: theme.fontCairoBold }]}>
                      الحضور {s.attendancePct}٪
                    </Text>
                    <Text style={styles.muted}>
                      ولي الأمر: {guardianName ?? '—'}{guardianContact ? ` (${guardianContact})` : ''}
                    </Text>
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
