import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import FormSelect from '@/components/forms/FormSelect';
import { useQuranPlans, type PlanSegment } from '@/lib/queries/quranPlan';
import { useEvaluations, type EvaluationRecord } from '@/lib/queries/evaluations';
import { MAX_SCORES, legacyScoresOf } from '@/lib/evaluationRubric';
import { toFlatIndex, fromFlatIndex, juzFlatRange } from '@/lib/quranRange';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { AR_LOCALE } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;
type ReportStudent = { _id: string; name: string };
type JuzStatus = 'مكتمل' | 'قيد الحفظ' | 'غير مخصص';

const JUZ_VARIANT: Record<JuzStatus, 'green' | 'gold' | 'gray'> = {
  'مكتمل': 'green',
  'قيد الحفظ': 'gold',
  'غير مخصص': 'gray',
};

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
function computeJuzRows(plans: { segments?: PlanSegment[] }[]) {
  const ranges = plans
    .flatMap((p) => p.segments ?? [])
    .map((seg) => ({
      start: toFlatIndex(seg.rangeStart),
      end: toFlatIndex(seg.rangeEnd),
      percent: seg.progress?.percent ?? 0,
    }));

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
  aggregateFilter: { halqa?: string; specialTrack?: string };
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
  const { data: studentEvals = [] } = useEvaluations(selectedId ? { student: selectedId } : { student: '__none__' });
  const { data: allEvals = [] } = useEvaluations(aggregateFilter);

  const juzRows = useMemo(() => computeJuzRows(plans), [plans]);
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
        .slice(-8)
        .map((e) => ({
          date: new Date(e.date).toLocaleDateString(AR_LOCALE, { month: 'numeric', day: 'numeric' }),
          total: e.total,
        })),
    [studentEvals],
  );

  // One row per student, averaged across every evaluation on record.
  const comparisonRows = useMemo(() => {
    const byStudent = new Map<string, {
      name: string;
      sums: { hifz: number; tajweed: number; talawah: number; total: number };
      count: number; present: number;
    }>();
    for (const e of allEvals) {
      const id = studentIdOf(e);
      const entry = byStudent.get(id) ?? {
        name: studentNameOf(e),
        sums: { hifz: 0, tajweed: 0, talawah: 0, total: 0 },
        count: 0, present: 0,
      };
      entry.sums.hifz += legacyScoresOf(e).hifz;
      entry.sums.tajweed += legacyScoresOf(e).tajweed;
      entry.sums.talawah += legacyScoresOf(e).talawah;
      entry.sums.total += e.total;
      entry.count += 1;
      if (e.attendanceStatus === 'حاضر') entry.present += 1;
      byStudent.set(id, entry);
    }
    return Array.from(byStudent.values())
      .map((st) => ({
        name: st.name,
        attendancePct: Math.round((st.present / st.count) * 100),
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

  const maxTrend = trend.length ? Math.max(...trend.map((t) => t.total), 10) : 10;

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

            {trend.length > 1 && (
              <>
                <Text style={s.sectionTitle}>تطور المجموع عبر الزمن</Text>
                {/* Bars, not a line chart: a handful of sessions reads better as
                    labelled rows than as a sparkline squeezed into a phone width. */}
                {trend.map((t, i) => (
                  <View key={`${t.date}-${i}`} style={s.trendRow}>
                    <Text style={s.trendDate}>{t.date}</Text>
                    <View style={s.trendTrack}>
                      <View style={[s.trendFill, { width: `${(t.total / maxTrend) * 100}%` }]} />
                    </View>
                    <Text style={s.trendValue}>{t.total}</Text>
                  </View>
                ))}
              </>
            )}
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
            <View style={s.juzGrid}>
              {juzRows.map((r) => {
                const tone = theme.tone[JUZ_VARIANT[r.status]];
                return (
                  <View key={r.juz} style={[s.juzCell, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                    <Text style={[s.juzNum, { color: tone.text }]}>{r.juz}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </Card>

      {comparisonRows.length > 0 && (
        <Card>
          <CardHeader title={aggregateTitle} subtitle={`${comparisonRows.length} طالب`} />
          {comparisonRows.map((r, i) => (
            <View key={r.name} style={[s.cmpRow, i > 0 && s.cmpBorder]}>
              <View style={s.cmpHead}>
                <Text style={s.cmpRank}>#{i + 1}</Text>
                <Text style={s.cmpName} numberOfLines={1}>{r.name}</Text>
                <Badge label={`${r.avgTotal}/10`} variant={r.avgTotal >= 8 ? 'green' : r.avgTotal >= 6 ? 'gold' : 'red'} />
              </View>
              <View style={s.cmpChips}>
                <View style={s.chip}><Text style={s.chipText}>الحضور {r.attendancePct}٪</Text></View>
                <View style={s.chip}><Text style={s.chipText}>حفظ {r.avgHifz}</Text></View>
                <View style={s.chip}><Text style={s.chipText}>تجويد {r.avgTajweed}</Text></View>
                <View style={s.chip}><Text style={s.chipText}>تلاوة {r.avgTalawah}</Text></View>
                <View style={s.chip}><Text style={s.chipText}>{r.count} جلسة</Text></View>
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

    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    trendDate: { width: 46, fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    trendTrack: { flex: 1, height: 8, backgroundColor: theme.border, borderRadius: 999, overflow: 'hidden' },
    trendFill: { height: '100%', borderRadius: 999, backgroundColor: theme.mode === 'dark' ? theme.greenLight : theme.green },
    trendValue: { width: 26, fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.text, textAlign: 'center' },

    juzHead: { gap: 8, marginTop: 4 },
    juzBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    juzGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    juzCell: {
      width: 38, height: 34, borderRadius: theme.radiusSm, borderWidth: 1,
      alignItems: 'center', justifyContent: 'center',
    },
    juzNum: { fontSize: 12, fontFamily: theme.fontCairoBold },

    cmpRow: { paddingVertical: 10, gap: 6 },
    cmpBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    cmpHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cmpRank: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    cmpName: { flex: 1, fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    cmpChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { backgroundColor: theme.tone.gray.bg, borderRadius: theme.radiusSm, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.tone.gray.text },
  });
}
