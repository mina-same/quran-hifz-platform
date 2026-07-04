import { useMemo, useState, type ReactNode } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LabelList } from "recharts";
import { toAr, pct } from "../../../lib/format";
import { downloadCsv } from "../../../lib/csv";
import { useStudents, type Student, type StudentFilters } from "../../api/students";
import { useEvaluations, type EvaluationRecord } from "../../api/evaluations";
import { MAX_SCORES, TOTAL_MAX } from "../../lib/evaluationRubric";
import type { Kpi } from "../../api/kpis";
import type { Teacher } from "../../api/teachers";
import type { Halqa } from "../../api/halqat";
import type { SpecialTrack } from "../../api/special-tracks";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "./Card";
import { StatsRow } from "./StatsRow";
import { Alert } from "./Alert";
import { Badge, type BadgeTone } from "./Badge";
import { ProgressBar } from "./ProgressBar";
import { Donut, type DonutSlice } from "./Donut";
import { Gauge } from "./Gauge";
import { Leaderboard, type LeaderRow } from "./Leaderboard";
import { ScopeTabs } from "./ScopeTabs";
import { StudentReportPanel } from "./StudentReportPanel";

/* ── helpers ──────────────────────────────────────────────────────────── */

function halqaIdOf(s: Student): string {
  return typeof s.halqa === "object" ? s.halqa._id : (s.halqa ?? "");
}
function halqaNameOf(s: Student): string {
  return typeof s.halqa === "object" ? s.halqa.name : (s.halqa ?? "");
}
function studentIdOf(e: EvaluationRecord): string {
  return typeof e.student === "string" ? e.student : e.student._id;
}
function studentNameOf(e: EvaluationRecord): string {
  return typeof e.student === "string" ? e.student : e.student.name;
}
function evalHalqaId(e: EvaluationRecord): string {
  return typeof e.halqa === "object" ? (e.halqa?._id ?? "") : (e.halqa ?? "");
}
function evalHalqaName(e: EvaluationRecord): string {
  return typeof e.halqa === "object" ? (e.halqa?.name ?? "") : "";
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function avg(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

/** Buckets a 0–100 metric into 4 ranges for the hifz-progress distribution donut. */
function bucket(vals: number[]) {
  return {
    high: vals.filter((v) => v >= 90).length,
    mid: vals.filter((v) => v >= 75 && v < 90).length,
    low: vals.filter((v) => v >= 50 && v < 75).length,
    risk: vals.filter((v) => v < 50).length,
  };
}
const BUCKET_SLICES = (b: ReturnType<typeof bucket>): DonutSlice[] => [
  { name: "ممتاز (٩٠٪+)", value: b.high, color: "var(--green)" },
  { name: "جيد (٧٥–٩٠٪)", value: b.mid, color: "var(--green3)" },
  { name: "متوسط (٥٠–٧٥٪)", value: b.low, color: "var(--gold)" },
  { name: "دون ٥٠٪", value: b.risk, color: "#ef4444" },
];

const KPI_TONE: Record<string, BadgeTone> = {
  ممتاز: "green",
  جيد: "blue",
  مقبول: "gold",
  ضعيف: "red",
};

function pctOf(actual: string, target: string): number {
  const a = parseFloat(actual);
  const t = parseFloat(target);
  if (!isFinite(a) || !isFinite(t) || t === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((a / t) * 100)));
}

const DIM_META = [
  { key: "attendance", label: "حضور", icon: "ti-calendar-check", color: "var(--brown)" },
  { key: "hifz", label: "حفظ", icon: "ti-book-2", color: "var(--green)" },
  { key: "tajweed", label: "تجويد", icon: "ti-microphone-2", color: "#3b82f6" },
  { key: "talawah", label: "تلاوة", icon: "ti-writing", color: "var(--gold)" },
] as const;

function pctOfMax(avgScore: number, max: number): number {
  return Math.max(0, Math.min(100, Math.round((avgScore / max) * 100)));
}

/* ── component ────────────────────────────────────────────────────────── */

export function ReportsDashboard({
  topbarIcon,
  topbarTitle,
  baseFilter,
  halqat,
  tracks,
  kpis,
  teachers,
  showAdmin = false,
  scopeAllLabel,
}: {
  topbarIcon: string;
  topbarTitle: string;
  baseFilter: StudentFilters;
  halqat: Halqa[];
  tracks: SpecialTrack[];
  kpis?: Kpi[];
  teachers?: Teacher[];
  showAdmin?: boolean;
  scopeAllLabel: string;
}) {
  const [scope, setScope] = useState("");
  const scopedFilter: StudentFilters = useMemo(() => {
    if (scope === "") return baseFilter;
    if (scope.startsWith("halqa:")) return { halqa: scope.slice(6) };
    if (scope.startsWith("track:")) return { specialTrack: scope.slice(6) };
    return baseFilter;
  }, [scope, baseFilter]);

  const { data: students = [], isLoading } = useStudents(scopedFilter);
  const { data: evaluations = [] } = useEvaluations(scopedFilter);

  /* ── cohort overview (attendance/progress, still useful independent of evaluations) ── */
  const m = useMemo(() => {
    const n = students.length;
    const avgAtt = n ? Math.round(avg(students.map((s) => s.attendancePct ?? 0))) : 0;
    const avgProg = n ? Math.round(avg(students.map((s) => s.progressPct ?? 0))) : 0;
    const atRisk = students.filter((s) => s.attendancePct < 75 || s.progressPct < 50);
    return { n, avgAtt, avgProg, atRisk };
  }, [students]);
  const progBuckets = useMemo(() => bucket(students.map((s) => s.progressPct)), [students]);

  /* ── evaluation rubric aggregate (the new centerpiece) ── */
  const evalStats = useMemo(() => {
    if (evaluations.length === 0) return null;
    const sums = { attendance: 0, hifz: 0, tajweed: 0, talawah: 0, total: 0 };
    for (const e of evaluations) {
      sums.attendance += e.scores.attendance;
      sums.hifz += e.scores.hifz;
      sums.tajweed += e.scores.tajweed;
      sums.talawah += e.scores.talawah;
      sums.total += e.total;
    }
    const n = evaluations.length;
    const dims = DIM_META.map((d) => ({
      ...d,
      pctVal: pctOfMax(sums[d.key] / n, MAX_SCORES[d.key]),
    }));
    const weakest = [...dims].sort((a, b) => a.pctVal - b.pctVal)[0];
    return {
      dims,
      avgTotal: round1(sums.total / n),
      avgTotalPct: pctOfMax(sums.total / n, TOTAL_MAX),
      sessions: n,
      weakest,
    };
  }, [evaluations]);

  /* ── trend: cohort avg total score per evaluation date ── */
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
      .map(([date, v]) => ({
        date: toAr(new Date(date).toLocaleDateString("ar-SA", { month: "numeric", day: "numeric" })),
        avg: round1(v.sum / v.count),
      }));
  }, [evaluations]);

  const trendDirection = useMemo<"up" | "down" | null>(() => {
    if (trendData.length < 4) return null;
    const half = Math.floor(trendData.length / 2);
    const diff = avg(trendData.slice(half).map((d) => d.avg)) - avg(trendData.slice(0, half).map((d) => d.avg));
    if (Math.abs(diff) < 0.3) return null;
    return diff > 0 ? "up" : "down";
  }, [trendData]);

  /* ── halqa comparison (only meaningful when more than one halqa is in scope) ── */
  const halqaEvalStats = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sums: { attendance: number; hifz: number; tajweed: number; talawah: number; total: number }; count: number }
    >();
    for (const e of evaluations) {
      const id = evalHalqaId(e);
      if (!id) continue;
      const name = evalHalqaName(e) || halqat.find((h) => h._id === id)?.name || "—";
      const entry = map.get(id) ?? {
        name,
        sums: { attendance: 0, hifz: 0, tajweed: 0, talawah: 0, total: 0 },
        count: 0,
      };
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

  /* ── per-student evaluation leaderboard (top achievers + needs-attention) ── */
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
    return Array.from(map.entries()).map(([id, e]) => ({
      id,
      name: e.name,
      avgTotal: round1(e.sum / e.count),
      count: e.count,
    }));
  }, [evaluations]);

  const evalTop: LeaderRow[] = useMemo(
    () =>
      [...studentEvalStats]
        .sort((a, b) => b.avgTotal - a.avgTotal)
        .slice(0, 8)
        .map((s) => ({
          id: s.id,
          name: s.name,
          subtitle: `${toAr(s.count)} جلسة تقييم`,
          meter: pctOfMax(s.avgTotal, TOTAL_MAX),
          display: `${toAr(s.avgTotal)}/${toAr(10)}`,
        })),
    [studentEvalStats],
  );
  const evalWatch: LeaderRow[] = useMemo(
    () =>
      [...studentEvalStats]
        .filter((s) => s.avgTotal < 6)
        .sort((a, b) => a.avgTotal - b.avgTotal)
        .slice(0, 8)
        .map((s) => ({
          id: s.id,
          name: s.name,
          subtitle: `${toAr(s.count)} جلسة تقييم`,
          meter: pctOfMax(s.avgTotal, TOTAL_MAX),
          display: `${toAr(s.avgTotal)}/${toAr(10)}`,
          reason: { tone: "red" as const, text: "تقييم منخفض" },
        })),
    [studentEvalStats],
  );

  /* ── auto insights ──────────────────────────────────────────────────── */
  const insights: ReactNode[] = [];
  if (!isLoading) {
    if (evalStats && evalStats.weakest.pctVal < 70) {
      insights.push(
        <Alert key="weak" tone="warning" icon="ti-focus-2">
          <b>{evalStats.weakest.label}</b> هو الأضعف بين معايير التقييم — متوسط{" "}
          <b>{pct(evalStats.weakest.pctVal)}</b>، يُنصح بالتركيز عليه في الحلقات القادمة
        </Alert>,
      );
    }
    if (trendDirection === "up") {
      insights.push(
        <Alert key="trend-up" tone="success" icon="ti-trending-up">
          متوسط التقييم في تحسّن مستمر خلال آخر الجلسات
        </Alert>,
      );
    } else if (trendDirection === "down") {
      insights.push(
        <Alert key="trend-down" tone="danger" icon="ti-trending-down">
          متوسط التقييم في تراجع خلال آخر الجلسات — يستحق المتابعة
        </Alert>,
      );
    }
    if (scope === "" && halqaEvalStats.length > 1) {
      insights.push(
        <Alert key="top-halqa" tone="info" icon="ti-trophy">
          حلقة <b>{halqaEvalStats[0].name}</b> متصدّرة في التقييم بمتوسط{" "}
          <b>{toAr(halqaEvalStats[0].avgTotal)}/{toAr(10)}</b>
        </Alert>,
      );
    }
    if (m.atRisk.length > 0) {
      insights.push(
        <Alert key="risk" tone="warning" icon="ti-alert-triangle">
          <b>{toAr(m.atRisk.length)}</b> طالب يحتاجون متابعة — نسبة الحضور أو الإنجاز دون المستهدف
        </Alert>,
      );
    }
  }

  /* ── admin-only teacher workload (kept — org-wide, unrelated to evaluation focus) ── */
  const teacherRows = useMemo(
    () =>
      (teachers ?? [])
        .slice()
        .sort((a, b) => (b.studentCount ?? 0) - (a.studentCount ?? 0))
        .slice(0, 10)
        .map((t) => ({ name: t.name, count: t.studentCount ?? 0 })),
    [teachers],
  );
  const maxTeacherCount = useMemo(() => teacherRows.reduce((mx, r) => Math.max(mx, r.count), 0) || 1, [teacherRows]);

  /* ── exports ───────────────────────────────────────────────────────── */
  function exportEvaluations() {
    downloadCsv(
      "تقرير-التقييمات.csv",
      ["الطالب", "التاريخ", "حضور", "حفظ", "تجويد", "تلاوة", "المجموع"],
      evaluations.map((e) => [
        studentNameOf(e),
        e.date.slice(0, 10),
        e.scores.attendance,
        e.scores.hifz,
        e.scores.tajweed,
        e.scores.talawah,
        e.total,
      ]),
    );
  }
  function exportHalqaEval() {
    downloadCsv(
      "تقرير-الحلقات-تقييم.csv",
      ["الحلقة", "متوسط الحضور", "متوسط الحفظ", "متوسط التجويد", "متوسط التلاوة", "المتوسط الكلي", "عدد الجلسات"],
      halqaEvalStats.map((h) => [h.name, `${h.avgAttendance}%`, `${h.avgHifz}%`, `${h.avgTajweed}%`, `${h.avgTalawah}%`, h.avgTotal, h.count]),
    );
  }
  function exportAtRisk() {
    downloadCsv(
      "تقرير-الطلاب-ذوي-المتابعة.csv",
      ["الطالب", "الحلقة", "نسبة الحضور", "نسبة الإنجاز"],
      m.atRisk.map((s) => [s.name, halqaNameOf(s), `${s.attendancePct}%`, `${s.progressPct}%`]),
    );
  }

  const [exportOpen, setExportOpen] = useState(false);
  const exportItems = [
    { label: "تقرير التقييمات", icon: "ti-star", fn: exportEvaluations, disabled: evaluations.length === 0 },
    { label: "مقارنة الحلقات (تقييم)", icon: "ti-school", fn: exportHalqaEval, disabled: halqaEvalStats.length === 0 },
    { label: "تقرير ذوي المتابعة", icon: "ti-alert-triangle", fn: exportAtRisk, disabled: m.atRisk.length === 0 },
  ];
  const exportMenu = (
    <div className="export-menu">
      <button className="topbar-btn btn-primary" onClick={() => setExportOpen((o) => !o)} disabled={students.length === 0}>
        <i className="ti ti-download" /> تصدير <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
      </button>
      {exportOpen && (
        <>
          <button className="export-menu-backdrop" onClick={() => setExportOpen(false)} aria-hidden tabIndex={-1} />
          <div className="export-menu-list">
            {exportItems.map((it) => (
              <button
                key={it.label}
                className="export-menu-item"
                disabled={it.disabled}
                onClick={() => {
                  it.fn();
                  setExportOpen(false);
                }}
              >
                <i className={`ti ${it.icon}`} /> {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  useTopbar(topbarIcon, topbarTitle, exportMenu);

  /* ── scope options ────────────────────────────────────────────────── */
  const scopeOptions = useMemo(() => {
    const opts: { value: string; label: string; icon?: string }[] = [{ value: "", label: scopeAllLabel, icon: "ti-users" }];
    halqat.forEach((h) => opts.push({ value: `halqa:${h._id}`, label: h.name, icon: "ti-school" }));
    tracks.forEach((t) => opts.push({ value: `track:${t._id}`, label: t.title, icon: "ti-route" }));
    return opts;
  }, [halqat, tracks, scopeAllLabel]);

  const selectedHalqa = halqat.find((h) => `halqa:${h._id}` === scope);
  const selectedTrack = tracks.find((t) => `track:${t._id}` === scope);
  const aggregateTitle = selectedHalqa
    ? `مقارنة طلاب ${selectedHalqa.name}`
    : selectedTrack
      ? `مقارنة طلاب ${selectedTrack.title}`
      : showAdmin
        ? "متوسط الدرجات لكل طلاب المدرسة"
        : "متوسط الدرجات لطلابك";

  const empty = !isLoading && students.length === 0;

  /* ── render ────────────────────────────────────────────────────────── */
  return (
    <>
      <StatsRow
        items={[
          {
            num: evalStats ? `${toAr(evalStats.avgTotal)}/${toAr(10)}` : "—",
            label: "متوسط التقييم العام",
            icon: "ti-star",
            variant: "gold",
          },
          { num: pct(m.avgAtt), label: "متوسط الحضور", icon: "ti-calendar-check", variant: "blue" },
          { num: pct(m.avgProg), label: "متوسط إنجاز الحفظ", icon: "ti-book" },
          {
            num: toAr(m.atRisk.length),
            label: "ذوو المتابعة",
            icon: "ti-alert-triangle",
            variant: m.atRisk.length > 0 ? "red" : "",
          },
        ]}
      />

      {scopeOptions.length > 1 && <ScopeTabs options={scopeOptions} value={scope} onChange={setScope} />}

      {insights.length > 0 && <div className="reports-insights">{insights}</div>}

      {empty ? (
        <Card icon="ti-chart-bar" title="لا توجد بيانات">
          <div className="page-loading" style={{ padding: "40px 0" }}>
            <i className="ti ti-chart-dots-3" />
            <span>
              {scope
                ? "لا يوجد طلاب في هذا النطاق بعد"
                : showAdmin
                  ? "لا يوجد طلاب مسجلون بعد — أضف طلابًا لعرض التقارير"
                  : "لا يوجد طلاب في حلقاتك بعد"}
            </span>
          </div>
        </Card>
      ) : !evalStats ? (
        <Card icon="ti-star" title="لوحة التقييم">
          <div className="page-loading" style={{ padding: "40px 0" }}>
            <i className="ti ti-clipboard-off" />
            <span>لا توجد تقييمات مسجّلة بعد لهذا النطاق</span>
          </div>
        </Card>
      ) : (
        <>
          {/* Hero: overall gauge + rubric breakdown */}
          <div className="eval-hero grid-collapse">
            <Card icon="ti-star" title="الأداء العام">
              <Gauge value={evalStats.avgTotalPct} label={`${toAr(evalStats.sessions)} جلسة مسجّلة`} />
            </Card>
            <Card icon="ti-chart-radar" title="تفصيل معايير التقييم">
              <div className="rubric-grid">
                {evalStats.dims.map((d) => (
                  <div className="rubric-card" key={d.key} style={{ ["--rubric-color" as string]: d.color }}>
                    <i className={`ti ${d.icon} rubric-card-icon`} />
                    <div className="rubric-card-val">{pct(d.pctVal)}</div>
                    <div className="rubric-card-label">{d.label}</div>
                    <div className="rubric-card-bar">
                      <div className="rubric-card-fill" style={{ width: `${d.pctVal}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Trend */}
          <Card icon="ti-trending-up" title="تطور متوسط التقييم عبر الزمن">
            {trendData.length < 2 ? (
              <div className="page-loading" style={{ padding: "24px 0" }}>
                <span>يلزم أكثر من جلسة تقييم واحدة لعرض الاتجاه</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} stroke="var(--text3)" tick={{ fill: "var(--text2)" }} />
                  <YAxis
                    domain={[0, 10]}
                    fontSize={11}
                    stroke="var(--text3)"
                    tick={{ fill: "var(--text2)" }}
                    tickFormatter={(v: number) => toAr(v)}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [toAr(Number(v)), "متوسط التقييم"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="var(--gold)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "var(--gold)", stroke: "var(--surface)", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Halqa comparison (only when more than one halqa is in play) */}
          {halqaEvalStats.length > 1 && (
            <Card icon="ti-school" title="مقارنة الحلقات في التقييم" headerExtra={<Badge tone="green">{toAr(halqaEvalStats.length)} حلقة</Badge>}>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>الحلقة</th>
                      <th>حضور</th>
                      <th>حفظ</th>
                      <th>تجويد</th>
                      <th>تلاوة</th>
                      <th>المتوسط الكلي</th>
                      <th>الجلسات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {halqaEvalStats.map((h) => (
                      <tr key={h.name}>
                        <td style={{ fontWeight: 700 }}>{h.name}</td>
                        <td>{pct(h.avgAttendance)}</td>
                        <td>{pct(h.avgHifz)}</td>
                        <td>{pct(h.avgTajweed)}</td>
                        <td>{pct(h.avgTalawah)}</td>
                        <td>
                          <strong>{toAr(h.avgTotal)}/{toAr(10)}</strong>
                        </td>
                        <td>{toAr(h.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Leaderboards: top achievers + needs-attention, both evaluation-based */}
          <div className="reports-grid grid-collapse">
            <Card icon="ti-trophy" title="الأعلى تقييماً" headerExtra={<Badge tone="gold">{toAr(evalTop.length)} طالب</Badge>}>
              <Leaderboard rows={evalTop} variant="leader" emptyText="لا توجد تقييمات بعد" emptyIcon="ti-mood-empty" />
            </Card>
            <Card icon="ti-alert-triangle" title="بحاجة لمتابعة (تقييم)" headerExtra={<Badge tone="red">{toAr(evalWatch.length)} طالب</Badge>}>
              <Leaderboard rows={evalWatch} variant="watch" emptyText="لا يوجد طلاب بتقييم منخفض — الحمد لله" emptyIcon="ti-mood-smile" />
            </Card>
          </div>

          {/* Hifz progress distribution — kept, complements the evaluation حفظ dimension */}
          <Card icon="ti-chart-donut" title="توزيع إنجاز الحفظ">
            <Donut data={BUCKET_SLICES(progBuckets)} centerNum={pct(m.avgProg)} centerSub="متوسط الإنجاز" emptyText="لا توجد بيانات إنجاز" />
          </Card>

          {/* Admin-only: org-wide teacher workload */}
          {showAdmin && teacherRows.length > 0 && (
            <Card icon="ti-chalkboard" title="توزيع عبء المعلمين" headerExtra={<Badge tone="blue">{toAr(teacherRows.length)} معلم</Badge>}>
              <ResponsiveContainer width="100%" height={Math.max(180, teacherRows.length * 36)}>
                <BarChart data={teacherRows} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, maxTeacherCount]}
                    fontSize={11}
                    stroke="var(--text3)"
                    tick={{ fill: "var(--text2)" }}
                    tickFormatter={(v: number) => toAr(v)}
                  />
                  <YAxis type="category" dataKey="name" width={110} fontSize={12} stroke="var(--text3)" tick={{ fill: "var(--text)" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, direction: "rtl" }}
                    formatter={(v: number) => [toAr(Number(v)), "عدد الطلاب"]}
                  />
                  <Bar dataKey="count" fill="var(--green3)" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="count" position="right" style={{ fill: "var(--text)", fontSize: 11, fontWeight: 700 }} formatter={(v: number) => toAr(Number(v))} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Admin-only: org-wide KPI scorecard */}
          {showAdmin && (kpis?.length ?? 0) > 0 && (
            <Card icon="ti-target" title="مؤشرات الأداء" headerExtra={<Badge tone="green">تقييم المؤسسة · غير مرتبط بالنطاق</Badge>}>
              <div className="kpi-list">
                {kpis!.map((k) => (
                  <div className="kpi-item" key={k._id}>
                    <div className="kpi-head">
                      <span className="kpi-name">{k.indicator}</span>
                      <span className="kpi-actual">{toAr(k.actual)} / {toAr(k.target)}</span>
                    </div>
                    <ProgressBar pct={pctOf(k.actual, k.target)} />
                    <div className="kpi-meta">
                      <Badge tone={KPI_TONE[k.rating] ?? "gray"}>{k.rating}</Badge>
                      <span>النسبة من الهدف: {pct(pctOf(k.actual, k.target))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Per-student deep dive */}
          <Card icon="ti-report-analytics" title="تقرير طالب مفصّل">
            <StudentReportPanel students={students} aggregateFilter={scopedFilter} aggregateTitle={aggregateTitle} />
          </Card>
        </>
      )}
    </>
  );
}
