import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { Card } from "./Card";
import { Badge, type BadgeTone } from "./Badge";
import { SkeletonCard } from "./Skeleton";
import { StatsRow } from "./StatsRow";
import { useQuranPlans } from "../../api/quran-plans";
import { useEvaluations } from "../../api/evaluations";
import { MAX_SCORES } from "../../lib/evaluationRubric";
import { toFlatIndex, fromFlatIndex, juzFlatRange } from "../../lib/quranRange";
import { SURAHS } from "../../data/surahs";
import { toAr, pct } from "../../../lib/format";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}

type ReportStudent = { _id: string; name: string };

type JuzStatus = "مكتمل" | "قيد الحفظ" | "غير مخصص";
const JUZ_TONE: Record<JuzStatus, BadgeTone> = {
  مكتمل: "green",
  "قيد الحفظ": "gold",
  "غير مخصص": "gray",
};

/** Per-juz' coverage derived client-side from a student's plans — no dedicated
 * backend aggregation exists (or is needed): each plan already carries its own
 * rangeStart/rangeEnd + progress.percent, so we just check, for every juz' 1-30,
 * whether any plan's ayah range overlaps it (and whether a fully-covering plan
 * is 100% complete). */
function computeJuzRows(
  plans: {
    rangeStart: { surahNumber: number; ayah: number };
    rangeEnd: { surahNumber: number; ayah: number };
    progress: { percent: number } | null;
  }[],
) {
  const planRanges = plans.map((p) => ({
    start: toFlatIndex(p.rangeStart),
    end: toFlatIndex(p.rangeEnd),
    percent: p.progress?.percent ?? 0,
  }));

  return Array.from({ length: 30 }, (_, i) => {
    const juz = i + 1;
    const { start: juzStart, end: juzEnd } = juzFlatRange(juz);
    let status: JuzStatus = "غير مخصص";
    for (const p of planRanges) {
      const overlaps = p.start <= juzEnd && p.end >= juzStart;
      if (!overlaps) continue;
      const fullyCovered = p.start <= juzStart && p.end >= juzEnd;
      if (fullyCovered && p.percent >= 100) {
        status = "مكتمل";
        break;
      }
      status = "قيد الحفظ";
    }
    const from = fromFlatIndex(juzStart);
    const to = fromFlatIndex(juzEnd);
    return { juz, status, from, to };
  });
}

