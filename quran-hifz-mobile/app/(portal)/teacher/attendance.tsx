import { useMemo, useState } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconClock, IconCalendarOff, IconTrophy, IconCalendarCheck, IconHistory, IconMedal,
} from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Leaderboard, { type LeaderboardRow } from '@/components/ui/Leaderboard';
import { SkeletonRows } from '@/components/ui/Skeleton';
import ContextCard, { trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import DaySlider, { useDaySchedule, type DayEntry } from '@/components/domain/DaySlider';
import EvaluationRoster from '@/components/domain/EvaluationRoster';
import { useTracks } from '@/lib/queries/tracks';
import { useStudents } from '@/lib/queries/students';
import { useEvaluations } from '@/lib/queries/evaluations';
import { useQuranPlans } from '@/lib/queries/quranPlan';
import { MAX_SCORES, TOTAL_MAX, legacyScoresOf } from '@/lib/evaluationRubric';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { fmtDayLabel, toDateOnly } from '@/lib/date';

export default function TeacherAttendance() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);

  const {
    data: tracks = [], isLoading: loadingTracks, refetch: refetchTracks, isRefetching: refetchingTracks,
  } = useTracks(undefined, profileId);

  const contextFilter = selected ? { track: selected.id } : undefined;

  const {
    data: students = [], isLoading: loadingStudents, refetch: refetchStudents, isRefetching: refetchingStudents,
  } = useStudents(contextFilter);

  const { data: plans = [], isLoading: loadingPlans, refetch: refetchPlans, isRefetching: refetchingPlans } =
    useQuranPlans(contextFilter);
  const linkedPlan = plans.find((p) => p.targetType === 'track') ?? plans[0];

  // ── Day slider ─────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [dayNotice, setDayNotice] = useState<string | null>(null);
  // A track context can carry several plans at once, so every plan's schedule
  // feeds the same strip of days.
  const scheduleEntries = useMemo(
    () => plans.flatMap((p) => p.schedule ?? []),
    [plans],
  );
  const baseDaySchedule = useDaySchedule(scheduleEntries, selectedDate);
  // The day strip itself (scheduledSet/dayChips/effectiveDate, above) still
  // needs every plan in context so a day covered only by a stray unrelated
  // plan stays selectable. But the actual per-date assignment lookup must
  // only ever come from `linkedPlan` — otherwise a stray plan sharing this
  // weekday piles its entries into the same date bucket (colliding React
  // keys, colliding completion-override keys, and `recordOccurrence` calls
  // sent with `occurrenceIndex` values that belong to a different plan).
  const linkedAssignmentByDate = useMemo(() => {
    const byDate = new Map<string, DayEntry[]>();
    for (const e of linkedPlan?.schedule ?? []) {
      if (!e.date) continue;
      const d = toDateOnly(e.date);
      const list = byDate.get(d) ?? [];
      list.push(e);
      byDate.set(d, list);
    }
    return byDate;
  }, [linkedPlan]);
  const daySchedule = useMemo(
    () => ({ ...baseDaySchedule, assignmentByDate: linkedAssignmentByDate }),
    [baseDaySchedule, linkedAssignmentByDate],
  );
  const { scheduledSorted, effectiveDate, today, isFutureDay } = daySchedule;

  // Full session history for this context, for the log + leaderboards below.
  const { data: history = [] } = useEvaluations(contextFilter);

  const { topScoreRows, topAttendanceRows } = useMemo(() => {
    type Agg = { id: string; name: string; totalSum: number; sessions: number; present: number };
    const byStudent = new Map<string, Agg>();
    for (const r of history) {
      const id = typeof r.student === 'string' ? r.student : r.student._id;
      const name = typeof r.student === 'string' ? r.student : r.student.name;
      const agg = byStudent.get(id) ?? { id, name, totalSum: 0, sessions: 0, present: 0 };
      agg.totalSum += r.total;
      agg.sessions += 1;
      if (r.attendanceStatus === 'حاضر') agg.present += 1;
      byStudent.set(id, agg);
    }
    const all = Array.from(byStudent.values());
    const byScore: LeaderboardRow[] = [...all]
      .sort((a, b) => b.totalSum / b.sessions - a.totalSum / a.sessions)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        name: a.name,
        value: Math.round(a.totalSum / a.sessions),
        max: TOTAL_MAX,
        sub: a.sessions === 1 ? 'جلسة واحدة' : `متوسط ${a.sessions} جلسات`,
      }));
    const byAttendance: LeaderboardRow[] = [...all]
      .sort((a, b) => b.present / b.sessions - a.present / a.sessions)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        name: a.name,
        value: Math.round((a.present / a.sessions) * 100),
        max: 100,
        sub: `${a.present} من ${a.sessions} جلسة`,
      }));
    return { topScoreRows: byScore, topAttendanceRows: byAttendance };
  }, [history]);

  const isRefreshingSelection = refetchingTracks;
  const onRefreshSelection = () => { refetchTracks(); };
  const isRefreshingDetail = refetchingStudents || refetchingPlans;
  const onRefreshDetail = () => { refetchStudents(); refetchPlans(); };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },

    histRow: { paddingVertical: 9, gap: 4 },
    histTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    histName: { flex: 1, fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    histDate: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    histScores: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },

    spotTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4 },
    spotTitleText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
  }), [theme]);

  // ── View 1: context selector ────────────────────────────────────────────
  if (!selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshingSelection} onRefresh={onRefreshSelection} colors={[theme.spinner]} tintColor={theme.spinner} />}
        >
          {loadingTracks && <SkeletonRows count={3} rowHeight={92} />}
          {!loadingTracks && tracks.length === 0 && (
            <Text style={styles.muted}>لا توجد مسارات مسندة إليك</Text>
          )}
          {tracks.map((t) => (
            <Pressable key={t._id} onPress={() => setSelected(trackToContext(t))}>
              <ContextCard context={trackToContext(t)} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── View 2: day slider + per-student attendance/evaluation roster ────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshingDetail} onRefresh={onRefreshDetail} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <Pressable onPress={() => { setSelected(null); setSelectedDate(''); }}>
          <Text style={styles.backLink}>‹ رجوع لاختيار المسار</Text>
        </Pressable>

        {/* Day slider — only when this context has scheduled days */}
        {loadingPlans ? (
          <SkeletonRows count={1} rowHeight={44} />
        ) : (
          <DaySlider
            schedule={daySchedule}
            onSelect={(iso) => { setDayNotice(null); setSelectedDate(iso); }}
            onBlocked={(iso) => setDayNotice(`${fmtDayLabel(iso)} — هذا اليوم غير مشمول بخطة الحفظ الحالية`)}
          />
        )}

        {!!dayNotice && (
          <Alert variant="warning" icon={<IconCalendarOff size={16} color="#92400E" />}>{dayNotice}</Alert>
        )}

        {!loadingPlans && scheduledSorted.length === 0 && (
          <Alert variant="warning">
            لا يوجد خطة حفظ نشطة لهذا المسار — أضف خطة من صفحة "الخطط الفردية" أولاً لتفعيل التقويم.
          </Alert>
        )}

        {isFutureDay && (
          <Alert variant="warning" icon={<IconClock size={16} color="#92400E" />}>
            هذا اليوم لم يحن بعد — لا يمكن تسجيل الحضور والتقييم مسبقًا لجلسة لم تُعقد.
          </Alert>
        )}

        <Card>
          <CardHeader title={`${selected.title} — ${fmtDayLabel(effectiveDate)}`} />

          {loadingStudents && <SkeletonRows count={4} />}
          {!loadingStudents && (
            <EvaluationRoster
              students={students}
              context={{ id: selected.id }}
              teacherId={profileId}
              linkedPlan={linkedPlan}
              daySchedule={daySchedule}
            />
          )}
        </Card>

        {history.length > 0 && (
          <Card>
            <CardHeader title="سجل الجلسات" right={<IconHistory size={18} color={theme.green} />} />
            {history.map((r, i) => (
              <View key={r._id} style={[styles.histRow, i < history.length - 1 && styles.rowBorder]}>
                <View style={styles.histTop}>
                  <Text style={styles.histName}>
                    {typeof r.student === 'string' ? r.student : r.student.name}
                  </Text>
                  <Badge label={r.attendanceStatus} variant={r.attendanceStatus === 'حاضر' ? 'green' : 'red'} />
                  <Text style={styles.histDate}>{toDateOnly(r.date)}</Text>
                </View>
                <Text style={styles.histScores}>
                  حضور {legacyScoresOf(r).attendance}/{MAX_SCORES.attendance} · حفظ {legacyScoresOf(r).hifz}/{MAX_SCORES.hifz} ·
                  تجويد {legacyScoresOf(r).tajweed}/{MAX_SCORES.tajweed} · تلاوة {legacyScoresOf(r).talawah}/{MAX_SCORES.talawah} ·
                  المجموع {r.total}/{TOTAL_MAX}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {(topScoreRows.length > 0 || topAttendanceRows.length > 0) && (
          <Card>
            <CardHeader title="أبرز الطلاب" right={<IconMedal size={18} color={theme.gold} />} />
            {topScoreRows.length > 0 && (
              <>
                <View style={styles.spotTitle}>
                  <IconTrophy size={14} color={theme.gold} />
                  <Text style={styles.spotTitleText}>الأعلى تقييمًا</Text>
                </View>
                <Leaderboard rows={topScoreRows} />
              </>
            )}
            {topAttendanceRows.length > 0 && (
              <>
                <View style={styles.spotTitle}>
                  <IconCalendarCheck size={14} color={theme.green} />
                  <Text style={styles.spotTitleText}>الأعلى حضورًا</Text>
                </View>
                <Leaderboard rows={topAttendanceRows} />
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
