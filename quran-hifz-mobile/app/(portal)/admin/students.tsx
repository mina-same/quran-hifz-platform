import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
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

type Tone = 'green' | 'gold' | 'red';
function attendanceTone(pct: number): Tone {
  if (pct >= 90) return 'green';
  if (pct >= 75) return 'gold';
  return 'red';
}

export default function AdminStudents() {
  const theme = useAppTheme();
  const { data: students = [], isLoading, isError, isRefetching, refetch } = useStudents();

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },

    row: { paddingVertical: 14, gap: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },

    // Name takes the width it needs; the attendance pill never gets pushed off-screen.
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },

    attPill: { borderRadius: theme.radiusFull, paddingHorizontal: 10, paddingVertical: 4 },
    attPillText: { fontSize: 11, fontFamily: theme.fontCairoBold },

    // A full-width chip: a long track title ellipsizes on one line instead of
    // squeezing the student's name out of the header row.
    trackBadge: { alignSelf: 'stretch' },

    // Meta reads as wrapping chips — dot-separated text ran into a ragged block
    // on a 390pt screen.
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      backgroundColor: theme.tone.gray.bg,
      borderRadius: theme.radiusSm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexShrink: 1,
      maxWidth: '100%',
    },
    chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.tone.gray.text },

    guardian: { gap: 2 },
    guardianName: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    // textMuted, not textFaint: `textFaint` is white-on-dark ink and vanishes on a light card.
    guardianContact: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, opacity: 0.85 },

    progressWrap: { gap: 4 },
    progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    progressPct: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },

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
              const att = theme.tone[attendanceTone(s.attendancePct)];
              return (
                <View key={s._id} style={[styles.row, i < students.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowHead}>
                    <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                    <View style={[styles.attPill, { backgroundColor: att.bg }]}>
                      <Text style={[styles.attPillText, { color: att.text }]}>حضور {s.attendancePct}٪</Text>
                    </View>
                  </View>

                  {track && <Badge label={track} variant="gold" style={styles.trackBadge} />}

                  <View style={styles.chips}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>الحلقة: {getName(s.halqa)}</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>المسجد: {getName(s.masjid)}</Text>
                    </View>
                    {typeof s.level === 'number' && (
                      <View style={styles.chip}>
                        <Text style={styles.chipText} numberOfLines={1}>المستوى: {s.level}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.guardian}>
                    <Text style={styles.guardianName} numberOfLines={1}>ولي الأمر: {guardianName ?? '—'}</Text>
                    {guardianContact && (
                      <Text style={styles.guardianContact} numberOfLines={1}>{guardianContact}</Text>
                    )}
                  </View>

                  <View style={styles.progressWrap}>
                    <View style={styles.progressHead}>
                      <Text style={styles.progressLabel}>التقدم</Text>
                      <Text style={styles.progressPct}>{s.progressPct}٪</Text>
                    </View>
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
