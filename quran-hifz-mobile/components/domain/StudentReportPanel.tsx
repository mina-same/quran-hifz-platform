import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SURAHS } from '@/lib/data/surahs';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import FormSelect from '@/components/forms/FormSelect';
import { useQueries } from '@tanstack/react-query';
import { useQuranPlans, openWardQueryOptions, type PlanSegment } from '@/lib/queries/quranPlan';
import { openPlanIdsForReport } from '@/lib/openWard';
import { useEvaluations, type EvaluationRecord } from '@/lib/queries/evaluations';
import { MAX_SCORES, legacyScoresOf } from '@/lib/evaluationRubric';
import { toFlatIndex, fromFlatIndex, juzFlatRange, coveredFlatRanges } from '@/lib/quranRange';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import ReportChartLine from '@/components/domain/ReportChartLine';

type AppTheme = ReturnType<typeof useAppTheme>;
type ReportStudent = { _id: string; name: string };
type JuzStatus = 'مكتمل' | 'قيد الحفظ' | 'غير مخصص';

const JUZ_VARIANT: Record<JuzStatus, 'green' | 'gold' | 'gray'> = {
  'مكتمل': 'green',
  'قيد الحفظ': 'gold',
  'غير مخصص': 'gray',
};

function surahName(n: number) {
  return SURAHS.find((x) => x.number === n)?.name ?? '';
}

function studentIdOf(e: EvaluationRecord): string {
  return typeof e.student === 'string' ? e.student : e.student._id;
}
function studentNameOf(e: EvaluationRecord): string {
  return typeof e.student === 'string' ? e.student : e.student.name;
}

/** Per-juz' coverage derived client-side from the student's plans — the same
 * overlap rule the web panel uses, so both clients colour a juz' identically. */
/** A juz' is covered when ANY of the student's plan segments spans it. Each
 * segment carries its own range and its own progress — حفظ and مراجعة cover
 * different stretches of the mushaf and advance at different rates, so they
 * contribute independently rather than being averaged into one plan range. */
function computeJuzRows(plans: { segments?: PlanSegment[] }[], openSpans: [number, number][] = []) {
  // Open-ward plans have no segment range — what the student actually
  // recorded counts instead, and a recorded span is memorized by definition.
  const ranges = [
    ...plans
      .flatMap((p) => p.segments ?? [])
      .filter((seg) => seg.rangeStart && seg.rangeEnd)
      .map((seg) => ({
        start: toFlatIndex(seg.rangeStart!),
        end: toFlatIndex(seg.rangeEnd!),
        percent: seg.progress?.percent ?? 0,
      })),
    ...openSpans.map(([start, end]) => ({ start, end, percent: 100 })),
  ];

  return Array.from({ length: 30 }, (_, i) => {
    const juz = i + 1;
    const { start: juzStart, end: juzEnd } = juzFlatRange(juz);
    let status: JuzStatus = 'غير مخصص';
    for (const p of ranges) {
      if (!(p.start <= juzEnd && p.end >= juzStart)) continue;
      const fullyCovered = p.start <= juzStart && p.end >= juzEnd;
      if (fullyCovered && p.percent >= 100) { status = 'مكتمل'; break; }
      status = 'قيد الحفظ';
    }
    return { juz, status, from: fromFlatIndex(juzStart), to: fromFlatIndex(juzEnd) };
  });
}

interface Props {
  students: ReportStudent[];
  aggregateFilter: { track?: string };
  aggregateTitle?: string;
}

/**
 * Mobile counterpart of the web's StudentReportPanel — same data, re-laid out
 * for a phone: the radar chart becomes four labelled bars, the 30-row juz' table
 * becomes a chip grid, and the comparison table becomes ranked cards.
 */
