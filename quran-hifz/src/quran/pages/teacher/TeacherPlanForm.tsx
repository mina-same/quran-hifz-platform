import { useState } from "react";
import { toast } from "sonner";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import {
  useCreateQuranPlan, useUpdateQuranPlan,
  PLAN_FORM_HANDOFF_KEY,
  type PlanFormHandoff, type PlanType, type RangePoint, type QuranPlan,
} from "../../api/quran-plans";
import { useHalqat } from "../../api/halqat";
import { useStudents } from "../../api/students";
import { useSpecialTracks } from "../../api/special-tracks";
import { useStudentPlanProgressList } from "../../api/student-plan-progress";
import { toAr } from "../../../lib/format";
import { Card } from "../../components/common/Card";
import { DaysOfWeekPicker } from "../../components/common/DaysOfWeekPicker";
import { SurahPointFields } from "../../components/common/SurahRangePicker";
import { IndividualPlanPanel } from "../../components/common/IndividualPlanPanel";
import { countRangeAyahs, pageRangeOfAyahRange } from "../../lib/quranRange";

const PLAN_TYPES: { value: PlanType; label: string; icon: string; fg: string; bg: string }[] = [
  { value: "حفظ",    label: "حفظ",    icon: "ti-book-2",    fg: "var(--green)", bg: "var(--green-pale)" },
  { value: "مراجعة", label: "مراجعة", icon: "ti-refresh",   fg: "#1d4ed8",      bg: "#eff6ff" },
  { value: "ترتيل",  label: "ترتيل",  icon: "ti-music",     fg: "#7c3aed",      bg: "#f3e8ff" },
  { value: "تلاوة",  label: "تلاوة",  icon: "ti-microphone",fg: "#c2410c",      bg: "#fff1e6" },
];

// Plans are halqa-based only. "طلاب محددون" and "مسار" targets are intentionally
// not offered here — per-student differentiation happens via individual plans,
// managed per student after the halqa plan is saved.
const TARGET_TYPES: { value: "halqa" | "students" | "specialTrack"; label: string; icon: string }[] = [
  { value: "halqa",        label: "حلقة كاملة",    icon: "ti-school" },
];

type FormFields = {
  name: string;
  type: PlanType;
  description: string;
  targetType: "halqa" | "students" | "specialTrack";
  halqa: string;
  students: string[];
  specialTrack: string;
  days: string[];
  rangeStart: RangePoint;
  rangeEnd: RangePoint;
  endType: "activeDays" | "date";
  activeDaysCount: string;
  endDate: string;
};

const EMPTY: FormFields = {
  name: "", type: "حفظ", description: "",
  targetType: "halqa", halqa: "", students: [], specialTrack: "",
  days: [],
  rangeStart: { surahNumber: 1, ayah: 1 },
  rangeEnd:   { surahNumber: 1, ayah: 1 },
  endType: "activeDays",
  activeDaysCount: "10",
  endDate: "",
};

function getId(v: { _id: string } | string) {
  return typeof v === "object" ? v._id : v;
}

function fieldsFromPlan(plan: QuranPlan, nameSuffix = ""): FormFields {
  return {
    name: `${plan.name}${nameSuffix}`, type: plan.type, description: plan.description ?? "",
    targetType: plan.targetType,
    halqa: plan.halqa ? getId(plan.halqa) : "",
    students: (plan.students ?? []).map(getId),
    specialTrack: plan.specialTrack ? getId(plan.specialTrack) : "",
    days: plan.days,
    rangeStart: plan.rangeStart,
    rangeEnd: plan.rangeEnd,
    endType: plan.endType,
    activeDaysCount: plan.activeDaysCount ? String(plan.activeDaysCount) : "",
    endDate: plan.endDate ? plan.endDate.split("T")[0] : "",
  };
}