export function StudentReportPanel({
  students,
  aggregateFilter,
  aggregateTitle = "مقارنة الطلاب",
}: {
  students: ReportStudent[];
  aggregateFilter: { halqa?: string; specialTrack?: string };
  aggregateTitle?: string;
}) {
  // `students` starts empty until its query resolves, so a plain useState
  // initializer would freeze on "" forever — fall back to the first student
  // reactively every render instead of only once at mount.
  const [pickedId, setPickedId] = useState("");
  const selectedId = pickedId || students[0]?._id || "";
  const selected = students.find((s) => s._id === selectedId);

  const { data: plans = [] } = useQuranPlans(
    selectedId ? { student: selectedId } : { student: "__none__" },
  );
  const { data: studentEvals = [] } = useEvaluations(
    selectedId ? { student: selectedId } : { student: "__none__" },
  );
  const { data: allEvals = [] } = useEvaluations(aggregateFilter);

  const juzRows = useMemo(() => computeJuzRows(plans), [plans]);
  const juzSummary = useMemo(() => {
    const done = juzRows.filter((r) => r.status === "مكتمل").length;
    const inProgress = juzRows.filter((r) => r.status === "قيد الحفظ").length;
    return { done, inProgress, notAssigned: 30 - done - inProgress };
  }, [juzRows]);

  const radarData = useMemo(() => {
    if (studentEvals.length === 0) return [];
    const sums = { attendance: 0, hifz: 0, tajweed: 0, talawah: 0 };
    for (const e of studentEvals) {
      sums.attendance += e.scores.attendance;
      sums.hifz += e.scores.hifz;
      sums.tajweed += e.scores.tajweed;
      sums.talawah += e.scores.talawah;
    }
    const n = studentEvals.length;
    return [
      { category: "حضور", value: Math.round((sums.attendance / n / MAX_SCORES.attendance) * 100) },
      { category: "حفظ", value: Math.round((sums.hifz / n / MAX_SCORES.hifz) * 100) },
      { category: "تجويد", value: Math.round((sums.tajweed / n / MAX_SCORES.tajweed) * 100) },
      { category: "تلاوة", value: Math.round((sums.talawah / n / MAX_SCORES.talawah) * 100) },
    ];
  }, [studentEvals]);

  const trendData = useMemo(
    () =>
      [...studentEvals]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((e) => ({
          date: toAr(
            new Date(e.date).toLocaleDateString("ar-SA", { month: "numeric", day: "numeric" }),
          ),
          total: e.total,
        })),
    [studentEvals],
  );

  // One row per student — averages across every evaluation on record, sourced
  // from the same `allEvals` query the aggregate chart uses, so the chart and
  // the table never disagree.
  const comparisonRows = useMemo(() => {
    const byStudent = new Map<
      string,
      {
        name: string;
        sums: { attendance: number; hifz: number; tajweed: number; talawah: number; total: number };
        count: number;
        present: number;
      }
    >();
    for (const e of allEvals) {
      const id = typeof e.student === "string" ? e.student : e.student._id;
      const name = typeof e.student === "string" ? id : e.student.name;
      const entry = byStudent.get(id) ?? {
        name,
        sums: { attendance: 0, hifz: 0, tajweed: 0, talawah: 0, total: 0 },
        count: 0,
        present: 0,
      };
      entry.sums.attendance += e.scores.attendance;
      entry.sums.hifz += e.scores.hifz;
      entry.sums.tajweed += e.scores.tajweed;
      entry.sums.talawah += e.scores.talawah;
      entry.sums.total += e.total;
      entry.count += 1;
      if (e.attendanceStatus === "حاضر") entry.present += 1;
      byStudent.set(id, entry);
    }
    return Array.from(byStudent.values())
      .map((s) => ({
        name: s.name,
        attendancePct: Math.round((s.present / s.count) * 100),
        avgHifz: Math.round((s.sums.hifz / s.count) * 10) / 10,
        avgTajweed: Math.round((s.sums.tajweed / s.count) * 10) / 10,
        avgTalawah: Math.round((s.sums.talawah / s.count) * 10) / 10,
        avgTotal: Math.round((s.sums.total / s.count) * 10) / 10,
        count: s.count,
      }))
      .sort((a, b) => b.avgTotal - a.avgTotal);
  }, [allEvals]);

  const overallStats = useMemo(() => {
    if (comparisonRows.length === 0) return null;
    const avgTotal = comparisonRows.reduce((sum, r) => sum + r.avgTotal, 0) / comparisonRows.length;
    const avgAttendance =
      comparisonRows.reduce((sum, r) => sum + r.attendancePct, 0) / comparisonRows.length;
    return {
      studentCount: comparisonRows.length,
      avgTotal: Math.round(avgTotal * 10) / 10,
      avgAttendance: Math.round(avgAttendance),
      top: comparisonRows[0],
      sessionsLogged: allEvals.length,
    };
  }, [comparisonRows, allEvals]);

  const aggregateBarData = useMemo(
    () => comparisonRows.map((r) => ({ name: r.name, average: r.avgTotal })),
    [comparisonRows],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {overallStats && (
        <StatsRow
          items={[
            {
              num: `${toAr(overallStats.avgTotal)}/${toAr(10)}`,
              label: "متوسط التقييم العام",
              icon: "ti-star",
            },
            {
              num: pct(overallStats.avgAttendance),
              label: "نسبة الحضور العامة",
              icon: "ti-calendar-check",
              variant: "blue",
            },
            {
              num: overallStats.top.name,
              label: `الأعلى تقييماً (${toAr(overallStats.top.avgTotal)}/${toAr(10)})`,
              icon: "ti-trophy",
              variant: "gold",
            },
            {
              num: toAr(overallStats.sessionsLogged),
              label: "جلسة مسجّلة",
              icon: "ti-clipboard-check",
            },
          ]}
        />
      )}

      <Card icon="ti-user-search" title="تقرير طالب">
        <div className="form-group" style={{ marginBottom: 16, maxWidth: 320 }}>
          <label className="form-label">اختر الطالب</label>
          <select
            className="form-input"
            value={selectedId}
            onChange={(e) => setPickedId(e.target.value)}
          >
            {students.length === 0 && <option value="">لا يوجد طلاب</option>}
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <>
            {studentEvals.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                  marginBottom: 22,
                }}
              >
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>
                    متوسط الدرجات (%)
                  </h4>
                  <ResponsiveContainer width="100%" height={230}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border2)" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fill: "var(--text2)", fontSize: 12 }}
                      />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        dataKey="value"
                        stroke="var(--green)"
                        fill="var(--green)"
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [pct(Number(v)), ""]}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>
                    تطور المجموع عبر الزمن
                  </h4>
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={trendData}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        fontSize={11}
                        stroke="var(--text3)"
                        tick={{ fill: "var(--text2)" }}
                      />
                      <YAxis
                        domain={[0, 10]}
                        fontSize={11}
                        stroke="var(--text3)"
                        tick={{ fill: "var(--text2)" }}
                        tickFormatter={(v: number) => toAr(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [toAr(Number(v)), ""]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="var(--green)"
                        strokeWidth={2}
                        dot={{
                          r: 4,
                          fill: "var(--green)",
                          stroke: "var(--surface)",
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "var(--text3)", padding: 20 }}>
                لا يوجد تقييمات بعد لهذا الطالب
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "0 0 10px",
              }}
            >
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>تغطية الأجزاء الثلاثين</h4>
              <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                <Badge tone="green">مكتمل: {toAr(juzSummary.done)}</Badge>
                <Badge tone="gold">قيد الحفظ: {toAr(juzSummary.inProgress)}</Badge>
                <Badge tone="gray">غير مخصص: {toAr(juzSummary.notAssigned)}</Badge>
              </div>
            </div>
            <div className="tbl-wrap" style={{ maxHeight: 360, overflowY: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>الجزء</th>
                    <th>من</th>
                    <th>إلى</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {juzRows.map((r) => (
                    <tr key={r.juz}>
                      <td style={{ fontWeight: 700 }}>{toAr(r.juz)}</td>
                      <td>
                        {surahName(r.from.surahNumber)} : {toAr(r.from.ayah)}
                      </td>
                      <td>
                        {surahName(r.to.surahNumber)} : {toAr(r.to.ayah)}
                      </td>
                      <td>
                        <Badge tone={JUZ_TONE[r.status]}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {students.length === 0 && <SkeletonCard lines={2} />}
      </Card>

      {comparisonRows.length > 0 && (
        <Card icon="ti-chart-bar" title={aggregateTitle}>
          <ResponsiveContainer width="100%" height={Math.max(200, comparisonRows.length * 34)}>
            <BarChart data={aggregateBarData} layout="vertical" margin={{ left: 8, right: 28 }}>
              <CartesianGrid stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 10]}
                fontSize={11}
                stroke="var(--text3)"
                tick={{ fill: "var(--text2)" }}
                tickFormatter={(v: number) => toAr(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                fontSize={12}
                stroke="var(--text3)"
                tick={{ fill: "var(--text)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [toAr(Number(v)), ""]}
              />
              <Bar dataKey="average" fill="var(--green)" radius={[0, 4, 4, 0]} maxBarSize={22}>
                <LabelList
                  dataKey="average"
                  position="right"
                  style={{ fill: "var(--text)", fontSize: 11, fontWeight: 700 }}
                  formatter={(v: number) => toAr(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="tbl-wrap" style={{ marginTop: 16 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>نسبة الحضور</th>
                  <th>متوسط الحفظ</th>
                  <th>متوسط التجويد</th>
                  <th>متوسط التلاوة</th>
                  <th>المتوسط الكلي</th>
                  <th>عدد الجلسات</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((r) => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 700 }}>{r.name}</td>
                    <td>{pct(r.attendancePct)}</td>
                    <td>
                      {toAr(r.avgHifz)}/{toAr(MAX_SCORES.hifz)}
                    </td>
                    <td>
                      {toAr(r.avgTajweed)}/{toAr(MAX_SCORES.tajweed)}
                    </td>
                    <td>
                      {toAr(r.avgTalawah)}/{toAr(MAX_SCORES.talawah)}
                    </td>
                    <td>
                      <strong>
                        {toAr(r.avgTotal)}/{toAr(10)}
                      </strong>
                    </td>
                    <td>{toAr(r.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
