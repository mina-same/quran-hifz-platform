import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Svg, { Polyline } from 'react-native-svg';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import StatsRow from '@/components/ui/StatsRow';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import Donut from '@/components/ui/Donut';
import Leaderboard, { type LeaderboardRow } from '@/components/ui/Leaderboard';
import ScopeTabs from '@/components/ui/ScopeTabs';
import Tile, { tileGridStyle } from '@/components/ui/Tile';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { useStudents, type StudentFilters } from '@/lib/queries/students';
import { useEvaluations, type EvaluationRecord, type EvaluationScores } from '@/lib/queries/evaluations';
import type { Halqa } from '@/lib/queries/halqat';
import type { SpecialTrack } from '@/lib/queries/specialTracks';
import type { KPI } from '@/lib/queries/kpis';
import type { Teacher } from '@/lib/queries/teachers';
import { MAX_SCORES, TOTAL_MAX } from '@/lib/evaluationRubric';

/* ── helpers (ported from quran-hifz/src/quran/components/common/ReportsDashboard.tsx) ── */

function studentIdOf(e: EvaluationRecord): string {
  return typeof e.student === 'string' ? e.student : e.student._id;
}
function studentNameOf(e: EvaluationRecord): string {
  return typeof e.student === 'string' ? e.student : e.student.name;
}
function evalHalqaId(e: EvaluationRecord): string {
  return typeof e.halqa === 'object' ? (e.halqa?._id ?? '') : (e.halqa ?? '');
}
function evalHalqaName(e: EvaluationRecord): string {
  return typeof e.halqa === 'object' ? (e.halqa?.name ?? '') : '';
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

const KPI_TONE: Record<KPI['rating'], import('@/components/ui/Badge').BadgeVariant> = {
  ممتاز: 'green',
  جيد: 'blue',
  مقبول: 'gold',
  ضعيف: 'red',
};

function kpiToneColor(rating: KPI['rating'], theme: { green: string; blue: string; gold: string; red: string; textMuted: string }): string {
  const tone = KPI_TONE[rating];
  return tone === 'green' ? theme.green : tone === 'blue' ? theme.blue : tone === 'gold' ? theme.gold : tone === 'red' ? theme.red : theme.textMuted;
}

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
  /** Scopes every widget to this cohort by default (admin: {} for school-wide; teacher: {halqa: '<id1>,<id2>,...'}). */
  baseFilter: StudentFilters;
  halqat: Halqa[];
  tracks: SpecialTrack[];
  /** Label for the "no scope selected" tab, e.g. "كل المدرسة" / "كل حلقاتي". */
  scopeAllLabel: string;
  showAdmin?: boolean;
  kpis?: KPI[];
  teachers?: Teacher[];
}

/** Shared reports engine driving both admin/reports.tsx and teacher/reports.tsx — mobile
 * adaptation of the web's bento-grid ReportsDashboard.tsx into a vertical stat-card stack. */