export function TeacherPlanForm() {
  const { user, showPage } = usePortal();
  const teacherId = user?.profileId;

  const [handoff] = useState<PlanFormHandoff | null>(() => {
    const raw = sessionStorage.getItem(PLAN_FORM_HANDOFF_KEY);
    sessionStorage.removeItem(PLAN_FORM_HANDOFF_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PlanFormHandoff;
    } catch {
      return null;
    }
  });

  const { data: halqat = [] }        = useHalqat({ teacher: teacherId });
  const { data: allStudents = [] }   = useStudents();
  const { data: specialTracks = [] } = useSpecialTracks(undefined, teacherId);

  const createPlan = useCreateQuranPlan();
  const updatePlan = useUpdateQuranPlan();

  const [planRecord, setPlanRecord] = useState<QuranPlan | null>(handoff?.mode === "edit" ? handoff.plan : null);
  const [planPanelStudentId, setPlanPanelStudentId] = useState<string | null>(null);

  const [form, setForm] = useState<FormFields>(() => {
    if (handoff?.mode === "edit") return fieldsFromPlan(handoff.plan);
    if (handoff?.mode === "duplicate") return fieldsFromPlan(handoff.plan, " (نسخة)");
    if (handoff?.mode === "create" && handoff.halqaId) {
      return { ...EMPTY, targetType: "halqa", halqa: handoff.halqaId };
    }
    return EMPTY;
  });
  const [formError, setFormError] = useState("");

  function sf<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const title = handoff?.mode === "edit" ? "تعديل الخطة" : handoff?.mode === "duplicate" ? "نسخ الخطة" : "خطة قرآنية جديدة";
  const typeCfg = PLAN_TYPES.find((t) => t.value === form.type) ?? PLAN_TYPES[0];

  const { data: halqaStudents = [] } = useStudents({ halqa: form.halqa }, { enabled: form.targetType === "halqa" && !!form.halqa });
  const { data: trackStudents = [] } = useStudents({ specialTrack: form.specialTrack }, { enabled: form.targetType === "specialTrack" && !!form.specialTrack });

  const rosterStudents =
    form.targetType === "halqa" ? halqaStudents :
    form.targetType === "specialTrack" ? trackStudents :
    allStudents.filter((s) => form.students.includes(s._id));

  const progressByStudentId = useStudentPlanProgressList(planRecord?._id, rosterStudents.map((s) => s._id));

  async function handleSubmit() {
    if (!form.name.trim())      { setFormError("اسم الخطة مطلوب"); return; }
    if (form.days.length === 0) { setFormError("يرجى اختيار يوم واحد على الأقل"); return; }
    if (form.targetType === "halqa" && !form.halqa) { setFormError("يرجى اختيار حلقة"); return; }
    if (form.targetType === "students" && form.students.length === 0) { setFormError("يرجى اختيار طالب واحد على الأقل"); return; }
    if (form.targetType === "specialTrack" && !form.specialTrack) { setFormError("يرجى اختيار المسار"); return; }
    if (form.endType === "activeDays" && !form.activeDaysCount) { setFormError("يرجى تحديد عدد الأيام النشطة"); return; }
    if (form.endType === "date" && !form.endDate) { setFormError("يرجى تحديد تاريخ الانتهاء"); return; }

    // rangeStart may deliberately sit after rangeEnd in mushaf order — a
    // reverse-direction plan (e.g. starting at An-Nas and working backward
    // toward Al-Fatiha) — so no ordering check here.
    setFormError("");
    const body: Record<string, unknown> = {
      name: form.name.trim(), type: form.type, description: form.description.trim() || undefined,
      teacher: teacherId,
      targetType: form.targetType,
      halqa: form.targetType === "halqa" ? form.halqa : undefined,
      students: form.targetType === "students" ? form.students : undefined,
      specialTrack: form.targetType === "specialTrack" ? form.specialTrack : undefined,
      days: form.days,
      rangeStart: form.rangeStart, rangeEnd: form.rangeEnd,
      endType: form.endType,
      activeDaysCount: form.endType === "activeDays" ? Number(form.activeDaysCount) : undefined,
      endDate: form.endType === "date" ? form.endDate : undefined,
    };

    try {
      const result = planRecord
        ? await updatePlan.mutateAsync({ id: planRecord._id, ...body })
        : await createPlan.mutateAsync(body);
      setPlanRecord(result.data);
      toast.success("تم حفظ الخطة");
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  useTopbar("ti-target", title,
    <button className="topbar-btn btn-ghost" onClick={() => showPage("plans")}>
      <i className="ti ti-arrow-right" /> الخطط
    </button>,
  );

  const isPending = createPlan.isPending || updatePlan.isPending;
  const rangeIsReversed =
    form.rangeStart.surahNumber > form.rangeEnd.surahNumber ||
    (form.rangeStart.surahNumber === form.rangeEnd.surahNumber && form.rangeStart.ayah > form.rangeEnd.ayah);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Header card — mirrors TeacherPlanDetail's header ── */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 240 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: typeCfg.bg, color: typeCfg.fg,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>
              <i className={`ti ${typeCfg.icon}`} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <input
                className="form-input"
                style={{ display: "block", width: "100%", fontSize: 19, fontWeight: 800, color: "var(--text)", border: "none", padding: "2px 0", background: "transparent" }}
                placeholder="اسم الخطة *"
                value={form.name}
                onChange={(e) => sf("name", e.target.value)}
              />
              <textarea
                className="form-input"
                style={{ display: "block", width: "100%", fontSize: 13, color: "var(--text2)", border: "none", padding: "2px 0", background: "transparent", resize: "none", minHeight: "auto" }}
                placeholder="الوصف (اختياري)"
                rows={1}
                value={form.description}
                onChange={(e) => sf("description", e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="topbar-btn btn-ghost" onClick={() => showPage("plans")}>إلغاء</button>
            <button className="topbar-btn btn-primary" onClick={handleSubmit} disabled={isPending}>
              {isPending
                ? <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> جارٍ الحفظ...</>
                : <><i className="ti ti-check" /> حفظ الخطة</>
              }
            </button>
          </div>
        </div>

        {formError && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            color: "#ef4444", fontSize: 13, marginTop: 16,
            padding: "10px 14px", background: "#fef2f2", borderRadius: 10,
            border: "1px solid rgba(239,68,68,0.2)",
          }}>
            <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} /> {formError}
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, marginBottom: 10 }}>نوع الخطة</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PLAN_TYPES.map((t) => {
              const active = form.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => sf("type", t.value)}
                  style={{
                    flex: "1 1 120px", padding: "12px 0", borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${active ? t.fg : "var(--border)"}`,
                    background: active ? t.bg : "var(--cream)",
                    color: active ? t.fg : "var(--text2)",
                    fontWeight: active ? 700 : 400,
                    fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
                    transition: "all .15s",
                  }}
                >
                  <i className={`ti ${t.icon}`} style={{ fontSize: 18 }} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Target card ── */}
      <Card icon="ti-users" title="الهدف">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {TARGET_TYPES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => sf("targetType", opt.value)}
              style={{
                flex: "1 1 140px", padding: "11px 0", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${form.targetType === opt.value ? "var(--green)" : "var(--border)"}`,
                background: form.targetType === opt.value ? "var(--green-pale)" : "var(--cream)",
                color: form.targetType === opt.value ? "var(--green)" : "var(--text2)",
                fontWeight: form.targetType === opt.value ? 700 : 400,
                fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              <i className={`ti ${opt.icon}`} /> {opt.label}
            </button>
          ))}
        </div>

        {form.targetType === "halqa" && (
          <div className="form-group">
            <label className="form-label">الحلقة <span>*</span></label>
            <select className="form-input" value={form.halqa} onChange={(e) => sf("halqa", e.target.value)}>
              <option value="">— اختر حلقة —</option>
              {halqat.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </div>
        )}
        {form.targetType === "students" && (
          <StudentPicker
            students={allStudents}
            selected={form.students}
            onChange={(students) => sf("students", students)}
          />
        )}
        {form.targetType === "specialTrack" && (
          <div className="form-group">
            <label className="form-label">المسار <span>*</span></label>
            <select className="form-input" value={form.specialTrack} onChange={(e) => sf("specialTrack", e.target.value)}>
              <option value="">— اختر مساراً —</option>
              {specialTracks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
            </select>
            {specialTracks.length === 0 && (
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text3)" }}>لا يوجد مسارات مرتبطة بك بعد</p>
            )}
          </div>
        )}
      </Card>

      {/* ── Roster card — students covered by the chosen target ── */}
      {rosterStudents.length > 0 && (
        <Card icon="ti-list-details" title="طلاب الخطة">
          {!planRecord && (
            <div style={{
              marginBottom: 12, padding: "10px 14px", borderRadius: 10,
              background: "var(--cream)", fontSize: 12, color: "var(--text3)",
            }}>
              احفظ الخطة أولاً لتتمكن من إدارة خطط الطلاب الفردية
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rosterStudents.map((s) => (
              <div key={s._id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.name}</span>
                    {s.level != null && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                        background: "var(--green-pale)", color: "var(--green)",
                        borderRadius: 99, padding: "2px 8px",
                      }}>
                        المستوى {toAr(s.level)}
                      </span>
                    )}
                  </span>
                  {planRecord && (
                    <button
                      type="button"
                      className="topbar-btn btn-ghost"
                      style={{ fontSize: 11, padding: "5px 10px" }}
                      onClick={() => setPlanPanelStudentId((cur) => (cur === s._id ? null : s._id))}
                    >
                      {planPanelStudentId === s._id
                        ? <><i className="ti ti-chevron-up" /> إخفاء الخطة الفردية</>
                        : progressByStudentId[s._id]?.progressIsPersisted
                          ? <><i className="ti ti-list-details" /> عرض الخطة الفردية</>
                          : <><i className="ti ti-plus" /> أنشئ خطة فردية</>
                      }
                    </button>
                  )}
                </div>
                {planRecord && planPanelStudentId === s._id && (
                  <IndividualPlanPanel planId={planRecord._id} studentId={s._id} studentName={s.name} basePlan={planRecord} />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Days card ── */}
      <Card icon="ti-calendar-week" title="أيام الخطة">
        <DaysOfWeekPicker value={form.days} onChange={(days) => sf("days", days)} />
      </Card>

      {/* ── Range card ── */}
      <Card icon="ti-book" title="نطاق الحفظ (من - إلى)">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SurahPointFields label="من" value={form.rangeStart} onChange={(v) => sf("rangeStart", v)} />
          <SurahPointFields label="إلى" value={form.rangeEnd} onChange={(v) => sf("rangeEnd", v)} />
          {(() => {
            const { pageStart, pageEnd, pageCount } = pageRangeOfAyahRange(form.rangeStart, form.rangeEnd);
            return (
              <div style={{
                borderRadius: 10, padding: "10px 12px", background: "var(--cream)",
                fontSize: 13, color: "var(--text2)",
              }}>
                عدد الآيات: {countRangeAyahs(form.rangeStart, form.rangeEnd)} — عدد الصفحات: {pageCount}
                {" "}(صفحة {pageStart}{pageEnd !== pageStart ? ` إلى ${pageEnd}` : ""})
                {rangeIsReversed && (
                  <div style={{ marginTop: 6, color: "#92400e", fontWeight: 600 }}>
                    <i className="ti ti-arrow-back-up" style={{ marginLeft: 4 }} />
                    خطة بالعكس — الحفظ يبدأ من نقطة "من" ويتراجع تدريجيًا حتى يصل إلى نقطة "إلى"
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </Card>

      {/* ── End condition card ── */}
      <Card icon="ti-calendar-due" title="تاريخ الانتهاء">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {([
            { value: "activeDays" as const, label: "عدد الأيام النشطة" },
            { value: "date" as const,        label: "تاريخ محدد" },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => sf("endType", opt.value)}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${form.endType === opt.value ? "var(--green)" : "var(--border)"}`,
                background: form.endType === opt.value ? "var(--green-pale)" : "var(--cream)",
                color: form.endType === opt.value ? "var(--green)" : "var(--text2)",
                fontWeight: form.endType === opt.value ? 700 : 400,
                fontSize: 13,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {form.endType === "activeDays" ? (
          <div className="form-group">
            <label className="form-label">عدد الأيام النشطة <span>*</span></label>
            <input className="form-input" type="number" min={1} value={form.activeDaysCount} onChange={(e) => sf("activeDaysCount", e.target.value)} />
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">تاريخ الانتهاء <span>*</span></label>
            <input className="form-input" type="date" dir="ltr" value={form.endDate} onChange={(e) => sf("endDate", e.target.value)} />
          </div>
        )}
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          className="topbar-btn btn-primary"
          style={{ flex: 1, justifyContent: "center", padding: "11px 0" }}
          onClick={handleSubmit} disabled={isPending}
        >
          {isPending
            ? <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> جارٍ الحفظ...</>
            : <><i className="ti ti-check" /> حفظ الخطة</>
          }
        </button>
        <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => showPage("plans")}>إلغاء</button>
      </div>
    </div>
  );
}

function StudentPicker({
  students, selected, onChange,
}: {
  students: { _id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {selected.map((id) => {
            const s = students.find((x) => x._id === id);
            return (
              <div key={id} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--green-pale)", color: "var(--green)",
                borderRadius: 99, padding: "5px 10px", fontSize: 12, fontWeight: 700,
              }}>
                {s?.name ?? "—"}
                <button type="button" onClick={() => toggle(id)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1 }}>
                  <i className="ti ti-x" style={{ fontSize: 11 }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ border: "1px solid var(--border)", borderRadius: 10, maxHeight: 160, overflowY: "auto" }}>
        {students.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>لا يوجد طلاب مسجّلون</div>
        )}
        {students.map((s, i) => {
          const isSel = selected.includes(s._id);
          return (
            <label
              key={s._id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", cursor: "pointer",
                borderBottom: i < students.length - 1 ? "1px solid var(--border)" : "none",
                background: isSel ? "var(--green-pale)" : "transparent",
              }}
            >
              <input type="checkbox" checked={isSel} onChange={() => toggle(s._id)} style={{ accentColor: "var(--green)", width: 15, height: 15 }} />
              <span style={{ fontSize: 13, fontWeight: isSel ? 700 : 400, color: isSel ? "var(--green)" : "var(--text)" }}>{s.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
