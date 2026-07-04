import { useState, useEffect, type CSSProperties } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import {
  useQuranPlans, useCreateQuranPlan, useUpdateQuranPlan, useDeleteQuranPlan,
  PLAN_PREFILL_TRACK_KEY,
  type QuranPlan, type PlanType, type PointRule, type RangePoint,
  type PlanHalqa, type PlanSpecialTrack,
} from "../../api/quran-plans";
import { useHalqat } from "../../api/halqat";
import { useStudents } from "../../api/students";
import { useSpecialTracks } from "../../api/special-tracks";
import { SURAHS } from "../../data/surahs";
import { Badge } from "../../components/common/Badge";
import { FormSection } from "../../components/common/FormSection";
import { SkeletonCardGrid } from "../../components/common/Skeleton";
import { DaysOfWeekPicker } from "../../components/common/DaysOfWeekPicker";
import { SurahPointFields } from "../../components/common/SurahRangePicker";
import { countRangeAyahs, pageRangeOfAyahRange } from "../../lib/quranRange";

/* ─── helpers ─────────────────────────────────────────────── */
function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}
function pointLabel(p: RangePoint) {
  return `${surahName(p.surahNumber)} : ${p.ayah}`;
}
function getId(v: { _id: string } | string) {
  return typeof v === "object" ? v._id : v;
}
function getName(v: { name: string } | string) {
  return typeof v === "object" ? v.name : v;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

const PLAN_TYPES: { value: PlanType; label: string; icon: string; fg: string; bg: string }[] = [
  { value: "حفظ",    label: "حفظ",    icon: "ti-book-2",    fg: "var(--green)", bg: "var(--green-pale)" },
  { value: "مراجعة", label: "مراجعة", icon: "ti-refresh",   fg: "#1d4ed8",      bg: "#eff6ff" },
  { value: "ترتيل",  label: "ترتيل",  icon: "ti-music",     fg: "#7c3aed",      bg: "#f3e8ff" },
  { value: "تلاوة",  label: "تلاوة",  icon: "ti-microphone",fg: "#c2410c",      bg: "#fff1e6" },
];

const TARGET_TYPES: { value: "halqa" | "students" | "specialTrack"; label: string; icon: string }[] = [
  { value: "halqa",        label: "حلقة كاملة",    icon: "ti-school" },
  { value: "students",     label: "طلاب محددون",   icon: "ti-user" },
  { value: "specialTrack", label: "مسار استثنائي", icon: "ti-calendar-event" },
];

/* ─── form types ──────────────────────────────────────────── */
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
  pointsEnabled: boolean;
  pointRules: PointRule[];
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
  pointsEnabled: false,
  pointRules: [],
  endType: "activeDays",
  activeDaysCount: "10",
  endDate: "",
};

type Modal = null | { mode: "form"; item?: QuranPlan } | { mode: "schedule"; item: QuranPlan };