export default function StudentReportPanel({ students, aggregateFilter, aggregateTitle = 'مقارنة الطلاب' }: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);

  // `students` starts empty until its query resolves, so fall back to the first
  // student reactively every render instead of only once at mount.
  const [pickedId, setPickedId] = useState('');
  const selectedId = pickedId || students[0]?._id || '';
  const selected = students.find((st) => st._id === selectedId);

  const { data: plans = [] } = useQuranPlans(selectedId ? { student: selectedId } : { student: '__none__' });
  const { data: rawStudentEvals = [] } = useEvaluations(selectedId ? { student: selectedId } : { student: '__none__' });
  const { data: rawAllEvals = [] } = useEvaluations(aggregateFilter);
  // Excused (مستأذن) sessions score 0 like absent ones and stay in every
  // average; only the attendance percentage leaves them out.
  const studentEvals = rawStudentEvals;
  const allEvals = rawAllEvals;

  // What the student recorded on each open-ward plan (حفظ only — مراجعة
  // revisits already-memorized text and must not inflate coverage).
  // `?student=` only returns plans listing the student explicitly — a
  // track-targeted open plan comes from the track's own plans.
  const { data: trackPlans = [] } = useQuranPlans(
    aggregateFilter.track ? { track: aggregateFilter.track } : undefined,
    { enabled: !!aggregateFilter.track },
  );
  const openWardResults = useQueries({
    queries: (selectedId ? openPlanIdsForReport(plans, trackPlans) : [])
      .map((id) => openWardQueryOptions(id, { student: selectedId })),
  });
  const openSpansKey = openWardResults.map((r) => r.dataUpdatedAt).join(',');
  const openSpans = useMemo(
    () => coveredFlatRanges(openWardResults.flatMap((r) => r.data ?? []).filter((e) => e.type === 'حفظ')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openSpansKey],
  );

  const juzRows = useMemo(() => computeJuzRows(plans, openSpans), [plans, openSpans]);
  const juzSummary = useMemo(() => {
    const done = juzRows.filter((r) => r.status === 'مكتمل').length;
    const inProgress = juzRows.filter((r) => r.status === 'قيد الحفظ').length;
    return { done, inProgress, notAssigned: 30 - done - inProgress };
  }, [juzRows]);

  const dims = useMemo(() => {
    if (studentEvals.length === 0) return [];
    const sums = { attendance: 0, hifz: 0, tajweed: 0, talawah: 0 };
    for (const e of studentEvals) {
      sums.attendance += legacyScoresOf(e).attendance;
      sums.hifz += legacyScoresOf(e).hifz;
      sums.tajweed += legacyScoresOf(e).tajweed;
      sums.talawah += legacyScoresOf(e).talawah;
    }
    const n = studentEvals.length;
    return [
      { label: 'حضور', value: Math.round((sums.attendance / n / MAX_SCORES.attendance) * 100) },
      { label: 'حفظ', value: Math.round((sums.hifz / n / MAX_SCORES.hifz) * 100) },
      { label: 'تجويد', value: Math.round((sums.tajweed / n / MAX_SCORES.tajweed) * 100) },
      { label: 'تلاوة', value: Math.round((sums.talawah / n / MAX_SCORES.talawah) * 100) },
    ];
  }, [studentEvals]);

  const trend = useMemo(
    () =>
      [...studentEvals]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((e) => {
          const d = new Date(e.date);
          // Western digits on screen (user decision) — same m/d form ReportsScreen uses.
          return { label: `${d.getMonth() + 1}/${d.getDate()}`, value: e.total };
        }),
    [studentEvals],
  );

  // One row per student, averaged across every evaluation on record.
  const comparisonRows = useMemo(() => {
    const byStudent = new Map<string, {
      name: string;
      sums: { hifz: number; tajweed: number; talawah: number; total: number };
      count: number; present: number; attCount: number;
    }>();
    for (const e of allEvals) {
      const id = studentIdOf(e);
      const entry = byStudent.get(id) ?? {
        name: studentNameOf(e),
        sums: { hifz: 0, tajweed: 0, talawah: 0, total: 0 },
        count: 0, present: 0, attCount: 0,
      };
      entry.sums.hifz += legacyScoresOf(e).hifz;
      entry.sums.tajweed += legacyScoresOf(e).tajweed;
      entry.sums.talawah += legacyScoresOf(e).talawah;
      entry.sums.total += e.total;
      entry.count += 1;
      if (e.attendanceStatus !== 'مستأذن') entry.attCount += 1;
      if (e.attendanceStatus === 'حاضر') entry.present += 1;
      byStudent.set(id, entry);
    }
    return Array.from(byStudent.values())
      .map((st) => ({
        name: st.name,
        attendancePct: st.attCount ? Math.round((st.present / st.attCount) * 100) : 0,
        avgHifz: Math.round((st.sums.hifz / st.count) * 10) / 10,
        avgTajweed: Math.round((st.sums.tajweed / st.count) * 10) / 10,
        avgTalawah: Math.round((st.sums.talawah / st.count) * 10) / 10,
        avgTotal: Math.round((st.sums.total / st.count) * 10) / 10,
        count: st.count,
      }))
      .sort((a, b) => b.avgTotal - a.avgTotal);
  }, [allEvals]);

  const overall = useMemo(() => {
    if (comparisonRows.length === 0) return null;
    const avgTotal = comparisonRows.reduce((sum, r) => sum + r.avgTotal, 0) / comparisonRows.length;
    const avgAttendance = comparisonRows.reduce((sum, r) => sum + r.attendancePct, 0) / comparisonRows.length;
    return {
      avgTotal: Math.round(avgTotal * 10) / 10,
      avgAttendance: Math.round(avgAttendance),
      top: comparisonRows[0],
      sessionsLogged: allEvals.length,
    };
  }, [comparisonRows, allEvals]);

  return (
    <>
      {overall && (
        <Card>
          <CardHeader title="ملخص النطاق" />
          <View style={s.summaryGrid}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{overall.avgTotal}/10</Text>
              <Text style={s.summaryLabel}>متوسط التقييم العام</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{overall.avgAttendance}٪</Text>
              <Text style={s.summaryLabel}>نسبة الحضور العامة</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue} numberOfLines={1}>{overall.top.name}</Text>
              <Text style={s.summaryLabel}>الأعلى تقييماً ({overall.top.avgTotal}/10)</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{overall.sessionsLogged}</Text>
              <Text style={s.summaryLabel}>جلسة مسجّلة</Text>
            </View>
          </View>
        </Card>
      )}

      <Card>
        <CardHeader title="تقرير طالب مفصّل" />
        <Text style={s.label}>اختر الطالب</Text>
        <FormSelect
          value={selectedId}
          onChange={setPickedId}
          options={students.map((st) => ({ value: st._id, label: st.name }))}
          placeholder={students.length === 0 ? 'لا يوجد طلاب' : 'اختر الطالب'}
        />

        {selected && studentEvals.length === 0 && (
          <Text style={s.muted}>لا يوجد تقييمات بعد لهذا الطالب</Text>
        )}

        {selected && studentEvals.length > 0 && (
          <>
            <Text style={s.sectionTitle}>متوسط الدرجات (٪)</Text>
            {dims.map((d) => (
              <View key={d.label} style={s.dimRow}>
                <View style={s.dimHead}>
                  <Text style={s.dimLabel}>{d.label}</Text>
                  <Text style={s.dimValue}>{d.value}٪</Text>
                </View>
                <ProgressBar value={d.value} showPercent={false} />
              </View>
            ))}

            <Text style={s.sectionTitle}>تطور المجموع عبر الزمن</Text>
            <ReportChartLine data={trend} color={theme.greenAccent} />
          </>
        )}

        {selected && (
          <>
            <View style={s.juzHead}>
              <Text style={s.sectionTitle}>تغطية الأجزاء الثلاثين</Text>
              <View style={s.juzBadges}>
                <Badge label={`مكتمل: ${juzSummary.done}`} variant="green" />
                <Badge label={`قيد الحفظ: ${juzSummary.inProgress}`} variant="gold" />
                <Badge label={`غير مخصص: ${juzSummary.notAssigned}`} variant="gray" />
              </View>
            </View>
            {/* Web's الجزء / من / إلى / الحالة table as compact rows. */}
            <View style={s.juzList}>
              {juzRows.map((r) => (
                <View key={r.juz} style={[s.juzRow, r.juz > 1 && s.cmpBorder]}>
                  <Text style={s.juzNum}>{r.juz}</Text>
                  <Text style={s.juzRange}>
                    من {surahName(r.from.surahNumber)} : {r.from.ayah} · إلى {surahName(r.to.surahNumber)} : {r.to.ayah}
                  </Text>
                  <Badge label={r.status} variant={JUZ_VARIANT[r.status]} />
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      {comparisonRows.length > 0 && (
        <Card>
          <CardHeader title={aggregateTitle} />
          {comparisonRows.map((r, i) => (
            <View key={r.name} style={[s.cmpRow, i > 0 && s.cmpBorder]}>
              <View style={s.cmpHead}>
                <Text style={s.cmpRank}>#{i + 1}</Text>
                <Text style={s.cmpName} numberOfLines={1}>{r.name}</Text>
                <Text style={s.cmpTotal}>{r.avgTotal}/10</Text>
              </View>
              {/* Web's per-student average bar chart (0–10). */}
              <ProgressBar value={r.avgTotal} max={10} color={theme.greenAccent} showPercent={false} />
              <View style={s.cmpChips}>
                <View style={s.chip}><Text style={s.chipText}>نسبة الحضور {r.attendancePct}٪</Text></View>
                <View style={s.chip}><Text style={s.chipText}>متوسط الحفظ {r.avgHifz}/{MAX_SCORES.hifz}</Text></View>
                <View style={s.chip}><Text style={s.chipText}>متوسط التجويد {r.avgTajweed}/{MAX_SCORES.tajweed}</Text></View>
                <View style={s.chip}><Text style={s.chipText}>متوسط التلاوة {r.avgTalawah}/{MAX_SCORES.talawah}</Text></View>
                <View style={s.chip}><Text style={s.chipText}>عدد الجلسات {r.count}</Text></View>
              </View>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 4 },
    muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 16 },
    sectionTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 18, marginBottom: 8 },

    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    summaryItem: {
      flexBasis: '47%', flexGrow: 1,
      backgroundColor: theme.cardAlt, borderRadius: theme.radiusSm, padding: 12,
    },
    summaryValue: { fontSize: 18, fontFamily: theme.fontCairoBold, color: theme.text },
    summaryLabel: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },

    dimRow: { gap: 4, marginBottom: 10 },
    dimHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dimLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    dimValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },

    juzHead: { gap: 8, marginTop: 4 },
    juzBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    juzList: { marginTop: 10 },
    juzRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
    juzNum: { width: 22, fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, textAlign: 'center' },
    juzRange: { flex: 1, fontSize: 12, fontFamily: theme.fontCairo, color: theme.text },

    cmpRow: { paddingVertical: 10, gap: 6 },
    cmpBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    cmpHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cmpRank: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    cmpName: { flex: 1, fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    cmpTotal: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    cmpChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { backgroundColor: theme.tone.gray.bg, borderRadius: theme.radiusSm, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.tone.gray.text },
  });
}
