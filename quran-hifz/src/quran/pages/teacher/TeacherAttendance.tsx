import { useEffect, useMemo, useRef, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge } from "../../components/common/Badge";
import {
  ContextPicker,
  halqaToContext,
  trackToContext,
  type TeachingContext,
} from "../../components/common/ContextPicker";
import { SkeletonCard, SkeletonTable } from "../../components/common/Skeleton";
import { useHalqat } from "../../api/halqat";
import { useSpecialTracks } from "../../api/special-tracks";
import { useStudents } from "../../api/students";
import { ATTENDANCE_PREFILL_TRACK_KEY } from "../../api/attendance";
import { useQuranPlans, type ScheduleEntry } from "../../api/quran-plans";
import { useEvaluations, useBulkEvaluate, type BulkEvaluateRecord } from "../../api/evaluations";
import { MAX_SCORES, TOTAL_MAX } from "../../lib/evaluationRubric";
import { SURAHS } from "../../data/surahs";
import { toAr } from "../../../lib/format";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}

// Matches the server's ARABIC_WEEKDAYS (attendance.controller.ts), indexed by
// Date.getDay(): 0=الأحد (Sunday) … 6=السبت (Saturday).
const ARABIC_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function weekdayOf(iso: string): string {
  return ARABIC_WEEKDAYS[new Date(iso + "T00:00:00").getDay()];
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
/** Normalize any date-ish string (full ISO timestamp OR bare YYYY-MM-DD) to a
 *  bare `YYYY-MM-DD` so date math + set keys are consistent. The server stores
 *  schedule dates as full ISO timestamps, so without this `new Date(iso + "T00:00:00")`
 *  double-appends a time component and yields an Invalid Date → page crash. */
function toDateOnly(s: string): string {
  return String(s).slice(0, 10);
}
function fmtDate(iso: string): string {
  return toAr(
    new Date(iso + "T00:00:00").toLocaleDateString("ar-SA", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
}

type DayChip = { iso: string; weekday: string; dayNum: number; isToday: boolean };
function buildDayChips(minIso: string, maxIso: string, today: string): DayChip[] {
  const out: DayChip[] = [];
  let cur = minIso;
  let guard = 0;
  while (cur <= maxIso && guard < 1095) {
    const d = new Date(cur + "T00:00:00");
    out.push({ iso: cur, weekday: weekdayOf(cur), dayNum: d.getDate(), isToday: cur === today });
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

type ScoreCategory = "hifz" | "tajweed" | "talawah";
const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  hifz: "حفظ",
  tajweed: "تجويد",
  talawah: "تلاوة",
};

type StudentEval = {
  attendanceStatus: "حاضر" | "غائب";
  hifz: number;
  tajweed: number;
  talawah: number;
};

/** Default eval for a present student — scores start at 0 so the teacher
 *  consciously awards points rather than every student defaulting to full marks. */
function blankEval(): StudentEval {
  return { attendanceStatus: "حاضر", hifz: 0, tajweed: 0, talawah: 0 };
}

function totalOf(e: StudentEval): number {
  if (e.attendanceStatus === "غائب") return 0;
  return MAX_SCORES.attendance + e.hifz + e.tajweed + e.talawah;
}

export function TeacherAttendance() {
  const { user } = usePortal();
  const [selected, setSelected] = useState<TeachingContext | null>(null);

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: user?.profileId });
  const { data: tracks = [], isLoading: loadingTracks } = useSpecialTracks(
    undefined,
    user?.profileId as string | undefined,
  );

  const contexts: TeachingContext[] = [
    ...halqat.map(halqaToContext),
    ...tracks.map(trackToContext),
  ];

  // Deep link from the Special Tracks page's "تسجيل الحضور" button.
  // Applied at most once (ref-guarded) so the teacher's explicit "رجوع" click
  // (which sets selected=null) isn't overridden by the effect re-running and
  // re-selecting the deep-linked track.
  const [pendingTrackId] = useState(() => {
    const id = sessionStorage.getItem(ATTENDANCE_PREFILL_TRACK_KEY);
    if (id) sessionStorage.removeItem(ATTENDANCE_PREFILL_TRACK_KEY);
    return id;
  });
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current || !pendingTrackId) return;
    const track = tracks.find((t) => t._id === pendingTrackId);
    if (track) {
      setSelected(trackToContext(track));
      prefillApplied.current = true;
    }
  }, [pendingTrackId, tracks]);

  const contextFilter = selected
    ? selected.kind === "halqa"
      ? { halqa: selected.id }
      : { specialTrack: selected.id }
    : undefined;

  const { data: students = [], isLoading: loadingStudents } = useStudents(contextFilter);
  const bulkEvaluate = useBulkEvaluate();

  const today = new Date().toISOString().split("T")[0];

  // All active memorization plans for this context. Each plan carries a
  // `schedule` (server-computed list of every occurrence's date + ayah slice +
  // juz'), which is the source of truth for which days have an assignment.
  const { data: plans = [], isLoading: loadingPlans } = useQuranPlans(contextFilter);

  // Day slider state — "" means "not yet chosen", falls back to defaultDate.
  const [selectedDate, setSelectedDate] = useState("");

  const { scheduledSet, scheduledSorted, assignmentByDate, dayChips, defaultDate, effectiveDate } =
    useMemo(() => {
      const set = new Set<string>();
      const byDate = new Map<string, ScheduleEntry>();
      for (const p of plans) {
        for (const e of p.schedule ?? []) {
          if (!e.date) continue;
          const d = toDateOnly(e.date);
          set.add(d);
          if (!byDate.has(d)) byDate.set(d, e);
        }
      }
      const sorted = Array.from(set).sort();
      const chips = sorted.length ? buildDayChips(sorted[0], sorted[sorted.length - 1], today) : [];
      // Default to the latest scheduled day ≤ today; if none past, the first
      // upcoming scheduled day. Always lands on a planned day so the roster
      // opens with a real assignment instead of a "no plan" warning.
      let dflt = sorted.length ? sorted[0] : today;
      if (sorted.length) {
        const pastOrToday = sorted.filter((d) => d <= today);
        dflt = pastOrToday.length ? pastOrToday[pastOrToday.length - 1] : sorted[0];
      }
      const effective = selectedDate && set.has(selectedDate) ? selectedDate : dflt;
      return {
        scheduledSet: set,
        scheduledSorted: sorted,
        assignmentByDate: byDate,
        dayChips: chips,
        defaultDate: dflt,
        effectiveDate: effective,
      };
    }, [plans, selectedDate, today]);

  // Reset per-student edits when the effective day changes so Monday's edits
  // don't leak into Tuesday's roster for the same students.
  useEffect(() => {
    setOverrides({});
  }, [effectiveDate]);

  // Auto-scroll the active day chip into view whenever the effective day changes
  // (the slider can span months — without this the selected day stays off-screen).
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = trackRef.current?.querySelector(".day-chip.active") as HTMLElement | null;
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [effectiveDate, dayChips]);

  // Already-saved evaluations for the selected day, so re-opening the same
  // halqa/track/day shows what was actually recorded.
  const { data: savedToday = [] } = useEvaluations(
    contextFilter ? { ...contextFilter, from: effectiveDate, to: effectiveDate } : undefined,
  );
  const savedById: Record<string, StudentEval> = {};
  for (const r of savedToday) {
    const id = typeof r.student === "string" ? r.student : r.student._id;
    savedById[id] = {
      attendanceStatus: r.attendanceStatus,
      hifz: r.scores.hifz,
      tajweed: r.scores.tajweed,
      talawah: r.scores.talawah,
    };
  }

  // Full session history for this context (all dates), for the log below.
  const { data: history = [] } = useEvaluations(contextFilter);

  const [overrides, setOverrides] = useState<Record<string, StudentEval>>({});
  const evalFor = (studentId: string): StudentEval =>
    overrides[studentId] ?? savedById[studentId] ?? blankEval();

  function setAttendance(studentId: string, status: "حاضر" | "غائب") {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...evalFor(studentId), attendanceStatus: status },
    }));
  }
  function setScore(studentId: string, category: ScoreCategory, value: number) {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...evalFor(studentId), [category]: value },
    }));
  }

  const assignment = assignmentByDate.get(effectiveDate);
  const hasAssignment = !!assignment;
  // Once evaluations exist for this exact day, block re-sending — a second
  // bulk-evaluate would re-notify parents and could overwrite the teacher's
  // recorded scores. The roster stays read-only until a different day is picked.
  const alreadySubmitted = savedToday.length > 0;

  useTopbar(
    "ti-calendar-check",
    selected ? `الحضور والتقييم — ${selected.title}` : "الحضور والتقييم",
    selected ? (
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="topbar-btn btn-ghost"
          onClick={() => {
            setSelected(null);
            setOverrides({});
            setSelectedDate("");
          }}
        >
          <i className="ti ti-arrow-right" /> الحلقات والمسارات
        </button>
        <button
          className="topbar-btn btn-primary"
          onClick={() => {
            const records: BulkEvaluateRecord[] = students.map((s) => {
              const e = evalFor(s._id);
              return {
                student: s._id,
                attendanceStatus: e.attendanceStatus,
                hifz: e.hifz,
                tajweed: e.tajweed,
                talawah: e.talawah,
              };
            });
            bulkEvaluate.mutate({
              teacher: user!.profileId as string,
              ...(selected.kind === "halqa"
                ? { halqa: selected.id }
                : { specialTrack: selected.id }),
              date: effectiveDate,
              records,
            });
          }}
          disabled={bulkEvaluate.isPending || !hasAssignment || alreadySubmitted}
        >
          <i className={`ti ${alreadySubmitted ? "ti-circle-check" : "ti-send"}`} />
          {bulkEvaluate.isPending
            ? "جارٍ الحفظ..."
            : alreadySubmitted
              ? "تم الإرسال لهذا اليوم"
              : "حفظ وإرسال إشعارات"}
        </button>
      </div>
    ) : undefined,
  );

  // ── View 1: context selector ──────────────────────────────────────
  if (!selected) {
    if (loadingHalqat || loadingTracks) {
      return <SkeletonCard lines={2} />;
    }
    return (
      <ContextPicker
        contexts={contexts}
        onSelect={setSelected}
        emptyLabel="لا توجد حلقات أو مسارات مسجلة لهذا المعلم"
        heading="اختر الحلقة أو المسار الاستثنائي لتسجيل حضور وتقييم اليوم"
        actionLabel="أخذ الحضور والتقييم"
        actionIcon="ti-calendar-check"
      />
    );
  }

  // ── View 2: day slider + attendance + evaluation list ─────────────
  const presentCount = students.filter((s) => evalFor(s._id).attendanceStatus === "حاضر").length;
  const absentCount = students.length - presentCount;

  return (
    <>
      {/* Day slider — only when there are scheduled days for this context */}
      {loadingPlans ? (
        <SkeletonCard lines={1} />
      ) : scheduledSorted.length > 0 ? (
        <div className="day-slider" role="tablist" aria-label="اختر اليوم">
          <button
            type="button"
            className="day-slider-arrow"
            onClick={() => {
              const i = scheduledSorted.indexOf(effectiveDate);
              if (i > 0) setSelectedDate(scheduledSorted[i - 1]);
            }}
            disabled={scheduledSorted.indexOf(effectiveDate) <= 0}
            aria-label="اليوم السابق"
          >
            <i className="ti ti-chevron-right" />
          </button>
          <div className="day-slider-track" ref={trackRef}>
            {dayChips.map((d) => {
              const enabled = scheduledSet.has(d.iso);
              const isSel = d.iso === effectiveDate;
              return (
                <button
                  key={d.iso}
                  type="button"
                  role="tab"
                  aria-selected={isSel}
                  aria-disabled={!enabled}
                  disabled={!enabled}
                  className={`day-chip ${isSel ? "active" : ""} ${d.isToday ? "is-today" : ""}`}
                  onClick={() => setSelectedDate(d.iso)}
                  title={enabled ? fmtDate(d.iso) : "لا يوجد خطة لهذا اليوم"}
                >
                  <span className="day-chip-wd">{d.weekday}</span>
                  <span className="day-chip-num">{toAr(d.dayNum)}</span>
                  {d.isToday && <span className="day-chip-today-dot" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="day-slider-arrow"
            onClick={() => {
              const i = scheduledSorted.indexOf(effectiveDate);
              if (i >= 0 && i < scheduledSorted.length - 1) setSelectedDate(scheduledSorted[i + 1]);
            }}
            disabled={scheduledSorted.indexOf(effectiveDate) >= scheduledSorted.length - 1}
            aria-label="اليوم التالي"
          >
            <i className="ti ti-chevron-left" />
          </button>
        </div>
      ) : null}

      {!loadingPlans && scheduledSorted.length === 0 && (
        <Alert tone="warning">
          لا يوجد خطة حفظ نشطة لهذه {selected.kind === "halqa" ? "الحلقة" : "المسار"} — لا يمكن
          تسجيل الحضور والتقييم بدون خطة تحدد الآيات المطلوبة لكل يوم. أضف خطة من صفحة "الخطط
          القرآنية" أولاً.
        </Alert>
      )}

      {assignment && (
        <div className="assignment-banner">
          <div className="assignment-icon">
            <i className="ti ti-book-2" />
          </div>
          <div className="assignment-body">
            <div className="assignment-label">
              <i className="ti ti-clipboard-text" /> الورد المقرر
            </div>
            <div className="assignment-range">
              <span>
                {surahName(assignment.surahStart)} : {toAr(assignment.ayahStart)}
              </span>
              <i className="ti ti-arrow-left assignment-arrow" />
              <span>
                {surahName(assignment.surahEnd)} : {toAr(assignment.ayahEnd)}
              </span>
            </div>
          </div>
          <div className="assignment-meta">
            <span className="assignment-pill">
              <i className="ti ti-file-text" />
              صفحة {toAr(assignment.pageStart)}
              {assignment.pageEnd !== assignment.pageStart
                ? ` - ${toAr(assignment.pageEnd)}`
                : ""}
            </span>
            <span className="assignment-pill">
              <i className="ti ti-bookmark" />
              الجزء {toAr(assignment.juz)}
            </span>
          </div>
        </div>
      )}

      {(loadingPlans || scheduledSorted.length > 0) && (
        <Card
          icon={selected.kind === "halqa" ? "ti-school" : "ti-calendar-event"}
          title={selected.title}
          headerExtra={
            <span style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(effectiveDate)}</span>
          }
        >
          {loadingStudents ? (
            <SkeletonTable cols={3} rows={5} />
          ) : (
            <>
              {alreadySubmitted && (
                <Alert tone="success" icon="ti-lock">
                  تم إرسال الحضور والتقييم لهذا اليوم مسبقًا — لا يمكن التعديل أو الإرسال مرة أخرى.
                  اختر يومًا آخر من الأعلى للتسجيل.
                </Alert>
              )}
              {students.length > 0 && (
                <div className="att-summary">
                  <span className="att-chip">
                    <i className="ti ti-check" /> حاضر: {toAr(presentCount)}
                  </span>
                  <span className="att-chip absent">
                    <i className="ti ti-x" /> غائب: {toAr(absentCount)}
                  </span>
                  <button
                    className="att-mark-all"
                    disabled={alreadySubmitted}
                    onClick={() => {
                      const all: Record<string, StudentEval> = {};
                      students.forEach((s) => {
                        all[s._id] = { ...evalFor(s._id), attendanceStatus: "حاضر" };
                      });
                      setOverrides(all);
                    }}
                  >
                    <i className="ti ti-checks" /> تحديد الكل حاضر
                  </button>
                </div>
              )}
              <div className="att-list">
                {students.map((s) => {
                  const e = evalFor(s._id);
                  const isAbsent = e.attendanceStatus === "غائب";
                  const total = totalOf(e);
                  return (
                    <div key={s._id} className={`att-row ${isAbsent ? "is-absent" : ""}`}>
                      <div className="att-row-top">
                        <div className="att-avatar">{s.name.trim().charAt(0)}</div>
                        <div className="att-info">
                          <div className="att-name">{s.name}</div>
                          <div className="att-sub">آخر حفظ: {s.lastMemorization || "—"}</div>
                        </div>
                        <div className="att-toggle">
                          <button
                            type="button"
                            className={!isAbsent ? "active present" : ""}
                            disabled={alreadySubmitted}
                            onClick={() => setAttendance(s._id, "حاضر")}
                          >
                            <i className="ti ti-check" /> حاضر
                          </button>
                          <button
                            type="button"
                            className={isAbsent ? "active absent" : ""}
                            disabled={alreadySubmitted}
                            onClick={() => setAttendance(s._id, "غائب")}
                          >
                            <i className="ti ti-x" /> غائب
                          </button>
                        </div>
                      </div>
                      <div className="eval-scores">
                        {(["hifz", "tajweed", "talawah"] as ScoreCategory[]).map((cat) => (
                          <div key={cat} className="eval-cat">
                            <span className="eval-cat-label">{CATEGORY_LABELS[cat]}</span>
                            <div className="eval-chip-group">
                              {Array.from({ length: MAX_SCORES[cat] + 1 }, (_, n) => n).map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  className={`eval-chip ${!isAbsent && e[cat] === n ? "active" : ""}`}
                                  disabled={isAbsent || alreadySubmitted}
                                  onClick={() => setScore(s._id, cat, n)}
                                >
                                  {toAr(n)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <span className={`eval-total ${total === 0 ? "zero" : ""}`}>
                          {toAr(total)}/{toAr(TOTAL_MAX)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {students.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                    لا يوجد طلاب
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      )}
      {bulkEvaluate.isSuccess && (
        <Alert tone="success">
          تم حفظ الحضور والتقييم بنجاح
          {bulkEvaluate.data.notified > 0 &&
            ` وإرسال إشعارات لأولياء أمور ${toAr(bulkEvaluate.data.notified)} طالب`}
          .
        </Alert>
      )}
      {bulkEvaluate.isSuccess && bulkEvaluate.data.unnotified.length > 0 && (
        <Alert tone="warning">
          تعذر إرسال إشعار عن: {bulkEvaluate.data.unnotified.map((s) => s.name).join("، ")} — لا
          يوجد ولي أمر مرتبط بالحساب.
        </Alert>
      )}
      {bulkEvaluate.isError && (
        <Alert tone="warning">{(bulkEvaluate.error as Error).message}</Alert>
      )}

      {history.length > 0 && (
        <Card icon="ti-history" title="سجل الجلسات">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الطالب</th>
                  <th>الحالة</th>
                  <th>حضور</th>
                  <th>حفظ</th>
                  <th>تجويد</th>
                  <th>تلاوة</th>
                  <th>المجموع</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r._id}>
                    <td>{toAr(new Date(r.date).toLocaleDateString("ar-SA"))}</td>
                    <td>{typeof r.student === "string" ? r.student : r.student.name}</td>
                    <td>
                      <Badge tone={r.attendanceStatus === "حاضر" ? "green" : "red"}>
                        {r.attendanceStatus}
                      </Badge>
                    </td>
                    <td>
                      {toAr(r.scores.attendance)}/{toAr(MAX_SCORES.attendance)}
                    </td>
                    <td>
                      {toAr(r.scores.hifz)}/{toAr(MAX_SCORES.hifz)}
                    </td>
                    <td>
                      {toAr(r.scores.tajweed)}/{toAr(MAX_SCORES.tajweed)}
                    </td>
                    <td>
                      {toAr(r.scores.talawah)}/{toAr(MAX_SCORES.talawah)}
                    </td>
                    <td>
                      <strong>
                        {toAr(r.total)}/{toAr(TOTAL_MAX)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
