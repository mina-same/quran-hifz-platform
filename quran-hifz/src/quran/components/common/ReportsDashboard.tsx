import { useMemo, useState, type ReactNode } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LabelList } from "recharts";
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
import { BentoTile } from "./BentoTile";
import { HonorBoard } from "./HonorBoard";
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

function tierOf(v: number): "ممتاز" | "جيد" | "متوسط" | "ضعيف" {
  if (v >= 90) return "ممتاز";
  if (v >= 75) return "جيد";
  if (v >= 50) return "متوسط";
  return "ضعيف";
}
const TIER_TONE: Record<string, BadgeTone> = { ممتاز: "green", جيد: "blue", متوسط: "gold", ضعيف: "red" };

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

  /* ── trend: cohort avg total score per evaluation date (for the trend chart + hero sparkline) ── */
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

  /* ── half-over-half delta (recent sessions vs earlier ones) per dimension + total,
     used for the hero trend chip and the small up/down arrows on the metric tiles ── */
  const halfSplit = useMemo(() => {
    // Require enough samples per half (≥4 each) that a delta reflects a real
    // shift rather than noise from 2-3 sparse records — a 3-vs-3 split on
    // thin data can swing by several points and read as a false alarm.
    if (evaluations.length < 8) return null;
    const sorted = [...evaluations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const half = Math.floor(sorted.length / 2);
    const first = sorted.slice(0, half);
    const second = sorted.slice(half);
    const deltaOf = (pick: (e: EvaluationRecord) => number) => avg(second.map(pick)) - avg(first.map(pick));
    return {
      total: round1(deltaOf((e) => e.total)),
      attendance: round1(deltaOf((e) => e.scores.attendance)),
      hifz: round1(deltaOf((e) => e.scores.hifz)),
      tajweed: round1(deltaOf((e) => e.scores.tajweed)),
      talawah: round1(deltaOf((e) => e.scores.talawah)),
    };
  }, [evaluations]);

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

  /* ── per-student evaluation leaderboard (honor board top-3 + needs-attention) ── */
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
    if (halfSplit && halfSplit.total >= 0.3) {
      insights.push(
        <Alert key="trend-up" tone="success" icon="ti-trending-up">
          متوسط التقييم في تحسّن مستمر خلال آخر الجلسات
        </Alert>,
      );
    } else if (halfSplit && halfSplit.total <= -0.3) {
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
  const tier = evalStats ? tierOf(evalStats.avgTotalPct) : null;

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
          <div className="bento-grid">
            {/* Hero: huge headline number + sparkline + trend delta, no ring/donut this time */}
            <BentoTile span="2" tall className="bento-hero">
              <div className="hero-eyebrow">الأداء العام</div>
              <div className="hero-number-row">
                <span className="hero-number">{toAr(evalStats.avgTotal)}</span>
                <span className="hero-number-max">/ {toAr(10)}</span>
                {tier && <Badge tone={TIER_TONE[tier]}>{tier}</Badge>}
              </div>
              {halfSplit && Math.abs(halfSplit.total) >= 0.1 && (
                <div className={`hero-delta ${halfSplit.total > 0 ? "up" : "down"}`}>
                  <i className={`ti ${halfSplit.total > 0 ? "ti-trending-up" : "ti-trending-down"}`} />
                  {toAr(Math.abs(halfSplit.total))} عن الفترة السابقة
                </div>
              )}
              <div className="hero-spark">
                <ResponsiveContainer width="100%" height={56}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="avg" stroke="var(--gold)" strokeWidth={2} fill="url(#heroSparkFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="hero-meta">{toAr(evalStats.sessions)} جلسة تقييم مسجّلة</div>
            </BentoTile>

            {/* Rubric breakdown: 4 standalone bento tiles, not nested inside one card */}
            {evalStats.dims.map((d) => {
              const delta = halfSplit ? halfSplit[d.key] : 0;
              const showDelta = halfSplit && Math.abs(delta) >= 0.1;
              return (
                <BentoTile key={d.key} icon={d.icon} label={d.label}>
                  <div className="metric-tile-val" style={{ color: d.color }}>
                    {pct(d.pctVal)}
                  </div>
                  <div className="metric-tile-bar">
                    <div className="metric-tile-fill" style={{ width: `${d.pctVal}%`, background: d.color }} />
                  </div>
                  {showDelta && (
                    <div className={`metric-tile-delta ${delta > 0 ? "up" : "down"}`}>
                      <i className={`ti ${delta > 0 ? "ti-arrow-up-right" : "ti-arrow-down-right"}`} />
                    </div>
                  )}
                </BentoTile>
              );
            })}

            {/* Trend: full-width gradient area chart */}
            <BentoTile span="4" icon="ti-trending-up" label="تطور متوسط التقييم عبر الزمن">
              {trendData.length < 2 ? (
                <div className="page-loading" style={{ padding: "24px 0" }}>
                  <span>يلزم أكثر من جلسة تقييم واحدة لعرض الاتجاه</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--green)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--green)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                    <Area
                      type="monotone"
                      dataKey="avg"
                      stroke="var(--green)"
                      strokeWidth={2}
                      fill="url(#trendAreaFill)"
                      dot={{ r: 4, fill: "var(--green)", stroke: "var(--surface)", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </BentoTile>

            {/* Honor board: top-3 podium + needs-attention list */}
            <BentoTile span="2" icon="ti-trophy" label="الأعلى تقييماً">
              <HonorBoard rows={evalTop} emptyText="لا توجد تقييمات كافية بعد" />
            </BentoTile>
            <BentoTile
              span="2"
              icon="ti-alert-triangle"
              label="بحاجة لمتابعة"
              badge={<Badge tone="red">{toAr(evalWatch.length)}</Badge>}
            >
              <Leaderboard rows={evalWatch} variant="watch" emptyText="لا يوجد طلاب بتقييم منخفض — الحمد لله" emptyIcon="ti-mood-smile" />
            </BentoTile>

            {/* Halqa comparison (only when more than one halqa is in play) */}
            {halqaEvalStats.length > 1 && (
              <BentoTile
                span="4"
                icon="ti-school"
                label="مقارنة الحلقات في التقييم"
                badge={<Badge tone="green">{toAr(halqaEvalStats.length)} حلقة</Badge>}
              >
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
                            <strong>
                              {toAr(h.avgTotal)}/{toAr(10)}
                            </strong>
                          </td>
                          <td>{toAr(h.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </BentoTile>
            )}

            {/* Hifz progress distribution — kept, complements the evaluation حفظ dimension */}
            <BentoTile span={showAdmin ? "2" : "4"} icon="ti-chart-donut" label="توزيع إنجاز الحفظ">
              <Donut data={BUCKET_SLICES(progBuckets)} centerNum={pct(m.avgProg)} centerSub="متوسط الإنجاز" emptyText="لا توجد بيانات إنجاز" />
            </BentoTile>

            {/* Admin-only: org-wide teacher workload */}
            {showAdmin && teacherRows.length > 0 && (
              <BentoTile span="2" icon="ti-chalkboard" label="توزيع عبء المعلمين" badge={<Badge tone="blue">{toAr(teacherRows.length)} معلم</Badge>}>
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
              </BentoTile>
            )}

            {/* Admin-only: org-wide KPI scorecard */}
            {showAdmin && (kpis?.length ?? 0) > 0 && (
              <BentoTile span="4" icon="ti-target" label="مؤشرات الأداء" badge={<Badge tone="green">تقييم المؤسسة</Badge>}>
                <div className="kpi-list">
                  {kpis!.map((k) => (
                    <div className="kpi-item" key={k._id}>
                      <div className="kpi-head">
                        <span className="kpi-name">{k.indicator}</span>
                        <span className="kpi-actual">
                          {toAr(k.actual)} / {toAr(k.target)}
                        </span>
                      </div>
                      <ProgressBar pct={pctOf(k.actual, k.target)} />
                      <div className="kpi-meta">
                        <Badge tone={KPI_TONE[k.rating] ?? "gray"}>{k.rating}</Badge>
                        <span>النسبة من الهدف: {pct(pctOf(k.actual, k.target))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </BentoTile>
            )}
          </div>

          {/* Per-student deep dive */}
          <Card icon="ti-report-analytics" title="تقرير طالب مفصّل">
            <StudentReportPanel students={students} aggregateFilter={scopedFilter} aggregateTitle={aggregateTitle} />
          </Card>
        </>
      )}
    </>
  );
}
