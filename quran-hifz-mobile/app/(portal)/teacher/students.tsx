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
import { useHalqat } from '@/lib/queries/halqat';
import { useStudents } from '@/lib/queries/students';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
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
  // "all" | "halqa:<id>" | "track:<id>", same filter vocabulary as the web page.
  const [filter, setFilter] = useState('all');

  const { data: halqat = [], refetch: refetchHalqat, isRefetching: refetchingHalqat } = useHalqat({ teacher: authUser?.profileId });
  // A teacher can run several halqat — fetch across all of them, not just the
  // first, or every student outside halqa #1 silently disappears.
  const halqaIds = useMemo(() => halqat.map((h) => h._id), [halqat]);
  const {
    data: students = [],
    isLoading,
    isError,
    refetch: refetchStudents,
    isRefetching: refetchingStudents,
  } = useStudents({ halqa: halqaIds.join(',') }, { enabled: halqaIds.length > 0 });

  const {
    data: myTracks = [], refetch: refetchTracks, isRefetching: refetchingTracks,
  } = useSpecialTracks(undefined, authUser?.profileId);

  // studentId -> the titles of this teacher's tracks they're enrolled in,
  // counting both direct enrollment and the track their halqa hangs off.
  const studentTracks = useMemo(() => {
    const map = new Map<string, string[]>();
    const push = (id: string, title: string) => {
      const cur = map.get(id) ?? [];
      if (!cur.includes(title)) map.set(id, [...cur, title]);
    };
    for (const t of myTracks) {
      for (const es of t.enrolledStudents) push(typeof es === 'object' ? es._id : es, t.title);
    }
    for (const h of halqat) {
      const ref = h.specialTrack;
      if (!ref || typeof ref !== 'object') continue;
      for (const st of students) {
        const sh = st.halqa;
        if ((typeof sh === 'object' ? sh?._id : sh) === h._id) push(st._id, ref.title);
      }
    }
    return map;
  }, [myTracks, halqat, students]);

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'كل الطلاب' },
    ...halqat.map((h) => ({ value: `halqa:${h._id}`, label: h.name })),
    ...myTracks.map((t) => ({ value: `track:${t._id}`, label: t.title })),
  ], [halqat, myTracks]);

  const shown = useMemo(() => {
    if (filter.startsWith('halqa:')) {
      const id = filter.slice(6);
      return students.filter((st) => (typeof st.halqa === 'object' ? st.halqa?._id : st.halqa) === id);
    }
    if (filter.startsWith('track:')) {
      const title = myTracks.find((t) => t._id === filter.slice(6))?.title;
      return title ? students.filter((st) => (studentTracks.get(st._id) ?? []).includes(title)) : [];
    }
    return students;
  }, [students, filter, myTracks, studentTracks]);

  const isRefreshing = refetchingHalqat || refetchingStudents || refetchingTracks;
  const onRefresh = () => {
    refetchHalqat();
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
    trackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />}
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
              const tracks = studentTracks.get(s._id) ?? [];
              return (
                <View key={s._id} style={[styles.row, i < shown.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowHead}>
                    <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                    <Badge label={hwLabel(s.homeworkStatus)} variant={hwVariant(s.homeworkStatus) as any} />
                  </View>

                  <View style={styles.infoGrid}>
                    <Text style={styles.infoItem}>الحلقة: {getName(s.halqa)}</Text>
                    <Text style={styles.infoItem}>·</Text>
                    <Text style={styles.infoItem}>آخر حفظ: {s.lastMemorization || '—'}</Text>
                  </View>

                  {tracks.length > 0 && (
                    <View style={styles.trackRow}>
                      {tracks.map((t) => <Badge key={t} label={t} variant="green" />)}
                    </View>
                  )}

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
