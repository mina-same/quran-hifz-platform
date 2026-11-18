import { useMemo, useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { IconDownload, IconFilter, IconX } from '@tabler/icons-react-native';
import Svg, { Polyline } from 'react-native-svg';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import StatsRow from '@/components/ui/StatsRow';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import Donut from '@/components/ui/Donut';
import Leaderboard, { type LeaderboardRow } from '@/components/ui/Leaderboard';
import Tile, { tileGridStyle } from '@/components/ui/Tile';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { useStudents, type StudentFilters } from '@/lib/queries/students';
import StudentReportPanel from '@/components/domain/StudentReportPanel';
import ReportChartLine from '@/components/domain/ReportChartLine';
import { shareCsv } from '@/lib/csv';
import { useEvaluations, type EvaluationRecord, type EvaluationScores } from '@/lib/queries/evaluations';
import type { Track } from '@/lib/queries/tracks';
import { KPI_STATUS, type KPI } from '@/lib/queries/kpis';
import ReportPromoPdfExport from '@/components/domain/ReportPromoPdfExport';
import { textStart } from '@/lib/theme';
import type { Teacher } from '@/lib/queries/teachers';
import { MAX_SCORES, TOTAL_MAX, legacyScoresOf } from '@/lib/evaluationRubric';
import { matchesGenderScope, teacherIdsInScope, type GenderScope } from '@/lib/constants/genderScope';

/* ── helpers (ported from quran-hifz/src/quran/components/common/ReportsDashboard.tsx) ── */

function studentIdOf(e: EvaluationRecord): string {
  return typeof e.student === 'string' ? e.student : e.student._id;
}
function studentNameOf(e: EvaluationRecord): string {
  return typeof e.student === 'string' ? e.student : e.student.name;
}
function evalTrackId(e: EvaluationRecord): string {
  return typeof e.track === 'object' ? (e.track?._id ?? '') : (e.track ?? '');
}
function evalTrackTitle(e: EvaluationRecord): string {
  return typeof e.track === 'object' ? (e.track?.title ?? '') : '';
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function avg(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}
function pctOfMax(avgScore: number, max: number): number {
  return Math.max(0, Math.min(100, Math.round((avgScore / max) * 100)));
}
/** Buckets a 0–100 progress metric into 4 ranges for the distribution donut. */
function bucket(vals: number[]) {
  return {
    high: vals.filter((v) => v >= 90).length,
    mid: vals.filter((v) => v >= 75 && v < 90).length,
    low: vals.filter((v) => v >= 50 && v < 75).length,
    risk: vals.filter((v) => v < 50).length,
  };
}

const DIM_META: { key: keyof EvaluationScores; label: string }[] = [
  { key: 'attendance', label: 'حضور' },
  { key: 'hifz', label: 'حفظ' },
  { key: 'tajweed', label: 'تجويد' },
  { key: 'talawah', label: 'تلاوة' },
];

/** «طالب واحد / طالبان / 3 طلاب / 11 طالباً» — Arabic counted-noun agreement (web studentsCount). */
function studentsCount(n: number): string {
  if (n === 1) return 'طالب واحد';
  if (n === 2) return 'طالبان';
  return `${n} ${n >= 3 && n <= 10 ? 'طلاب' : 'طالباً'}`;
}

function tierOf(v: number): 'ممتاز' | 'جيد' | 'متوسط' | 'ضعيف' {
  if (v >= 90) return 'ممتاز';
  if (v >= 75) return 'جيد';
  if (v >= 50) return 'متوسط';
  return 'ضعيف';
}
const TIER_TONE: Record<ReturnType<typeof tierOf>, BadgeVariant> = { ممتاز: 'green', جيد: 'blue', متوسط: 'gold', ضعيف: 'red' };

/** Minimal responsive line sparkline drawn with react-native-svg (no charting lib on RN). */
function Sparkline({ values, height, color }: { values: number[]; height: number; color: string }) {
  if (values.length < 2) return null;
  const w = 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const points = values.map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

interface Props {
  /** Scopes every widget to this cohort by default (admin: {} for school-wide; teacher: {track: '<id1>,<id2>,...'}). */
  baseFilter: StudentFilters;
  tracks: Track[];
  /** Label for the "no scope selected" tab, e.g. "كل المدرسة" / "كل مساراتي". */
  scopeAllLabel: string;
  showAdmin?: boolean;
  kpis?: KPI[];
  teachers?: Teacher[];
  genderScope?: GenderScope;
}

/** Shared reports engine driving both admin/reports.tsx and teacher/reports.tsx — mobile
 * adaptation of the web's bento-grid ReportsDashboard.tsx into a vertical stat-card stack. */
export default function ReportsScreen({ baseFilter, tracks, scopeAllLabel, showAdmin = false, kpis = [], teachers = [], genderScope = 'all' }: Props) {
  const theme = useAppTheme();
  const [scope, setScope] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: { gap: 14 },
        rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        bold: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
        muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 16 },
        mutedSmall: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
        heroEyebrow: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
        heroNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
        heroNumber: { fontSize: 36, fontFamily: theme.fontCairoBold, color: theme.text },
        heroMax: { fontSize: 15, fontFamily: theme.fontCairo, color: theme.textMuted },
        deltaChip: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: theme.radiusFull, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, gap: 4 },
        deltaUp: { backgroundColor: theme.greenPale },
        deltaDown: { backgroundColor: theme.redPale },
        deltaText: { fontSize: 11, fontFamily: theme.fontCairoBold },
        heroMeta: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 8 },
        trendLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
        halqaRow: { gap: 4 },
        exportList: { gap: 8 },
        exportBtn: {
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderWidth: 1, borderColor: theme.border, borderRadius: 8,
          paddingVertical: 10, paddingHorizontal: 12,
        },
        exportBtnDisabled: { opacity: 0.5 },
        exportText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
        scopeCount: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: textStart },
        scopeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
        scopeLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        scopeGroup: { gap: 6, marginTop: 10 },
        scopeGroupLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted, textAlign: textStart },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
        chip: { borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusFull, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.card },
        chipOn: { backgroundColor: theme.greenAccent, borderColor: theme.greenAccent },
        chipText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
        chipTextOn: { color: theme.white },
        clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radiusFull, borderWidth: 1, borderColor: theme.border },
        clearText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
        insight: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1 },
        insightText: { fontSize: 12, lineHeight: 20, fontFamily: theme.fontCairo, color: theme.text, textAlign: textStart },
        insightBold: { fontFamily: theme.fontCairoBold },
        kpiItem: { gap: 6 },
        kpiMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
      }),
    [theme],
  );

  /* ── scope ─────────────────────────────────────────────────────────── */
  const scopedFilter: StudentFilters = useMemo(() => {
    if (scope === '') return baseFilter;
    if (scope.startsWith('track:')) return { track: scope.slice(6) };
    return baseFilter;
  }, [scope, baseFilter]);

  // Tracks under a masjid outside the active gender scope — every list/stat
  // below is scoped through this, the same join key admin/teachers.tsx uses.
  const scopedTracks = useMemo(
    () => tracks.filter((t) => matchesGenderScope(t.masjid, genderScope)),
    [tracks, genderScope],
  );
  const scopedTrackIds = useMemo(() => new Set(scopedTracks.map((t) => t._id)), [scopedTracks]);
  const scopedTeacherIds = useMemo(() => teacherIdsInScope(tracks, genderScope), [tracks, genderScope]);

  // Halqas grouped under their masjid for the scope picker (web scopeGroups);
  // the masjid suffix in a halqa's title («الإتقان أ - جامع النور») is dropped inside its group.
  const scopeGroups = useMemo(() => {
    const groups = new Map<string, { label: string; tracks: { value: string; label: string }[] }>();
    for (const t of scopedTracks) {
      const mj = typeof t.masjid === 'object' ? t.masjid : null;
      const name = mj?.name ?? 'حلقات أخرى';
      const label = mj?.gender && genderScope === 'all' ? `${name} — ${mj.gender === 'female' ? 'بنات' : 'بنين'}` : name;
      const short = mj?.name ? t.title.replace(new RegExp(`\\s*-\\s*${mj.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '') : t.title;
      if (!groups.has(label)) groups.set(label, { label, tracks: [] });
      groups.get(label)!.tracks.push({ value: `track:${t._id}`, label: short || t.title });
    }
    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [scopedTracks, genderScope]);

  const { data: rawStudents = [], isLoading: studentsLoading } = useStudents(scopedFilter);
  const { data: rawEvaluations = [], isLoading: evalLoading } = useEvaluations(scopedFilter);
  const students = useMemo(
    () => rawStudents.filter((s) => matchesGenderScope(typeof s.track === 'string' ? undefined : s.track.masjid, genderScope)),
    [rawStudents, genderScope],
  );
  // Excused (مستأذن) sessions carry no grades — excluded from every average.
  const evaluations = useMemo(() => {
    const graded = rawEvaluations.filter((e) => e.attendanceStatus !== 'مستأذن');
    if (genderScope === 'all') return graded;
    return graded.filter((e) => {
      const id = evalTrackId(e);
      return !id || scopedTrackIds.has(id);
    });
  }, [rawEvaluations, genderScope, scopedTrackIds]);
  const loading = studentsLoading || evalLoading;

  /* ── cohort overview (attendance/progress — independent of evaluations) ── */
  const m = useMemo(() => {
    const n = students.length;
    const avgAtt = n ? Math.round(avg(students.map((s) => s.attendancePct ?? 0))) : 0;
    const avgProg = n ? Math.round(avg(students.map((s) => s.progressPct ?? 0))) : 0;
    // Needs follow-up: ≥ 3 evaluated days in scope and either absent > 25% of
    // them or averaging < 5/10 on the days present. (Student.progressPct is not
    // maintained — it is 0 for everyone — so it can't drive this; web parity.)
    const per = new Map<string, { days: number; absent: number; score: number; max: number }>();
    for (const e of evaluations) {
      const id = studentIdOf(e);
      const a = per.get(id) ?? { days: 0, absent: 0, score: 0, max: 0 };
      a.days += 1;
      if (e.attendanceStatus === 'غائب') a.absent += 1;
      else { a.score += e.total; a.max += e.totalMax ?? 10; }
      per.set(id, a);
    }
    const atRisk = students.filter((st) => {
      const a = per.get(st._id);
      if (!a || a.days < 3) return false;
      return a.absent / a.days > 0.25 || (a.max > 0 && a.score / a.max < 0.5);
    });
    return { n, avgAtt, avgProg, atRisk };
  }, [students, evaluations]);
  const progBuckets = useMemo(() => bucket(students.map((s) => s.progressPct ?? 0)), [students]);

  /* ── evaluation rubric aggregate ──────────────────────────────────── */
  const evalStats = useMemo(() => {
    if (evaluations.length === 0) return null;
    const sums: EvaluationScores & { total: number } = { attendance: 0, hifz: 0, tajweed: 0, talawah: 0, total: 0 };
    for (const e of evaluations) {
      sums.attendance += legacyScoresOf(e).attendance;
      sums.hifz += legacyScoresOf(e).hifz;
      sums.tajweed += legacyScoresOf(e).tajweed;
      sums.talawah += legacyScoresOf(e).talawah;
      sums.total += e.total;
    }
    const n = evaluations.length;
    const dims = DIM_META.map((d) => ({
      key: d.key,
      label: d.label,
      avgRaw: round1(sums[d.key] / n),
      pctVal: pctOfMax(sums[d.key] / n, MAX_SCORES[d.key]),
    }));
    const weakest = [...dims].sort((a, b) => a.pctVal - b.pctVal)[0];
    return { dims, avgTotal: round1(sums.total / n), avgTotalPct: pctOfMax(sums.total / n, TOTAL_MAX), sessions: n, weakest };
  }, [evaluations]);
  const dimColor: Record<keyof EvaluationScores, string> = {
    attendance: theme.brown,
    hifz: theme.green,
    tajweed: theme.blue,
    talawah: theme.gold,
  };

  /* ── cohort-wide trend: avg total score per evaluation date ─────────── */
  const trendData = useMemo(() => {
    const byDate = new Map<string, { sum: number; count: number }>();
    for (const e of evaluations) {
      const key = e.date.slice(0, 10);
      const entry = byDate.get(key) ?? { sum: 0, count: 0 };
      entry.sum += e.total;
      entry.count += 1;
      byDate.set(key, entry);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => {
        const d = new Date(date);
        return { label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, avg: round1(v.sum / v.count) };
      });
  }, [evaluations]);

  /* ── half-over-half delta (recent sessions vs earlier ones) per dimension + total.
     Requires ≥8 samples total (so each half has ≥4) — a 3-vs-3 split on thin
     data can swing wildly and read as a false trend. See cerebrum 2026-07-04. ── */
  const halfSplit = useMemo(() => {
    if (evaluations.length < 8) return null;
    const sorted = [...evaluations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const half = Math.floor(sorted.length / 2);
    const first = sorted.slice(0, half);
    const second = sorted.slice(half);
    const deltaOf = (pick: (e: EvaluationRecord) => number) => round1(avg(second.map(pick)) - avg(first.map(pick)));
    return {
      total: deltaOf((e) => e.total),
      attendance: deltaOf((e) => legacyScoresOf(e).attendance),
      hifz: deltaOf((e) => legacyScoresOf(e).hifz),
      tajweed: deltaOf((e) => legacyScoresOf(e).tajweed),
      talawah: deltaOf((e) => legacyScoresOf(e).talawah),
    };
  }, [evaluations]);
  const totalDelta = halfSplit?.total ?? null;

  /* ── track comparison (only meaningful with >1 track in scope) ───────── */
  const trackEvalStats = useMemo(() => {
    const map = new Map<string, { name: string; sums: EvaluationScores & { total: number }; count: number }>();
    for (const e of evaluations) {
      const id = evalTrackId(e);
      if (!id) continue;
      const name = evalTrackTitle(e) || scopedTracks.find((t) => t._id === id)?.title || '—';
      const entry = map.get(id) ?? { name, sums: { attendance: 0, hifz: 0, tajweed: 0, talawah: 0, total: 0 }, count: 0 };
      entry.sums.attendance += legacyScoresOf(e).attendance;
      entry.sums.hifz += legacyScoresOf(e).hifz;
      entry.sums.tajweed += legacyScoresOf(e).tajweed;
      entry.sums.talawah += legacyScoresOf(e).talawah;
      entry.sums.total += e.total;
      entry.count += 1;
      map.set(id, entry);
    }
    return Array.from(map.values())
      .map((e) => ({
        name: e.name,
        avgTotal: round1(e.sums.total / e.count),
        avgAttendance: pctOfMax(e.sums.attendance / e.count, MAX_SCORES.attendance),
        avgHifz: pctOfMax(e.sums.hifz / e.count, MAX_SCORES.hifz),
        avgTajweed: pctOfMax(e.sums.tajweed / e.count, MAX_SCORES.tajweed),
        avgTalawah: pctOfMax(e.sums.talawah / e.count, MAX_SCORES.talawah),
        count: e.count,
      }))
      .sort((a, b) => b.avgTotal - a.avgTotal);
  }, [evaluations, scopedTracks]);

  /* ── per-student evaluation leaderboards ─────────────────────────────── */
  const studentEvalStats = useMemo(() => {
    const map = new Map<string, { name: string; sum: number; count: number }>();
    for (const e of evaluations) {
      const id = studentIdOf(e);
      const name = studentNameOf(e);
      const entry = map.get(id) ?? { name, sum: 0, count: 0 };
      entry.sum += e.total;
      entry.count += 1;
      map.set(id, entry);
    }
    return Array.from(map.entries()).map(([id, e]) => ({ id, name: e.name, avgTotal: round1(e.sum / e.count), count: e.count }));
  }, [evaluations]);

  const evalTop: LeaderboardRow[] = useMemo(
    () =>
      [...studentEvalStats]
        .sort((a, b) => b.avgTotal - a.avgTotal)
        .slice(0, 8)
        .map((s) => ({ id: s.id, name: s.name, value: s.avgTotal, max: TOTAL_MAX, display: `${s.avgTotal}/${TOTAL_MAX}`, sub: `${s.count} جلسة تقييم` })),
    [studentEvalStats],
  );
  const evalWatch: LeaderboardRow[] = useMemo(
    () =>
      [...studentEvalStats]
        .filter((s) => s.avgTotal < 6)
        .sort((a, b) => a.avgTotal - b.avgTotal)
        .slice(0, 8)
        .map((s) => ({ id: s.id, name: s.name, value: s.avgTotal, max: TOTAL_MAX, display: `${s.avgTotal}/${TOTAL_MAX}`, sub: `${s.count} جلسة تقييم · تقييم منخفض` })),
    [studentEvalStats],
  );

  /* ── admin-only teacher workload ──────────────────────────────────────── */
  const teacherRows = useMemo(
    () =>
      (teachers ?? [])
        .filter((t) => genderScope === 'all' || scopedTeacherIds.has(t._id))
        .slice()
        .sort((a, b) => (b.studentCount ?? 0) - (a.studentCount ?? 0))
        .slice(0, 10)
        .map((t) => ({ id: t._id, name: t.name, count: t.studentCount ?? 0 })),
    [teachers, genderScope, scopedTeacherIds],
  );

  const noStudentsMsg = scope
    ? 'لا يوجد طلاب في هذا النطاق بعد'
    : showAdmin
      ? 'لا يوجد طلاب مسجلون بعد — أضف طلابًا لعرض التقارير'
      : 'لا يوجد طلاب في مساراتك بعد';

  /* ── auto insights (web ReportsDashboard) ─────────────────────────────── */
  const B = ({ children }: { children: ReactNode }) => <Text style={styles.insightBold}>{children}</Text>;
  type Insight = { key: string; tone: 'warning' | 'success' | 'danger' | 'info'; text: ReactNode };
  const insights: Insight[] = [];
  if (!loading) {
    if (evalStats && evalStats.weakest.pctVal < 70) {
      insights.push({ key: 'weak', tone: 'warning', text: <>«<B>{evalStats.weakest.label}</B>» أضعف معايير التقييم — متوسطه <B>{evalStats.weakest.pctVal}٪</B>، يُنصح بالتركيز عليه في الحلقات القادمة</> });
    }
    if (halfSplit && halfSplit.total >= 0.3) {
      insights.push({ key: 'trend-up', tone: 'success', text: 'متوسط التقييم في تحسّن مستمر خلال آخر الجلسات' });
    } else if (halfSplit && halfSplit.total <= -0.3) {
      insights.push({ key: 'trend-down', tone: 'danger', text: 'متوسط التقييم في تراجع خلال آخر الجلسات — يستحق المتابعة' });
    }
    if (scope === '' && trackEvalStats.length > 1) {
      insights.push({ key: 'top-track', tone: 'info', text: <>حلقة «<B>{trackEvalStats[0].name}</B>» تتصدّر التقييم بمتوسط <B>{trackEvalStats[0].avgTotal}/{TOTAL_MAX}</B></> });
    }
    if (m.atRisk.length > 0) {
      insights.push({ key: 'risk', tone: 'danger', text: <><B>{studentsCount(m.atRisk.length)}</B> {m.atRisk.length === 1 ? 'يحتاج' : 'يحتاجون'} متابعة — غياب أكثر من ٢٥٪ أو متوسط دون ٥ من ١٠</> });
    }
  }
  const insightTone = { warning: theme.tone.gold, success: theme.tone.green, danger: theme.tone.red, info: theme.tone.blue };
  const maxTeacherCount = teacherRows.reduce((mx, r) => Math.max(mx, r.count), 0) || 1;

  /* ── exports: the phone has no download, so each report goes out through the
   *  OS share sheet (Mail / Files / Drive) with the same columns as the web. ── */
  const exportItems = [
    {
      label: 'تقرير التقييمات',
      disabled: evaluations.length === 0,
      run: () => shareCsv(
        'تقرير التقييمات',
        ['الطالب', 'التاريخ', 'حضور', 'حفظ', 'تجويد', 'تلاوة', 'المجموع'],
        evaluations.map((e) => [
          studentNameOf(e), e.date.slice(0, 10),
          legacyScoresOf(e).attendance, legacyScoresOf(e).hifz, legacyScoresOf(e).tajweed, legacyScoresOf(e).talawah, e.total,
        ]),
      ),
    },
    {
      label: 'مقارنة المسارات (تقييم)',
      disabled: trackEvalStats.length === 0,
      run: () => shareCsv(
        'تقرير المسارات - تقييم',
        ['المسار', 'متوسط الحضور', 'متوسط الحفظ', 'متوسط التجويد', 'متوسط التلاوة', 'المتوسط الكلي', 'عدد الجلسات'],
        trackEvalStats.map((t) => [
          t.name, `${t.avgAttendance}%`, `${t.avgHifz}%`, `${t.avgTajweed}%`, `${t.avgTalawah}%`, t.avgTotal, t.count,
        ]),
      ),
    },
    {
      label: 'تقرير ذوي المتابعة',
      disabled: m.atRisk.length === 0,
      run: () => shareCsv(
        'تقرير الطلاب ذوي المتابعة',
        ['الطالب', 'المسار', 'نسبة الحضور', 'نسبة الإنجاز'],
        m.atRisk.map((st) => [
          st.name,
          typeof st.track === 'object' && st.track ? st.track.title : '—',
          `${st.attendancePct}%`,
          `${st.progressPct}%`,
        ]),
      ),
    },
  ];

  const selectedTrackForTitle = scopedTracks.find((t) => `track:${t._id}` === scope);
  const aggregateTitle = selectedTrackForTitle
    ? `مقارنة طلاب ${selectedTrackForTitle.title}`
    : showAdmin
      ? 'متوسط الدرجات لكل طلاب المدرسة'
      : 'متوسط الدرجات لطلابك';

  return (
    <>
      <StatsRow
        stats={[
          { label: 'متوسط التقييم العام', value: evalStats ? `${evalStats.avgTotal}/${TOTAL_MAX}` : '—', color: theme.gold },
          { label: 'متوسط الحضور', value: `${m.avgAtt}٪`, color: theme.blue },
          { label: 'متوسط إنجاز الحفظ', value: `${m.avgProg}٪`, color: theme.green },
          { label: 'ذوو المتابعة', value: m.atRisk.length, color: m.atRisk.length > 0 ? theme.red : theme.green },
        ]}
      />

      {students.length > 0 && (
        <Card>
          <CardHeader title="تصدير التقارير" />
          <View style={styles.exportList}>
            {exportItems.map((it) => (
              <Pressable
                key={it.label}
                style={[styles.exportBtn, it.disabled && styles.exportBtnDisabled]}
                disabled={it.disabled}
                onPress={it.run}
              >
                <IconDownload size={15} color={it.disabled ? theme.textMuted : theme.green} />
                <Text style={[styles.exportText, it.disabled && { color: theme.textMuted }]}>{it.label}</Text>
              </Pressable>
            ))}
          </View>
          {showAdmin && <ReportPromoPdfExport />}
        </Card>
      )}

      {scopeGroups.length > 0 && (
        <Card>
          <View style={styles.scopeHead}>
            <View style={styles.scopeLabel}>
              <IconFilter size={14} color={theme.textMuted} />
              <Text style={styles.bold}>نطاق التقرير</Text>
            </View>
            {!!scope && (
              <Pressable style={styles.clearBtn} onPress={() => setScope('')} haptic="select">
                <IconX size={12} color={theme.textMuted} />
                <Text style={styles.clearText}>عرض كل الطلاب</Text>
              </Pressable>
            )}
          </View>
          <View style={[styles.chipRow, { marginTop: 10 }]}>
            <Pressable style={[styles.chip, scope === '' && styles.chipOn]} onPress={() => setScope('')} haptic="select">
              <Text style={[styles.chipText, scope === '' && styles.chipTextOn]}>{scopeAllLabel}</Text>
            </Pressable>
          </View>
          {scopeGroups.map((g) => (
            <View key={g.label} style={styles.scopeGroup}>
              <Text style={styles.scopeGroupLabel}>{g.label}</Text>
              <View style={styles.chipRow}>
                {g.tracks.map((t) => (
                  <Pressable key={t.value} style={[styles.chip, scope === t.value && styles.chipOn]} onPress={() => setScope(t.value)} haptic="select">
                    <Text style={[styles.chipText, scope === t.value && styles.chipTextOn]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <Text style={[styles.scopeCount, { marginTop: 10 }]}>{studentsCount(students.length)} في هذا النطاق</Text>
        </Card>
      )}

      {insights.map((it) => (
        <View key={it.key} style={[styles.insight, { backgroundColor: insightTone[it.tone].bg, borderColor: insightTone[it.tone].border }]}>
          <Text style={[styles.insightText, { color: insightTone[it.tone].text }]}>{it.text}</Text>
        </View>
      ))}

      {loading ? (
        <Card>
          <SkeletonRows count={5} />
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <Alert variant="info">{noStudentsMsg}</Alert>
        </Card>
      ) : (
        <>
          {!evalStats ? (
            <Card>
              <Alert variant="info">لا توجد تقييمات مسجّلة بعد لهذا النطاق</Alert>
            </Card>
          ) : (
            <>
              {/* Hero: big headline number + sparkline + guarded trend delta */}
              <Card>
                <Text style={styles.heroEyebrow}>الأداء العام</Text>
                <View style={styles.heroNumberRow}>
                  <Text style={styles.heroNumber}>{evalStats.avgTotal}</Text>
                  <Text style={styles.heroMax}>/ {TOTAL_MAX}</Text>
                  <Badge label={tierOf(evalStats.avgTotalPct)} variant={TIER_TONE[tierOf(evalStats.avgTotalPct)]} />
                </View>
                {totalDelta !== null && Math.abs(totalDelta) >= 0.1 && (
                  <View style={[styles.deltaChip, totalDelta > 0 ? styles.deltaUp : styles.deltaDown]}>
                    <Text style={[styles.deltaText, { color: totalDelta > 0 ? theme.green : theme.red }]}>
                      {totalDelta > 0 ? '▲' : '▼'} {Math.abs(totalDelta)} عن الفترة السابقة
                    </Text>
                  </View>
                )}
                <View style={{ height: 44, marginTop: 12 }}>
                  <Sparkline values={trendData.map((d) => d.avg)} height={44} color={theme.gold} />
                </View>
                <Text style={styles.heroMeta}>{evalStats.sessions} جلسة تقييم مسجّلة</Text>
              </Card>

              {/* 4 rubric-dimension tiles */}
              <View style={tileGridStyle}>
                {evalStats.dims.map((d) => (
                  <Tile
                    key={d.key}
                    label={d.label}
                    value={`${d.pctVal}٪`}
                    sub={halfSplit && Math.abs(halfSplit[d.key]) >= 0.1 ? (halfSplit[d.key] > 0 ? '▲' : '▼') : undefined}
                    color={dimColor[d.key]}
                    span={1}
                  />
                ))}
              </View>

              {/* Cohort-wide trend */}
              <Card>
                <CardHeader title="تطور متوسط التقييم عبر الزمن" />
                {trendData.length < 2 ? (
                  <Text style={styles.muted}>يلزم أكثر من جلسة تقييم واحدة لعرض الاتجاه</Text>
                ) : (
                  <ReportChartLine data={trendData.map((d) => ({ label: d.label, value: d.avg }))} color={theme.greenAccent} area valueLabel="متوسط التقييم" />
                )}
              </Card>

              {/* Top achievers / needs-attention */}
              <Card>
                <CardHeader title="الأعلى تقييماً" />
                {evalTop.length > 0 ? <Leaderboard rows={evalTop} variant="leader" /> : <Text style={styles.muted}>لا توجد تقييمات كافية بعد</Text>}
              </Card>
              <Card>
                <CardHeader title="بحاجة لمتابعة" right={<Badge label={`${evalWatch.length}`} variant="red" />} />
                {evalWatch.length > 0 ? (
                  <Leaderboard rows={evalWatch} variant="watch" />
                ) : (
                  <Text style={styles.muted}>لا يوجد طلاب بتقييم منخفض — الحمد لله</Text>
                )}
              </Card>
              {/* Track comparison — only when more than one track has eval data in scope */}
              {trackEvalStats.length > 1 && (
                <Card>
                  <CardHeader title="مقارنة المسارات في التقييم" subtitle={`${trackEvalStats.length} مسار`} />
                  <View style={styles.section}>
                    {trackEvalStats.map((t) => (
                      <View key={t.name} style={styles.halqaRow}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.bold} numberOfLines={1}>{t.name}</Text>
                          <Text style={[styles.bold, { color: theme.green }]}>{t.avgTotal}/{TOTAL_MAX}</Text>
                        </View>
                        <ProgressBar value={t.avgTotal} max={TOTAL_MAX} color={theme.green} showPercent={false} />
                        <Text style={styles.mutedSmall}>
                          حضور {t.avgAttendance}٪ · حفظ {t.avgHifz}٪ · تجويد {t.avgTajweed}٪ · تلاوة {t.avgTalawah}٪ · {t.count} جلسة
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              {/* Hifz-progress distribution — independent of evaluations */}
              <Card>
                <CardHeader title="توزيع إنجاز الحفظ" />
                <Donut
                  data={[
                    { label: 'ممتاز (٩٠٪+)', value: progBuckets.high, color: theme.green },
                    { label: 'جيد (٧٥–٩٠٪)', value: progBuckets.mid, color: theme.greenLight },
                    { label: 'متوسط (٥٠–٧٥٪)', value: progBuckets.low, color: theme.gold },
                    { label: 'دون ٥٠٪', value: progBuckets.risk, color: theme.red },
                  ]}
                  centerValue={`${m.avgProg}٪`}
                  centerLabel="متوسط الإنجاز"
                />
              </Card>

              {/* Admin-only: org-wide teacher workload */}
              {showAdmin && teacherRows.length > 0 && (
                <Card>
                  <CardHeader title="توزيع عبء المعلمين" subtitle={`${teacherRows.length} معلم`} />
                  <View style={styles.section}>
                    {teacherRows.map((t) => (
                      <View key={t.id} style={styles.halqaRow}>
                        <View style={styles.rowBetween}>
                          <Text style={[styles.bold, { flex: 1 }]} numberOfLines={1}>{t.name}</Text>
                          <Text style={styles.bold}>{t.count}</Text>
                        </View>
                        <ProgressBar value={t.count} max={maxTeacherCount} color={theme.greenLight} showPercent={false} />
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              {/* Admin-only: org-wide KPI scorecard */}
              {showAdmin && kpis.length > 0 && (
                <Card>
                  <CardHeader title="مؤشرات الأداء" subtitle="تقييم المؤسسة" />
                  <View style={styles.section}>
                    {kpis.map((k) => (
                      <View key={k._id} style={styles.kpiItem}>
                        <View style={styles.rowBetween}>
                          <Text style={[styles.bold, { flex: 1 }]}>{k.indicator}</Text>
                          <Text style={styles.bold}>{k.actual} / {k.target}</Text>
                        </View>
                        <ProgressBar value={k.progress} showPercent={false} />
                        <View style={styles.kpiMeta}>
                          <Badge label={KPI_STATUS[k.status].label} variant={KPI_STATUS[k.status].variant} />
                          <Text style={[styles.mutedSmall, { flex: 1, textAlign: textStart }]}>{k.hint}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              {/* Detailed per-student report — mirrors the web's StudentReportPanel */}
              <StudentReportPanel
                students={students.map((st) => ({ _id: st._id, name: st.name }))}
                aggregateFilter={scopedFilter}
                aggregateTitle={aggregateTitle}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
