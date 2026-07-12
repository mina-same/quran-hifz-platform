import { useState } from "react";
import { Badge } from "./Badge";
import { Alert } from "./Alert";
import { SkeletonCard } from "./Skeleton";
import { SurahPointFields } from "./SurahRangePicker";
import {
  useStudentPlanProgress, useInitStudentPlanProgress,
  useUpdateStudentScheduleEntry, useReflowStudentPlan,
  type StudentOccurrence,
} from "../../api/student-plan-progress";
import type { RangePoint, QuranPlan } from "../../api/quran-plans";
import { fractionalPage } from "../../lib/quranRange";
import { SURAHS } from "../../data/surahs";
import { toAr } from "../../../lib/format";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}
function toDateOnly(s: string): string {
  return String(s).slice(0, 10);
}
function fmtDayLabel(iso: string): string {
  return toAr(new Date(iso + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" }));
}

/** Formats a schedule day's page position: a clean page boundary shows as a
 * plain integer, a partial (mid-page) position shows one decimal, e.g. `٢.٧`
 * for a day that only covers 70% of page 2. */
function pageLabel(point: { surahNumber: number; ayah: number }, edge: "start" | "end"): string {
  const { value, isPartial } = fractionalPage(point, edge);
  return isPartial ? toAr(value.toFixed(1)) : toAr(value);
}

const compactInputStyle = { fontSize: 12, padding: "6px 8px" };

/** Compact surah+ayah picker for the schedule table's inline row edit — no
 * built-in label (the table column header already says "من"/"إلى"), just the
 * two selects side by side, sized to sit comfortably inside a table cell. */
function CompactSurahAyah({ value, onChange }: { value: RangePoint; onChange: (v: RangePoint) => void }) {
  const surah = SURAHS.find((s) => s.number === value.surahNumber) ?? SURAHS[0];
  function setSurah(surahNumber: number) {
    const s = SURAHS.find((x) => x.number === surahNumber) ?? SURAHS[0];
    onChange({ surahNumber, ayah: Math.min(value.ayah, s.ayahCount) });
  }
  function setAyah(ayah: number) {
    onChange({ ...value, ayah: Math.max(1, Math.min(ayah || 1, surah.ayahCount)) });
  }
  return (
    <div style={{ display: "flex", gap: 5 }}>
      <select className="form-input" style={{ ...compactInputStyle, flex: "1 1 auto", minWidth: 90 }} value={value.surahNumber} onChange={(e) => setSurah(Number(e.target.value))}>
        {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
      </select>
      <select className="form-input" style={{ ...compactInputStyle, width: 62, flexShrink: 0 }} value={value.ayah} onChange={(e) => setAyah(Number(e.target.value))}>
        {Array.from({ length: surah.ayahCount }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}

const OCCURRENCE_STATUS_CFG: Record<StudentOccurrence["status"], { label: string; tone: "green" | "gold" | "gray" | "red" }> = {
  pending: { label: "قادم", tone: "gray" },
  done: { label: "منجَز", tone: "green" },
  partial: { label: "جزئي", tone: "gold" },
  absent: { label: "غياب", tone: "red" },
};

/** Whether a plan actually covers a given student — true for halqa/specialTrack
 * -targeted plans (which by definition cover their whole roster), but for
 * `targetType: "students"` plans only true if the student is in that explicit
 * list. */
export function planCoversStudent(plan: QuranPlan, studentId: string): boolean {
  if (plan.targetType !== "students") return true;
  return (plan.students ?? []).some((s) => (typeof s === "object" ? s._id : s) === studentId);
}

/** Inline panel (no separate page): a student's own individual plan — meant to
 * be shown right inside their expanded row in an attendance/roster list. Lets
 * the teacher create one with a custom (possibly reverse-direction) range, or
 * view/edit/reflow an existing one. */
export function IndividualPlanPanel({
  planId, studentId, studentName, basePlan,
}: {
  planId: string;
  studentId: string;
  studentName: string;
  basePlan: QuranPlan;
}) {
  const { data: progress, isLoading } = useStudentPlanProgress(planId, studentId);
  const initProgress = useInitStudentPlanProgress();
  const updateEntry = useUpdateStudentScheduleEntry();
  const reflow = useReflowStudentPlan();

  const [customStart, setCustomStart] = useState<RangePoint>(basePlan.rangeStart);
  const [customEnd, setCustomEnd] = useState<RangePoint>(basePlan.rangeEnd);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [rangeStart, setRangeStart] = useState<RangePoint>({ surahNumber: 1, ayah: 1 });
  const [rangeEnd, setRangeEnd] = useState<RangePoint>({ surahNumber: 1, ayah: 1 });
  const [pageStart, setPageStart] = useState(1);
  const [pageEnd, setPageEnd] = useState(1);
  const [juz, setJuz] = useState(1);
  const [error, setError] = useState("");

  if (isLoading || !progress) return <SkeletonCard lines={3} />;

  function startEdit(entry: StudentOccurrence) {
    setEditingIndex(entry.occurrenceIndex);
    setRangeStart({ surahNumber: entry.surahStart, ayah: entry.ayahStart });
    setRangeEnd({ surahNumber: entry.surahEnd, ayah: entry.ayahEnd });
    setPageStart(entry.pageStart);
    setPageEnd(entry.pageEnd);
    setJuz(entry.juz);
    setError("");
  }

  async function saveEdit() {
    if (editingIndex == null) return;
    const startsBeforeEnd =
      rangeStart.surahNumber < rangeEnd.surahNumber ||
      (rangeStart.surahNumber === rangeEnd.surahNumber && rangeStart.ayah <= rangeEnd.ayah);
    if (!startsBeforeEnd) { setError("نقطة البداية يجب أن تسبق نقطة النهاية"); return; }
    if (pageStart > pageEnd) { setError("صفحة البداية يجب أن تسبق صفحة النهاية"); return; }
    setError("");
    try {
      await updateEntry.mutateAsync({
        planId, studentId, occurrenceIndex: editingIndex,
        surahStart: rangeStart.surahNumber, ayahStart: rangeStart.ayah,
        surahEnd: rangeEnd.surahNumber, ayahEnd: rangeEnd.ayah,
        pageStart, pageEnd, juz,
      });
      setEditingIndex(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!progress.progressIsPersisted) {
    return (
      <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 8 }}>
          <i className="ti ti-target" style={{ marginLeft: 4, color: "var(--green)" }} />
          إنشاء خطة فردية لـ{studentName}
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text3)" }}>
          اختر النطاق الذي سيحفظه {studentName} — سيُقسَّم على نفس أيام الخطة العامة. يمكن أن تكون نقطة "من" بعد نقطة "إلى" في المصحف (خطة بالعكس).
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          <SurahPointFields label="من" value={customStart} onChange={setCustomStart} />
          <SurahPointFields label="إلى" value={customEnd} onChange={setCustomEnd} />
        </div>
        <button
          className="topbar-btn btn-primary"
          style={{ fontSize: 12 }}
          onClick={() => initProgress.mutate({ planId, studentId, rangeStart: customStart, rangeEnd: customEnd })}
          disabled={initProgress.isPending}
        >
          {initProgress.isPending
            ? <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> جارٍ الإنشاء...</>
            : <><i className="ti ti-check" /> إنشاء الخطة الفردية</>
          }
        </button>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <Badge tone="green">توزيع فردي محفوظ</Badge>
        <button
          className="topbar-btn btn-ghost"
          style={{ fontSize: 11 }}
          onClick={() => reflow.mutate({ planId, studentId })}
          disabled={reflow.isPending}
        >
          {reflow.isPending
            ? <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> جارٍ إعادة الحساب...</>
            : <><i className="ti ti-refresh" /> إعادة حساب التوزيع</>
          }
        </button>
      </div>

      {progress.overflowPages > 0 && (
        <Alert tone="warning" icon="ti-alert-triangle" style={{ marginBottom: 10 }}>
          يوجد {toAr(progress.overflowPages)} صفحة متبقية بلا مكان في الأيام المتاحة — أضف يومًا جديدًا للخطة العامة لاستيعابها.
        </Alert>
      )}

      <div className="tbl-wrap" style={{ maxHeight: "40vh" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>التاريخ</th><th>الأصلي</th><th>الحالي</th><th>الصفحات</th><th>الحالة</th><th></th>
            </tr>
          </thead>
          <tbody>
            {progress.effectiveSchedule.map((s) => {
              const isEditingRow = editingIndex === s.occurrenceIndex;
              const changed =
                s.baseSurahStart !== s.surahStart || s.baseAyahStart !== s.ayahStart ||
                s.baseSurahEnd !== s.surahEnd || s.baseAyahEnd !== s.ayahEnd;
              const cfg = OCCURRENCE_STATUS_CFG[s.status];

              if (!isEditingRow) {
                return (
                  <tr key={s.occurrenceIndex}>
                    <td>{toAr(s.occurrenceIndex)}</td>
                    <td>{fmtDayLabel(toDateOnly(s.date))}</td>
                    <td style={{ color: changed ? "var(--text3)" : "inherit", textDecoration: changed ? "line-through" : "none" }}>
                      {changed ? `${surahName(s.baseSurahStart)}:${toAr(s.baseAyahStart)} — ${surahName(s.baseSurahEnd)}:${toAr(s.baseAyahEnd)}` : "—"}
                    </td>
                    <td>{surahName(s.surahStart)}:{toAr(s.ayahStart)} — {surahName(s.surahEnd)}:{toAr(s.ayahEnd)}</td>
                    <td>{pageLabel({ surahNumber: s.surahStart, ayah: s.ayahStart }, "start")} - {pageLabel({ surahNumber: s.surahEnd, ayah: s.ayahEnd }, "end")}</td>
                    <td><Badge tone={cfg.tone}>{cfg.label}{s.manualOverride ? " · معدَّلة يدويًا" : ""}</Badge></td>
                    <td>
                      <button className="topbar-btn btn-ghost" style={{ padding: "4px 9px", fontSize: 11 }} onClick={() => startEdit(s)}>
                        <i className="ti ti-pencil" />
                      </button>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={s.occurrenceIndex} style={{ background: "var(--green-pale)" }}>
                  <td>{toAr(s.occurrenceIndex)}</td>
                  <td>{fmtDayLabel(toDateOnly(s.date))}</td>
                  <td colSpan={2} style={{ minWidth: 260 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <CompactSurahAyah value={rangeStart} onChange={setRangeStart} />
                      <CompactSurahAyah value={rangeEnd} onChange={setRangeEnd} />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" min={1} max={604} className="form-input" style={{ ...compactInputStyle, width: 56 }}
                        value={pageStart} onChange={(e) => setPageStart(Math.max(1, Math.min(604, Number(e.target.value) || 1)))} />
                      <span style={{ color: "var(--text3)" }}>-</span>
                      <input type="number" min={1} max={604} className="form-input" style={{ ...compactInputStyle, width: 56 }}
                        value={pageEnd} onChange={(e) => setPageEnd(Math.max(1, Math.min(604, Number(e.target.value) || 1)))} />
                    </div>
                  </td>
                  <td>
                    <input type="number" min={1} max={30} className="form-input" style={{ ...compactInputStyle, width: 52 }}
                      value={juz} onChange={(e) => setJuz(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="topbar-btn btn-primary" style={{ padding: "6px 10px", fontSize: 11 }} onClick={saveEdit} disabled={updateEntry.isPending} title="حفظ">
                        {updateEntry.isPending ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-check" />}
                      </button>
                      <button className="topbar-btn btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => setEditingIndex(null)} title="إلغاء">
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444", fontSize: 13, marginTop: 10, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>
          <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} /> {error}
        </div>
      )}
    </div>
  );
}