/* ─── overlay / dialog styles (matches AdminSpecialTracks) ──── */
const OVERLAY: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const DIALOG: CSSProperties = {
  background: "var(--surface)", borderRadius: 16, width: "100%",
  maxHeight: "92vh", overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

/* ════════════════════════════════════════════════════════════ */
export function TeacherPlans() {
  const { user, showPage } = usePortal();
  const teacherId = user?.profileId;

  const { data: plans = [], isLoading } = useQuranPlans({ teacher: teacherId });
  const { data: halqat = [] }           = useHalqat({ teacher: teacherId });
  const { data: allStudents = [] }      = useStudents();
  const { data: specialTracks = [] }    = useSpecialTracks(undefined, teacherId);

  const createPlan = useCreateQuranPlan();
  const updatePlan = useUpdateQuranPlan();
  const deletePlan = useDeleteQuranPlan();

  const [modal, setModal]       = useState<Modal>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm]         = useState<FormFields>(EMPTY);
  const [formError, setFormError] = useState("");

  function sf<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function openAdd() {
    setForm(EMPTY); setFormError(""); setModal({ mode: "form" });
  }

  // Deep link from the Special Tracks page's "ربط خطة" button: open the create
  // modal pre-filled to the track the teacher clicked from.
  useEffect(() => {
    const trackId = sessionStorage.getItem(PLAN_PREFILL_TRACK_KEY);
    if (!trackId) return;
    sessionStorage.removeItem(PLAN_PREFILL_TRACK_KEY);
    setForm({ ...EMPTY, targetType: "specialTrack", specialTrack: trackId });
    setFormError("");
    setModal({ mode: "form" });
  }, []);
  function openEdit(item: QuranPlan) {
    setForm({
      name: item.name, type: item.type, description: item.description ?? "",
      targetType: item.targetType,
      halqa: item.halqa ? getId(item.halqa) : "",
      students: (item.students ?? []).map(getId),
      specialTrack: item.specialTrack ? getId(item.specialTrack) : "",
      days: item.days,
      rangeStart: item.rangeStart,
      rangeEnd:   item.rangeEnd,
      pointsEnabled: item.pointsEnabled,
      pointRules: item.pointRules,
      endType: item.endType,
      activeDaysCount: item.activeDaysCount ? String(item.activeDaysCount) : "",
      endDate: item.endDate ? item.endDate.split("T")[0] : "",
    });
    setFormError(""); setModal({ mode: "form", item });
  }

  // "نسخ الخطة": pre-fill the create form with the source plan's data
  // (no `item` in the modal state, so Submit creates a brand-new plan).
  function openDuplicate(item: QuranPlan) {
    setForm({
      name: `${item.name} (نسخة)`, type: item.type, description: item.description ?? "",
      targetType: item.targetType,
      halqa: item.halqa ? getId(item.halqa) : "",
      students: (item.students ?? []).map(getId),
      specialTrack: item.specialTrack ? getId(item.specialTrack) : "",
      days: item.days,
      rangeStart: item.rangeStart,
      rangeEnd:   item.rangeEnd,
      pointsEnabled: item.pointsEnabled,
      pointRules: item.pointRules,
      endType: item.endType,
      activeDaysCount: item.activeDaysCount ? String(item.activeDaysCount) : "",
      endDate: item.endDate ? item.endDate.split("T")[0] : "",
    });
    setFormError(""); setModal({ mode: "form" });
  }

  async function handleSubmit() {
    if (!form.name.trim())      { setFormError("اسم الخطة مطلوب"); return; }
    if (form.days.length === 0) { setFormError("يرجى اختيار يوم واحد على الأقل"); return; }
    if (form.targetType === "halqa" && !form.halqa) { setFormError("يرجى اختيار حلقة"); return; }
    if (form.targetType === "students" && form.students.length === 0) { setFormError("يرجى اختيار طالب واحد على الأقل"); return; }
    if (form.targetType === "specialTrack" && !form.specialTrack) { setFormError("يرجى اختيار المسار الاستثنائي"); return; }
    if (form.endType === "activeDays" && !form.activeDaysCount) { setFormError("يرجى تحديد عدد الأيام النشطة"); return; }
    if (form.endType === "date" && !form.endDate) { setFormError("يرجى تحديد تاريخ الانتهاء"); return; }

    const startsBeforeEnd =
      form.rangeStart.surahNumber < form.rangeEnd.surahNumber ||
      (form.rangeStart.surahNumber === form.rangeEnd.surahNumber && form.rangeStart.ayah <= form.rangeEnd.ayah);
    if (!startsBeforeEnd) { setFormError("نقطة البداية يجب أن تسبق نقطة النهاية"); return; }
    if (form.pointsEnabled && form.pointRules.some((r) => !r.label.trim())) {
      setFormError("يرجى كتابة وصف لكل قاعدة نقاط، أو حذف القواعد الفارغة"); return;
    }

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
      pointsEnabled: form.pointsEnabled,
      pointRules: form.pointsEnabled ? form.pointRules.map((r) => ({ ...r, label: r.label.trim() })) : [],
      endType: form.endType,
      activeDaysCount: form.endType === "activeDays" ? Number(form.activeDaysCount) : undefined,
      endDate: form.endType === "date" ? form.endDate : undefined,
    };

    try {
      if (modal?.item) {
        await updatePlan.mutateAsync({ id: modal.item._id, ...body });
      } else {
        await createPlan.mutateAsync(body);
      }
      setModal(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  useTopbar("ti-target", "الخطط القرآنية",
    <button className="topbar-btn btn-primary" onClick={openAdd}>
      <i className="ti ti-plus" /> خطة جديدة
    </button>,
  );

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <>
      {isLoading && <SkeletonCardGrid count={3} lines={5} />}

      {!isLoading && plans.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 0" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: "var(--green-pale)", color: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 16px",
          }}>
            <i className="ti ti-target" />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>لا توجد خطط قرآنية بعد</p>
          <p style={{ margin: "6px 0 20px", fontSize: 13, color: "var(--text3)" }}>أنشئ أول خطة حفظ أو مراجعة لحلقتك أو لطلابك</p>
          <button className="topbar-btn btn-primary" style={{ padding: "10px 24px" }} onClick={openAdd}>
            <i className="ti ti-plus" /> خطة جديدة
          </button>
        </div>
      )}

      {!isLoading && plans.length > 0 && (
        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
          {plans.map((p) => (
            <PlanCard
              key={p._id}
              plan={p}
              onEdit={openEdit}
              onDelete={setDeleteId}
              onDuplicate={openDuplicate}
              onSchedule={(item) => setModal({ mode: "schedule", item })}
              onViewTrack={() => showPage("specialtracks")}
            />
          ))}
        </div>
      )}

      {/* ════════ FORM MODAL ════════ */}
      {modal?.mode === "form" && (
        <div style={OVERLAY} onClick={() => setModal(null)}>
          <div style={{ ...DIALOG, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "20px 24px 16px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "var(--green-pale)", color: "var(--green)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>
                  <i className="ti ti-target" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>
                    {modal.item ? "تعديل الخطة" : "خطة قرآنية جديدة"}
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text3)" }}>أدخل بيانات الخطة بالكامل</p>
                </div>
              </div>
              <button className="topbar-btn btn-ghost" style={{ padding: "6px 9px" }} onClick={() => setModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {formError && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  color: "#ef4444", fontSize: 13, marginBottom: 16,
                  padding: "10px 14px", background: "#fef2f2", borderRadius: 10,
                  border: "1px solid rgba(239,68,68,0.2)",
                }}>
                  <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} /> {formError}
                </div>
              )}

              {/* اسم الخطة + الوصف */}
              <FormSection label="بيانات الخطة" icon="ti-info-circle">
                <div className="form-grid-2">
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">اسم الخطة <span>*</span></label>
                    <input className="form-input" placeholder="مثال: خطة حفظ سورة البقرة" value={form.name} onChange={(e) => sf("name", e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">الوصف (اختياري)</label>
                    <textarea className="form-input" rows={2} value={form.description} onChange={(e) => sf("description", e.target.value)} />
                  </div>
                </div>
              </FormSection>

              {/* نوع الخطة */}
              <FormSection label="نوع الخطة" icon="ti-category">
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
              </FormSection>

              {/* الهدف */}
              <FormSection label="الهدف" icon="ti-users">
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
                    <label className="form-label">المسار الاستثنائي <span>*</span></label>
                    <select className="form-input" value={form.specialTrack} onChange={(e) => sf("specialTrack", e.target.value)}>
                      <option value="">— اختر مساراً —</option>
                      {specialTracks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
                    </select>
                    {specialTracks.length === 0 && (
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text3)" }}>لا يوجد مسارات استثنائية مرتبطة بك بعد</p>
                    )}
                  </div>
                )}
              </FormSection>

              {/* أيام الخطة */}
              <FormSection label="أيام الخطة" icon="ti-calendar-week">
                <DaysOfWeekPicker value={form.days} onChange={(days) => sf("days", days)} />
              </FormSection>

              {/* نطاق الحفظ */}
              <FormSection label="نطاق الحفظ (من - إلى)" icon="ti-book">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <SurahPointFields label="من" value={form.rangeStart} onChange={(v) => sf("rangeStart", v)} />
                  <SurahPointFields label="إلى" value={form.rangeEnd} onChange={(v) => sf("rangeEnd", v)} />
                  {(form.rangeStart.surahNumber < form.rangeEnd.surahNumber ||
                    (form.rangeStart.surahNumber === form.rangeEnd.surahNumber && form.rangeStart.ayah <= form.rangeEnd.ayah)) && (() => {
                    const { pageStart, pageEnd, pageCount } = pageRangeOfAyahRange(form.rangeStart, form.rangeEnd);
                    return (
                      <div style={{ fontSize: 13, color: "var(--muted-foreground, #666)" }}>
                        عدد الآيات: {countRangeAyahs(form.rangeStart, form.rangeEnd)} — عدد الصفحات: {pageCount}
                        {" "}(صفحة {pageStart}{pageEnd !== pageStart ? ` إلى ${pageEnd}` : ""})
                      </div>
                    );
                  })()}
                </div>
              </FormSection>

              {/* نظام النقاط */}
              <FormSection label="نظام النقاط" icon="ti-star">
                <BoolToggleRow label="تفعيل نظام النقاط" checked={form.pointsEnabled} onChange={(v) => sf("pointsEnabled", v)} />
                {form.pointsEnabled && (
                  <PointRulesEditor rules={form.pointRules} onChange={(rules) => sf("pointRules", rules)} />
                )}
              </FormSection>

              {/* تاريخ الانتهاء */}
              <FormSection label="تاريخ الانتهاء" icon="ti-calendar-due">
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
              </FormSection>

              {/* actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
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
                <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => setModal(null)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ DELETE CONFIRM ════════ */}
      {deleteId && (
        <div style={OVERLAY} onClick={() => setDeleteId(null)}>
          <div style={{ ...DIALOG, maxWidth: 360, padding: "28px 24px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "#fef2f2", color: "#ef4444",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, margin: "0 auto 14px",
              }}>
                <i className="ti ti-trash" />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>حذف الخطة</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>ستُحذف الخطة نهائياً ولا يمكن التراجع.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", borderColor: "#ef4444", padding: 11 }}
                onClick={async () => { await deletePlan.mutateAsync(deleteId); setDeleteId(null); }}
                disabled={deletePlan.isPending}
              >
                <i className="ti ti-trash" />
                {deletePlan.isPending ? "جارٍ الحذف..." : "حذف"}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => setDeleteId(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ SCHEDULE BREAKDOWN ════════ */}
      {modal?.mode === "schedule" && (
        <div style={OVERLAY} onClick={() => setModal(null)}>
          <div style={{ ...DIALOG, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "20px 24px 16px", borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>تقسيم الأجزاء على الأيام</h3>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text3)" }}>{modal.item.name}</p>
              </div>
              <button className="topbar-btn btn-ghost" style={{ padding: "6px 9px" }} onClick={() => setModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="tbl-wrap" style={{ padding: "0 24px 20px", maxHeight: "60vh" }}>
              {modal.item.schedule.length === 0 ? (
                <p style={{ margin: "20px 0", fontSize: 13, color: "var(--text3)", textAlign: "center" }}>
                  لا يوجد جدول محسوب لهذه الخطة
                </p>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>التاريخ</th>
                      <th>الجزء</th>
                      <th>من</th>
                      <th>إلى</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modal.item.schedule.map((s) => (
                      <tr key={s.occurrenceIndex}>
                        <td>{s.occurrenceIndex}</td>
                        <td>{fmtDate(s.date)}</td>
                        <td><Badge tone="green">جزء {s.juz}</Badge></td>
                        <td>{surahName(s.surahStart)} : {s.ayahStart}</td>
                        <td>{surahName(s.surahEnd)} : {s.ayahEnd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── plan card (module scope — never nest inside the page render body) ── */
function PlanCard({
  plan, onEdit, onDelete, onDuplicate, onSchedule, onViewTrack,
}: {
  plan: QuranPlan;
  onEdit: (p: QuranPlan) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: QuranPlan) => void;
  onSchedule: (p: QuranPlan) => void;
  onViewTrack: () => void;
}) {
  const typeCfg = PLAN_TYPES.find((t) => t.value === plan.type) ?? PLAN_TYPES[0];
  const targetLabel =
    plan.targetType === "halqa" ? getName(plan.halqa as PlanHalqa | string) :
    plan.targetType === "specialTrack" ? (plan.specialTrack ? (typeof plan.specialTrack === "object" ? plan.specialTrack.title : plan.specialTrack) : "—") :
    `${(plan.students ?? []).length} طالب`;
  const targetIcon =
    plan.targetType === "halqa" ? "ti-school" :
    plan.targetType === "specialTrack" ? "ti-calendar-event" : "ti-users";

  return (
    <div style={{
      background: "var(--surface)", borderRadius: 16,
      border: "1px solid var(--border)", overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ height: 4, background: `linear-gradient(90deg,${typeCfg.fg},${typeCfg.fg}99)` }} />
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: typeCfg.bg, color: typeCfg.fg,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>
              <i className={`ti ${typeCfg.icon}`} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plan.name}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                <Badge tone={plan.status === "نشطة" ? "green" : plan.status === "متوقفة" ? "gold" : "gray"}>{plan.status}</Badge>
                <span style={{
                  fontSize: 11, background: typeCfg.bg, color: typeCfg.fg,
                  borderRadius: 6, padding: "2px 9px", fontWeight: 600,
                }}>
                  {typeCfg.label}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              className="topbar-btn btn-ghost"
              style={{ padding: "5px 11px", fontSize: 12 }}
              onClick={() => onSchedule(plan)}
              title="تقسيم الأجزاء على الأيام"
            >
              <i className="ti ti-calendar-stats" />
            </button>
            <button className="topbar-btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => onEdit(plan)}>
              <i className="ti ti-pencil" />
            </button>
            <button
              className="topbar-btn btn-ghost"
              style={{ padding: "5px 11px", fontSize: 12 }}
              onClick={() => onDuplicate(plan)}
              title="نسخ الخطة"
            >
              <i className="ti ti-copy" />
            </button>
            <button
              className="topbar-btn btn-ghost"
              style={{ padding: "5px 11px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}
              onClick={() => onDelete(plan._id)}
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        </div>

        {plan.description && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text2)" }}>{plan.description}</p>}

        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12, color: "var(--text2)", margin: "12px 0" }}>
          <InfoRow
            icon={targetIcon}
            label="الهدف"
            val={targetLabel}
            onClick={plan.targetType === "specialTrack" ? onViewTrack : undefined}
          />
          <InfoRow icon="ti-calendar-week" label="الأيام" val={plan.days.join("، ")} span />
          <InfoRow icon="ti-book" label="من" val={pointLabel(plan.rangeStart)} />
          <InfoRow icon="ti-book-2" label="إلى" val={pointLabel(plan.rangeEnd)} />
          <InfoRow
            icon="ti-files"
            label="عدد الصفحات"
            val={plan.pageRange.pageCount === 1 ? `صفحة ${plan.pageRange.pageStart}` : `${plan.pageRange.pageCount} (${plan.pageRange.pageStart}-${plan.pageRange.pageEnd})`}
            span
          />
          {plan.endType === "date" && plan.endDate
            ? <InfoRow icon="ti-calendar-due" label="ينتهي في" val={fmtDate(plan.endDate)} span />
            : <InfoRow icon="ti-calendar-due" label="عدد الأيام النشطة" val={String(plan.activeDaysCount ?? "—")} span />
          }
        </div>

        {plan.pointsEnabled && plan.pointRules.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {plan.pointRules.map((r, i) => (
              <span key={i} style={{
                fontSize: 11, borderRadius: 99, padding: "3px 10px", fontWeight: 600,
                background: r.kind === "زيادة" ? "var(--green-pale)" : "#fef2f2",
                color:      r.kind === "زيادة" ? "var(--green)" : "#ef4444",
              }}>
                {r.label} {r.kind === "زيادة" ? "+" : "-"}{r.amount}
              </span>
            ))}
          </div>
        )}

        {plan.progress && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
                <i className="ti ti-progress" style={{ marginLeft: 4 }} />تقدّم الخطة
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)" }}>
                {plan.juzProgress ? `${plan.juzProgress.completed} / ${plan.juzProgress.total} جزء` : `${plan.progress.percent}%`}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${plan.progress.percent}%` }} />
            </div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>
              {plan.progress.completed} / {plan.progress.total} يوم ({plan.progress.percent}%)
            </div>
          </div>
        )}

        <div style={{
          borderRadius: 10, padding: "10px 12px",
          background: plan.todayAssignment ? "var(--green-pale)" : "var(--cream)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: plan.todayAssignment ? "var(--green)" : "var(--text3)", marginBottom: plan.todayAssignment ? 4 : 0 }}>
            <i className="ti ti-calendar-star" style={{ marginLeft: 4 }} />الجزء المطلوب اليوم
          </div>
          {plan.todayAssignment ? (
            <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
              {surahName(plan.todayAssignment.surahStart)} : {plan.todayAssignment.ayahStart}
              {" — "}
              {surahName(plan.todayAssignment.surahEnd)} : {plan.todayAssignment.ayahEnd}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text3)" }}>لا يوجد جزء مخصص لليوم</div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, val, span, onClick }: { icon: string; label: string; val: string; span?: boolean; onClick?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, gridColumn: span ? "1 / -1" : undefined }}>
      <i className={`ti ${icon}`} style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>{label}</div>
        {onClick ? (
          <button
            onClick={onClick}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontWeight: 600, color: "var(--green)", marginTop: 1,
              display: "flex", alignItems: "center", gap: 3, textDecoration: "underline",
            }}
          >
            {val} <i className="ti ti-arrow-left" style={{ fontSize: 11 }} />
          </button>
        ) : (
          <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{val}</div>
        )}
      </div>
    </div>
  );
}

function BoolToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--green)", width: 17, height: 17 }}
      />
      <span style={{ fontSize: 13, color: "var(--text)" }}>{label}</span>
    </label>
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

function PointRulesEditor({ rules, onChange }: { rules: PointRule[]; onChange: (rules: PointRule[]) => void }) {
  function update(i: number, patch: Partial<PointRule>) {
    onChange(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(rules.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...rules, { label: "", amount: 1, kind: "خصم" }]);
  }

  return (
    <div style={{ marginTop: 10 }}>
      {rules.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            className="form-input" style={{ flex: 2 }} placeholder="مثال: خطأ في التجويد"
            value={r.label} onChange={(e) => update(i, { label: e.target.value })}
          />
          <select className="form-input" style={{ flex: 1 }} value={r.kind} onChange={(e) => update(i, { kind: e.target.value as PointRule["kind"] })}>
            <option value="خصم">خصم</option>
            <option value="زيادة">زيادة</option>
          </select>
          <input
            className="form-input" style={{ flex: 1 }} type="number" min={1}
            value={r.amount} onChange={(e) => update(i, { amount: Number(e.target.value) || 1 })}
          />
          <button type="button" className="topbar-btn btn-ghost" style={{ padding: "8px 10px", color: "#ef4444" }} onClick={() => remove(i)}>
            <i className="ti ti-trash" />
          </button>
        </div>
      ))}
      <button type="button" className="topbar-btn btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={add}>
        <i className="ti ti-plus" /> إضافة قاعدة نقاط
      </button>
    </div>
  );
}
