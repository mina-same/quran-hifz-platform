import { useMemo, useState, type ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from "recharts";
import { toAr, pct } from "../../../lib/format";
import { downloadCsv } from "../../../lib/csv";
import { useStudents, type Student, type StudentFilters } from "../../api/students";
import type { Kpi } from "../../api/kpis";
import type { Teacher } from "../../api/teachers";
import type { Halqa } from "../../api/halqat";
import type { SpecialTrack } from "../../api/special-tracks";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "./Card";
import { StatsRow } from "./StatsRow";
import { Alert } from "./Alert";
import { ProgressBar } from "./ProgressBar";
import { Badge, type BadgeTone } from "./Badge";
import { Donut, type DonutSlice } from "./Donut";
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

/** Buckets a 0–100 metric into 4 ranges for distribution donuts. */
function bucket(vals: number[]) {
  return {
    high: vals.filter((v) => v >= 90).length,
    mid: vals.filter((v) => v >= 75 && v < 90).length,
    low: vals.filter((v) => v >= 50 && v < 75).length,
    risk: vals.filter((v) => v < 50).length,
  };
}

const COLOR_HIGH = "var(--green)";
const COLOR_MID = "var(--green3)";
const COLOR_LOW = "var(--gold)";
const COLOR_RISK = "#ef4444";

const BUCKET_SLICES = (b: ReturnType<typeof bucket>): DonutSlice[] => [
  { name: "ممتاز (٩٠٪+)", value: b.high, color: COLOR_HIGH },
  { name: "جيد (٧٥–٩٠٪)", value: b.mid, color: COLOR_MID },
  { name: "متوسط (٥٠–٧٥٪)", value: b.low, color: COLOR_LOW },
  { name: "دون ٥٠٪", value: b.risk, color: COLOR_RISK },
];

const MASAR_PALETTE = [
  "var(--green)",
  "var(--gold)",
  "#3b82f6",
  "var(--brown)",
  "var(--green3)",
  "#8aab8e",
  "#c9952a",
  "#3d9952",
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

/* ── component ────────────────────────────────────────────────────────── */

export function ReportsAnalytics({
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
  /** Filter representing the "all" scope (admin: {} ; teacher: {halqa: ids}). */
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

  /* ── derived metrics ──────────────────────────────────────────────── */
  const m = useMemo(() => {
    const n = students.length;
    const sumAtt = students.reduce((s, x) => s + (x.attendancePct ?? 0), 0);
    const sumProg = students.reduce((s, x) => s + (x.progressPct ?? 0), 0);
    const avgAtt = n ? Math.round(sumAtt / n) : 0;
    const avgProg = n ? Math.round(sumProg / n) : 0;
    const atRisk = students.filter((s) => s.attendancePct < 75 || s.progressPct < 50);
    const gifted = students.filter((s) => s.progressPct >= 85);
    return { n, avgAtt, avgProg, atRisk, gifted };
  }, [students]);

  const attBuckets = useMemo(() => bucket(students.map((s) => s.attendancePct)), [students]);
  const progBuckets = useMemo(() => bucket(students.map((s) => s.progressPct)), [students]);

  const halqaStats = useMemo(() => {
    const map = new Map<string, { name: string; sumAtt: number; sumProg: number; count: number }>();
    for (const s of students) {
      const id = halqaIdOf(s);
      if (!id) continue;
      const name = halqaNameOf(s) || "—";
      const e = map.get(id) ?? { name, sumAtt: 0, sumProg: 0, count: 0 };
      e.sumAtt += s.attendancePct ?? 0;
      e.sumProg += s.progressPct ?? 0;
      e.count += 1;
      map.set(id, e);
    }
    return Array.from(map.entries())
      .map(([id, e]) => ({
        id,
        name: e.name,
        avgAtt: e.count ? Math.round(e.sumAtt / e.count) : 0,
        count: e.count,
      }))
      .sort((a, b) => b.avgAtt - a.avgAtt);
  }, [students]);

  const masarStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of students) {
      const key = s.path || "غير محدد";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      color: MASAR_PALETTE[i % MASAR_PALETTE.length],
    }));
  }, [students]);

  const topPerformers: LeaderRow[] = useMemo(
    () =>
      [...students]
        .sort((a, b) => b.progressPct - a.progressPct)
        .slice(0, 8)
        .map((s) => ({
          id: s._id,
          name: s.name,
          subtitle: halqaNameOf(s) || "—",
          meter: s.progressPct,
          display: pct(s.progressPct),
        })),
    [students],
  );

  const watchlist: LeaderRow[] = useMemo(
    () =>
      m.atRisk
        .map((s) => {
          const lowAtt = s.attendancePct < 75;
          const lowProg = s.progressPct < 50;
          const tone: BadgeTone = lowAtt && lowProg ? "red" : lowAtt ? "gold" : "blue";
          const text =
            lowAtt && lowProg ? "حضور وإنجاز منخفضان" : lowAtt ? "حضور منخفض" : "إنجاز منخفض";
          // risk score: lower = worse
          const score = s.attendancePct + s.progressPct;
          return { row: s, score, tone, text };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 8)
        .map(({ row, tone, text }) => ({
          id: row._id,
          name: row.name,
          subtitle: halqaNameOf(row) || "—",
          meter: Math.round((row.attendancePct + row.progressPct) / 2),
          display: `${pct(row.attendancePct)} · ${pct(row.progressPct)}`,
          reason: { tone, text } as { tone: BadgeTone; text: string },
        })),
    [m.atRisk],
  );

  const teacherRows = useMemo(
    () =>
      (teachers ?? [])
        .slice()
        .sort((a, b) => (b.studentCount ?? 0) - (a.studentCount ?? 0))
        .slice(0, 10)
        .map((t) => ({ name: t.name, count: t.studentCount ?? 0, halqat: t.halqatCount ?? 0 })),
    [teachers],
  );
  const maxTeacherCount = useMemo(
    () => teacherRows.reduce((mx, r) => Math.max(mx, r.count), 0) || 1,
    [teacherRows],
  );

  /* ── insights (auto) ──────────────────────────────────────────────── */
  const insights: ReactNode[] = [];
  if (!isLoading && m.n > 0) {
    if (m.atRisk.length > 0) {
      insights.push(
        <Alert key="risk" tone="warning" icon="ti-alert-triangle">
          <b>{toAr(m.atRisk.length)}</b> طالب يحتاجون متابعة — نسبة الحضور أو الإنجاز دون المستهدف
        </Alert>,
      );
    }
    if (m.gifted.length > 0) {
      insights.push(
        <Alert key="gifted" tone="success" icon="ti-star">
          <b>{toAr(m.gifted.length)}</b> طالب متفوقون بإنجاز تجاوز ٨٥٪ — يستحقون التكريم
        </Alert>,
      );
    }
    const topHalqa = halqaStats[0];
    if (scope === "" && halqaStats.length > 1 && topHalqa) {
      insights.push(
        <Alert key="top" tone="info" icon="ti-trophy">
          حلقة <b>{topHalqa.name}</b> متصدّرة في الحضور بمتوسط <b>{pct(topHalqa.avgAtt)}</b>
        </Alert>,
      );
    }
    if (m.avgProg < 50 && m.n > 0) {
      insights.push(
        <Alert key="lowprog" tone="danger" icon="ti-trending-down">
          متوسط الإنجاز منخفض (<b>{pct(m.avgProg)}</b>) — يُنصح بمراجعة الخطط القرآنية
        </Alert>,
      );
    }
  }

  /* ── exports (respect the active scope) ────────────────────────────── */
  function exportAttendance() {
    downloadCsv(
      "تقرير-الحضور.csv",
      ["الطالب", "الحلقة", "نسبة الحضور"],
      students.map((s) => [s.name, halqaNameOf(s), `${s.attendancePct}%`]),
    );
  }
  function exportHifz() {
    downloadCsv(
      "تقرير-إنجاز-الحفظ.csv",
      ["الطالب", "الحلقة", "الصفحات المنجزة", "إجمالي الصفحات", "النسبة"],
      students.map((s) => [
        s.name,
        halqaNameOf(s),
        s.progressPages,
        s.totalPages,
        `${s.progressPct}%`,
      ]),
    );
  }
  function exportGifted() {
    downloadCsv(
      "تقرير-المتفوقين.csv",
      ["الطالب", "الحلقة", "نسبة الإنجاز", "نسبة الحضور"],
      [...m.gifted]
        .sort((a, b) => b.progressPct - a.progressPct)
        .map((s) => [s.name, halqaNameOf(s), `${s.progressPct}%`, `${s.attendancePct}%`]),
    );
  }
  function exportAtRisk() {
    downloadCsv(
      "تقرير-الطلاب-ذوي-المتابعة.csv",
      ["الطالب", "الحلقة", "نسبة الحضور", "نسبة الإنجاز"],
      m.atRisk.map((s) => [s.name, halqaNameOf(s), `${s.attendancePct}%`, `${s.progressPct}%`]),
    );
  }
  function exportKpis() {
    downloadCsv(
      "تقرير-مؤشرات-الأداء.csv",
      ["المؤشر", "المستهدف", "الفعلي", "التقييم", "النسبة من الهدف"],
      (kpis ?? []).map((k) => [
        k.indicator,
        k.target,
        k.actual,
        k.rating,
        `${pctOf(k.actual, k.target)}%`,
      ]),
    );
  }
  function exportTeachers() {
    downloadCsv(
      "تقرير-المعلمين.csv",
      ["الاسم", "التخصص", "الهاتف", "التقييم", "عدد الحلقات", "عدد الطلاب"],
      (teachers ?? []).map((t) => [
        t.name,
        t.specialty,
        t.phone,
        t.rating,
        t.halqatCount ?? 0,
        t.studentCount ?? 0,
      ]),
    );
  }
  function exportAll() {
    if (students.length) {
      exportAttendance();
      exportHifz();
    }
    if (m.gifted.length) exportGifted();
    if (m.atRisk.length) exportAtRisk();
    if (showAdmin && (kpis?.length ?? 0) > 0) exportKpis();
    if (showAdmin && (teachers?.length ?? 0) > 0) exportTeachers();
  }

  /* ── export dropdown (topbar) ──────────────────────────────────────── */
  const [exportOpen, setExportOpen] = useState(false);
  const exportItems: { label: string; icon: string; fn: () => void; disabled?: boolean }[] = [
    {
      label: "تقرير الحضور",
      icon: "ti-calendar",
      fn: exportAttendance,
      disabled: students.length === 0,
    },
    {
      label: "تقرير إنجاز الحفظ",
      icon: "ti-book",
      fn: exportHifz,
      disabled: students.length === 0,
    },
    {
      label: "تقرير المتفوقين",
      icon: "ti-star",
      fn: exportGifted,
      disabled: m.gifted.length === 0,
    },
    {
      label: "تقرير ذوي المتابعة",
      icon: "ti-alert-triangle",
      fn: exportAtRisk,
      disabled: m.atRisk.length === 0,
    },
  ];
  if (showAdmin) {
    exportItems.push({
      label: "مؤشرات الأداء",
      icon: "ti-target",
      fn: exportKpis,
      disabled: (kpis?.length ?? 0) === 0,
    });
    exportItems.push({
      label: "تقرير المعلمين",
      icon: "ti-chalkboard",
      fn: exportTeachers,
      disabled: (teachers?.length ?? 0) === 0,
    });
  }
  const exportMenu = (
    <div className="export-menu">
      <button
        className="topbar-btn btn-primary"
        onClick={() => setExportOpen((o) => !o)}
        disabled={students.length === 0 && !showAdmin}
      >
        <i className="ti ti-download" /> تصدير{" "}
        <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
      </button>
      {exportOpen && (
        <>
          <button
            className="export-menu-backdrop"
            onClick={() => setExportOpen(false)}
            aria-hidden
            tabIndex={-1}
          />
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
            <div className="export-menu-divider" />
            <button
              className="export-menu-item"
              onClick={() => {
                exportAll();
                setExportOpen(false);
              }}
            >
              <i className="ti ti-download" /> تصدير الكل
            </button>
          </div>
        </>
      )}
    </div>
  );

  useTopbar(topbarIcon, topbarTitle, exportMenu);

  /* ── scope options ────────────────────────────────────────────────── */
  const scopeOptions = useMemo(() => {
    const opts: { value: string; label: string; icon?: string }[] = [
      { value: "", label: scopeAllLabel, icon: "ti-users" },
    ];
    if (halqat.length > 0)
      opts.push({ value: `halqa:${halqat[0]._id}`, label: halqat[0].name, icon: "ti-school" });
    halqat
      .slice(1)
      .forEach((h) => opts.push({ value: `halqa:${h._id}`, label: h.name, icon: "ti-school" }));
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
      {/* KPI strip */}
      <StatsRow
        items={[
          { num: toAr(m.n), label: "إجمالي الطلاب", icon: "ti-users" },
          { num: pct(m.avgAtt), label: "متوسط الحضور", icon: "ti-calendar-check", variant: "blue" },
          { num: pct(m.avgProg), label: "متوسط الإنجاز", icon: "ti-book" },
          {
            num: toAr(m.atRisk.length),
            label: "ذوو المتابعة",
            icon: "ti-alert-triangle",
            variant: m.atRisk.length > 0 ? "red" : "",
          },
        ]}
      />

      {/* Scope selector */}
      {scopeOptions.length > 1 && (
        <ScopeTabs options={scopeOptions} value={scope} onChange={setScope} />
      )}

      {/* Insights */}
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
      ) : (
        <>
          {/* Distribution widgets */}
          <div className="reports-grid grid-collapse">
            <Card icon="ti-chart-donut" title="توزيع نسبة الحضور">
              <Donut
                data={BUCKET_SLICES(attBuckets)}
                centerNum={pct(m.avgAtt)}
                centerSub="متوسط الحضور"
                emptyText="لا توجد بيانات حضور"
              />
            </Card>
            <Card icon="ti-chart-donut" title="توزيع إنجاز الحفظ">
              <Donut
                data={BUCKET_SLICES(progBuckets)}
                centerNum={pct(m.avgProg)}
                centerSub="متوسط الإنجاز"
                emptyText="لا توجد بيانات إنجاز"
              />
            </Card>
          </div>

          {/* Comparison + masar (admin) */}
          <div className="reports-grid grid-collapse">
            <Card
              icon="ti-trophy"
              title="ترتيب الحلقات حسب الحضور"
              headerExtra={<Badge tone="green">{toAr(halqaStats.length)} حلقة</Badge>}
            >
              {halqaStats.length === 0 ? (
                <div className="page-loading" style={{ padding: "24px 0" }}>
                  <span>لا توجد حلقات بيانات</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, halqaStats.length * 38)}>
                  <BarChart
                    data={halqaStats}
                    layout="vertical"
                    margin={{ left: 8, right: 36, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      fontSize={11}
                      stroke="var(--text3)"
                      tick={{ fill: "var(--text2)" }}
                      tickFormatter={(v: number) => toAr(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
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
                        direction: "rtl",
                      }}
                      formatter={(v: number) => [pct(Number(v)), "متوسط الحضور"]}
                    />
                    <Bar dataKey="avgAtt" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      {halqaStats.map((h, i) => (
                        <Cell key={h.id} fill={i === 0 ? "var(--gold)" : "var(--green)"} />
                      ))}
                      <LabelList
                        dataKey="avgAtt"
                        position="right"
                        style={{ fill: "var(--text)", fontSize: 11, fontWeight: 700 }}
                        formatter={(v: number) => pct(Number(v))}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {showAdmin ? (
              <Card
                icon="ti-route"
                title="توزيع المسارات"
                headerExtra={<Badge tone="blue">{toAr(masarStats.length)} مسار</Badge>}
              >
                {masarStats.length === 0 ? (
                  <div className="page-loading" style={{ padding: "24px 0" }}>
                    <span>لا توجد مسارات</span>
                  </div>
                ) : (
                  <Donut
                    data={masarStats}
                    centerNum={toAr(m.n)}
                    centerSub="طالب"
                    showLegend
                    size={170}
                  />
                )}
              </Card>
            ) : (
              <Card
                icon="ti-star"
                title="أبرز المتفوقين"
                headerExtra={<Badge tone="gold">{toAr(m.gifted.length)} متفوق</Badge>}
              >
                <Leaderboard
                  rows={topPerformers}
                  variant="leader"
                  emptyText="لا يوجد متفوقون بعد"
                  emptyIcon="ti-mood-empty"
                />
              </Card>
            )}
          </div>

          {/* Leaderboards: top performers + watchlist */}
          {showAdmin && (
            <div className="reports-grid grid-collapse">
              <Card
                icon="ti-trophy"
                title="لوحة المتفوقين"
                headerExtra={<Badge tone="gold">{toAr(m.gifted.length)} طالب</Badge>}
              >
                <Leaderboard
                  rows={topPerformers}
                  variant="leader"
                  emptyText="لا يوجد متفوقون (إنجاز ≥ ٨٥٪)"
                  emptyIcon="ti-mood-empty"
                />
              </Card>
              <Card
                icon="ti-alert-triangle"
                title="قائمة ذوي المتابعة"
                headerExtra={<Badge tone="red">{toAr(m.atRisk.length)} طالب</Badge>}
              >
                <Leaderboard
                  rows={watchlist}
                  variant="watch"
                  emptyText="لا يوجد طلاب يحتاجون متابعة — الحمد لله"
                  emptyIcon="ti-mood-smile"
                />
              </Card>
            </div>
          )}

          {!showAdmin && (
            <Card
              icon="ti-alert-triangle"
              title="قائمة ذوي المتابعة"
              headerExtra={<Badge tone="red">{toAr(m.atRisk.length)} طالب</Badge>}
            >
              <Leaderboard
                rows={watchlist}
                variant="watch"
                emptyText="لا يوجد طلاب يحتاجون متابعة — الحمد لله"
                emptyIcon="ti-mood-smile"
              />
            </Card>
          )}

          {/* Admin-only scorecards (org-wide, not cohort-scoped) */}
          {showAdmin && (kpis?.length ?? 0) > 0 && (
            <Card
              icon="ti-target"
              title="مؤشرات الأداء"
              headerExtra={<Badge tone="green">تقييم المؤسسة · غير مرتبط بالنطاق</Badge>}
            >
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
            </Card>
          )}

          {showAdmin && teacherRows.length > 0 && (
            <Card
              icon="ti-chalkboard"
              title="توزيع عبء المعلمين"
              headerExtra={<Badge tone="blue">{toAr(teacherRows.length)} معلم</Badge>}
            >
              <ResponsiveContainer width="100%" height={Math.max(180, teacherRows.length * 36)}>
                <BarChart
                  data={teacherRows}
                  layout="vertical"
                  margin={{ left: 8, right: 36, top: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, maxTeacherCount]}
                    fontSize={11}
                    stroke="var(--text3)"
                    tick={{ fill: "var(--text2)" }}
                    tickFormatter={(v: number) => toAr(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
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
                      direction: "rtl",
                    }}
                    formatter={(v: number) => [toAr(Number(v)), "عدد الطلاب"]}
                  />
                  <Bar dataKey="count" fill="var(--green3)" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fill: "var(--text)", fontSize: 11, fontWeight: 700 }}
                      formatter={(v: number) => toAr(Number(v))}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Detailed student deep-dive */}
          <Card icon="ti-report-analytics" title="تقرير طالب مفصّل">
            <StudentReportPanel
              students={students}
              aggregateFilter={scopedFilter}
              aggregateTitle={aggregateTitle}
            />
          </Card>
        </>
      )}
    </>
  );
}