export default function ReportsScreen({ baseFilter, halqat, tracks, scopeAllLabel, showAdmin = false, kpis = [], teachers = [] }: Props) {
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
      }),
    [theme],
  );

  /* ── scope ─────────────────────────────────────────────────────────── */
  const scopedFilter: StudentFilters = useMemo(() => {
    if (scope === '') return baseFilter;
    if (scope.startsWith('halqa:')) return { halqa: scope.slice(6) };
    if (scope.startsWith('track:')) return { specialTrack: scope.slice(6) };
    return baseFilter;
  }, [scope, baseFilter]);

  const scopeOptions = useMemo(() => {
    const opts = [{ value: '', label: scopeAllLabel }];
    halqat.forEach((h) => opts.push({ value: `halqa:${h._id}`, label: h.name }));
    tracks.forEach((t) => opts.push({ value: `track:${t._id}`, label: t.title }));
    return opts;
  }, [halqat, tracks, scopeAllLabel]);

  const { data: students = [], isLoading: studentsLoading } = useStudents(scopedFilter);
  const { data: evaluations = [], isLoading: evalLoading } = useEvaluations(scopedFilter);
  const loading = studentsLoading || evalLoading;

  /* ── cohort overview (attendance/progress — independent of evaluations) ── */
  const m = useMemo(() => {
    const n = students.length;
    const avgAtt = n ? Math.round(avg(students.map((s) => s.attendancePct ?? 0))) : 0;
    const avgProg = n ? Math.round(avg(students.map((s) => s.progressPct ?? 0))) : 0;
    const atRisk = students.filter((s) => (s.attendancePct ?? 0) < 75 || (s.progressPct ?? 0) < 50);
    return { n, avgAtt, avgProg, atRisk };
  }, [students]);
  const progBuckets = useMemo(() => bucket(students.map((s) => s.progressPct ?? 0)), [students]);

  /* ── evaluation rubric aggregate ──────────────────────────────────── */
  const evalStats = useMemo(() => {
    if (evaluations.length === 0) return null;
    const sums: EvaluationScores & { total: number } = { attendance: 0, hifz: 0, tajweed: 0, talawah: 0, total: 0 };
    for (const e of evaluations) {
      sums.attendance += e.scores.attendance;
      sums.hifz += e.scores.hifz;
      sums.tajweed += e.scores.tajweed;
      sums.talawah += e.scores.talawah;
      sums.total += e.total;
    }
    const n = evaluations.length;
    const dims = DIM_META.map((d) => ({
      key: d.key,
      label: d.label,
      avgRaw: round1(sums[d.key] / n),
      pctVal: pctOfMax(sums[d.key] / n, MAX_SCORES[d.key]),
    }));
    return { dims, avgTotal: round1(sums.total / n), sessions: n };
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

  /* ── half-over-half delta (recent sessions vs earlier ones), total only.
     Requires ≥8 samples total (so each half has ≥4) — a 3-vs-3 split on thin
     data can swing wildly and read as a false trend. See cerebrum 2026-07-04. ── */
  const totalDelta = useMemo(() => {
    if (evaluations.length < 8) return null;
    const sorted = [...evaluations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const half = Math.floor(sorted.length / 2);
    const first = sorted.slice(0, half);
    const second = sorted.slice(half);
    return round1(avg(second.map((e) => e.total)) - avg(first.map((e) => e.total)));
  }, [evaluations]);

  /* ── halqa comparison (only meaningful with >1 halqa in scope) ───────── */
  const halqaEvalStats = useMemo(() => {
    const map = new Map<string, { name: string; sums: EvaluationScores & { total: number }; count: number }>();
    for (const e of evaluations) {
      const id = evalHalqaId(e);
      if (!id) continue;
      const name = evalHalqaName(e) || halqat.find((h) => h._id === id)?.name || '—';
      const entry = map.get(id) ?? { name, sums: { attendance: 0, hifz: 0, tajweed: 0, talawah: 0, total: 0 }, count: 0 };
      entry.sums.attendance += e.scores.attendance;
      entry.sums.hifz += e.scores.hifz;
      entry.sums.tajweed += e.scores.tajweed;
      entry.sums.talawah += e.scores.talawah;
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
  }, [evaluations, halqat]);

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
        .map((s) => ({ id: s.id, name: s.name, value: s.avgTotal, max: TOTAL_MAX, sub: `${s.count} جلسة تقييم` })),
    [studentEvalStats],
  );
  const evalWatch: LeaderboardRow[] = useMemo(
    () =>
      [...studentEvalStats]
        .filter((s) => s.avgTotal < 6)
        .sort((a, b) => a.avgTotal - b.avgTotal)
        .slice(0, 8)
        .map((s) => ({ id: s.id, name: s.name, value: s.avgTotal, max: TOTAL_MAX, sub: `${s.count} جلسة تقييم` })),
    [studentEvalStats],
  );

  /* ── admin-only teacher workload ──────────────────────────────────────── */
  const teacherRows = useMemo(
    () =>
      (teachers ?? [])
        .slice()
        .sort((a, b) => (b.studentCount ?? 0) - (a.studentCount ?? 0))
        .slice(0, 10)
        .map((t) => ({ id: t._id, name: t.name, count: t.studentCount ?? 0 })),
    [teachers],
  );

  const noStudentsMsg = scope
    ? 'لا يوجد طلاب في هذا النطاق بعد'
    : showAdmin
      ? 'لا يوجد طلاب مسجلون بعد — أضف طلابًا لعرض التقارير'
      : 'لا يوجد طلاب في حلقاتك بعد';

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

      {scopeOptions.length > 1 && <ScopeTabs options={scopeOptions} value={scope} onChange={setScope} />}

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
              <Alert variant="info">لا توجد تقييمات مسجّلة بعد</Alert>
            </Card>
          ) : (
            <>
              {/* Hero: big headline number + sparkline + guarded trend delta */}
              <Card>
                <Text style={styles.heroEyebrow}>الأداء العام</Text>
                <View style={styles.heroNumberRow}>
                  <Text style={styles.heroNumber}>{evalStats.avgTotal}</Text>
                  <Text style={styles.heroMax}>/ {TOTAL_MAX}</Text>
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
                    sub={`${d.avgRaw}/${MAX_SCORES[d.key]}`}
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
                  <>
                    <View style={{ height: 90 }}>
                      <Sparkline values={trendData.map((d) => d.avg)} height={90} color={theme.green} />
                    </View>
                    <View style={styles.trendLabelsRow}>
                      <Text style={styles.mutedSmall}>{trendData[0].label}</Text>
                      <Text style={styles.mutedSmall}>{trendData[trendData.length - 1].label}</Text>
                    </View>
                  </>
                )}
              </Card>

              {/* Halqa comparison — only when more than one halqa has eval data in scope */}
              {halqaEvalStats.length > 1 && (
                <Card>
                  <CardHeader title="مقارنة الحلقات في التقييم" subtitle={`${halqaEvalStats.length} حلقة`} />
                  <View style={styles.section}>
                    {halqaEvalStats.map((h) => (
                      <View key={h.name} style={styles.halqaRow}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.bold} numberOfLines={1}>{h.name}</Text>
                          <Text style={[styles.bold, { color: theme.green }]}>{h.avgTotal}/{TOTAL_MAX}</Text>
                        </View>
                        <ProgressBar value={h.avgTotal} max={TOTAL_MAX} color={theme.green} showPercent={false} />
                        <Text style={styles.mutedSmall}>
                          حضور {h.avgAttendance}٪ · حفظ {h.avgHifz}٪ · تجويد {h.avgTajweed}٪ · تلاوة {h.avgTalawah}٪ · {h.count} جلسة
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

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
            </>
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
        </>
      )}

      {/* Admin-only: org-wide KPI scorecard */}
      {showAdmin && kpis.length > 0 && (
        <Card>
          <CardHeader title="مؤشرات الأداء" subtitle="تقييم المؤسسة" />
          <View style={tileGridStyle}>
            {kpis.map((k) => (
              <Tile key={k._id} label={k.indicator} value={`${k.actual}/${k.target}`} sub={k.rating} color={kpiToneColor(k.rating, theme)} span={2} />
            ))}
          </View>
        </Card>
      )}

      {/* Admin-only: org-wide teacher workload */}
      {showAdmin && teacherRows.length > 0 && (
        <Card>
          <CardHeader title="توزيع عبء المعلمين" subtitle={`${teacherRows.length} معلم`} />
          <View style={tileGridStyle}>
            {teacherRows.map((t) => (
              <Tile key={t.id} label={t.name} value={t.count} sub="طالب" color={theme.blue} span={1} />
            ))}
          </View>
        </Card>
      )}
    </>
  );
}
