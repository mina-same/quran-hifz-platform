import { useState, type CSSProperties } from "react";
import { useTopbar } from "../../context/useTopbar";
import {
  useSpecialTracks, useCreateTrack, useUpdateTrack, useDeleteTrack,
  useEnrollStudent, useUnenrollStudent,
  type SpecialTrack, type EnrolledStudent, type TrackTeacher,
} from "../../api/special-tracks";
import { useTeachers } from "../../api/teachers";
import { useMasajid } from "../../api/masajid";
import { useStudents } from "../../api/students";
import { Badge } from "../../components/common/Badge";

/* ─── helpers ─────────────────────────────────────────────── */
function getEnrolledId(v: EnrolledStudent | string)  { return typeof v === "object" ? v._id  : v; }
function getEnrolledName(v: EnrolledStudent | string){ return typeof v === "object" ? v.name : v; }
function getTeacherId(v: TrackTeacher | string)      { return typeof v === "object" ? v._id  : v; }
function getTeacherName(v: TrackTeacher | string)    { return typeof v === "object" ? v.name : v; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
}
const AVATAR_COLORS = [
  { bg: "var(--green-pale)", fg: "var(--green)" },
  { bg: "var(--gold-pale)",  fg: "#92400e" },
  { bg: "#eff6ff",           fg: "#1d4ed8" },
  { bg: "#fde8f0",           fg: "#9d174d" },
];

/* ─── types ───────────────────────────────────────────────── */
type FormFields = {
  title: string; type: string; timeSlot: string;
  locationSelect: string; locationCustom: string;
  isOnline: boolean; meetLink: string;
  teachers: string[];
  maxStudents: string;
  startDate: string; endDate: string;
  daysPerWeek: string;
  status: SpecialTrack["status"];
  notes: string;
};
const EMPTY: FormFields = {
  title: "", type: "", timeSlot: "",
  locationSelect: "", locationCustom: "",
  isOnline: false, meetLink: "",
  teachers: [], maxStudents: "30",
  startDate: "", endDate: "",
  daysPerWeek: "", status: "upcoming", notes: "",
};

type Modal =
  | null
  | { mode: "form"; item?: SpecialTrack }
  | { mode: "students"; item: SpecialTrack };

/* ─── overlay / dialog styles ─────────────────────────────── */
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

/* ─── status config ──────────────────────────────────────── */
const STATUS_CFG = {
  active:   { label: "نشط",    tone: "green" as const, color: "var(--green)",  bg: "var(--green-pale)", bar: "linear-gradient(90deg,var(--green),var(--green2))" },
  upcoming: { label: "قادم",   tone: "gold"  as const, color: "#d97706",       bg: "var(--gold-pale)",  bar: "linear-gradient(90deg,#f59e0b,#fbbf24)" },
  ended:    { label: "منتهي",  tone: "gray"  as const, color: "var(--text3)",  bg: "var(--cream)",      bar: "var(--border)" },
};
const TYPE_OPTS = ["مراجعة مكثّفة","تجويد","إجازة","ختمة مسرّعة","برنامج رمضاني","تحضير مسابقة","أخرى"];
const DAYS_OPTS = ["يومياً","السبت والثلاثاء","السبت والاثنين والأربعاء","عطلة نهاية الأسبوع","ثلاث مرات أسبوعياً","مرتين أسبوعياً"];

/* ════════════════════════════════════════════════════════════ */
export function AdminSpecialTracks() {
  const { data: tracks = [], isLoading } = useSpecialTracks();
  const { data: teachers = [] }          = useTeachers();
  const { data: masajid  = [] }          = useMasajid();
  const { data: allStudents = [] }       = useStudents();

  const createTrack    = useCreateTrack();
  const updateTrack    = useUpdateTrack();
  const deleteTrack    = useDeleteTrack();
  const enrollStudent  = useEnrollStudent();
  const unenrollSt     = useUnenrollStudent();

  const [modal,         setModal]         = useState<Modal>(null);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [form,          setForm]          = useState<FormFields>(EMPTY);
  const [formError,     setFormError]     = useState("");
  const [addStudentId,  setAddStudentId]  = useState("");
  const [studentsSearch,setStudentsSearch]= useState("");

  /* ── open helpers ── */
  function openAdd() {
    setForm(EMPTY); setFormError(""); setModal({ mode: "form" });
  }
  function openEdit(item: SpecialTrack) {
    const d = (s: string) => s ? new Date(s).toISOString().split("T")[0] : "";
    const matched = masajid.find((m) => m.name === item.location);
    setForm({
      title:          item.title,
      type:           item.type,
      timeSlot:       item.timeSlot,
      locationSelect: item.isOnline ? "" : (matched ? matched._id : "custom"),
      locationCustom: item.isOnline ? "" : (matched ? "" : item.location),
      isOnline:       item.isOnline ?? false,
      meetLink:       item.meetLink ?? "",
      teachers:       item.teachers.map(getTeacherId),
      maxStudents:    String(item.maxStudents),
      startDate:      d(item.startDate),
      endDate:        d(item.endDate),
      daysPerWeek:    item.daysPerWeek,
      status:         item.status,
      notes:          item.notes ?? "",
    });
    setFormError(""); setModal({ mode: "form", item });
  }

  function sf<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }
  function toggleTeacher(id: string) {
    setForm((p) => ({
      ...p,
      teachers: p.teachers.includes(id)
        ? p.teachers.filter((x) => x !== id)
        : [...p.teachers, id],
    }));
  }

  /* ── submit ── */
  async function handleSubmit() {
    const { title, type, timeSlot, isOnline, locationSelect, locationCustom,
            meetLink, teachers: tids, maxStudents, startDate, endDate, daysPerWeek } = form;

    if (!title.trim())        { setFormError("اسم المسار مطلوب"); return; }
    if (!type.trim())         { setFormError("نوع المسار مطلوب"); return; }
    if (tids.length === 0)    { setFormError("يرجى اختيار معلم واحد على الأقل"); return; }
    if (!timeSlot.trim())     { setFormError("وقت الجلسة مطلوب"); return; }
    if (!daysPerWeek.trim())  { setFormError("الأيام مطلوبة"); return; }
    if (!startDate || !endDate) { setFormError("التواريخ مطلوبة"); return; }
    if (isOnline && !meetLink.trim()) { setFormError("رابط الجلسة مطلوب"); return; }
    if (!isOnline && !locationSelect) { setFormError("يرجى اختيار الموقع"); return; }
    if (!isOnline && locationSelect === "custom" && !locationCustom.trim()) {
      setFormError("يرجى كتابة اسم الموقع"); return;
    }

    const location = isOnline
      ? "عبر الإنترنت"
      : locationSelect === "custom"
        ? locationCustom.trim()
        : (masajid.find((m) => m._id === locationSelect)?.name ?? locationCustom.trim());

    setFormError("");
    const body = {
      title: title.trim(), type: type.trim(), status: form.status,
      timeSlot: timeSlot.trim(), location, isOnline,
      meetLink: isOnline ? meetLink.trim() : "",
      teachers: tids, maxStudents: Number(maxStudents) || 30,
      startDate, endDate, daysPerWeek: daysPerWeek.trim(),
      notes: form.notes.trim(),
    };
    try {
      if (modal && "item" in modal && modal.item) {
        await updateTrack.mutateAsync({ id: modal.item._id, ...body });
      } else {
        await createTrack.mutateAsync(body);
      }
      setModal(null);
    } catch (e) { setFormError((e as Error).message); }
  }

  useTopbar("ti-calendar-event", "المسارات الاستثنائية",
    <button className="topbar-btn btn-primary" onClick={openAdd}>
      <i className="ti ti-plus" /> مسار جديد
    </button>,
  );

  const isPending = createTrack.isPending || updateTrack.isPending;

  /* ── group by status ── */
  const active   = tracks.filter((t) => t.status === "active");
  const upcoming = tracks.filter((t) => t.status === "upcoming");
  const ended    = tracks.filter((t) => t.status === "ended");

  /* ════════════════════ TRACK CARD ════════════════════════ */
  function TrackCard({ t }: { t: SpecialTrack }) {
    const cfg     = STATUS_CFG[t.status];
    const enrolled = t.enrolledStudents.length;
    const pct      = Math.min(100, Math.round((enrolled / t.maxStudents) * 100));
    const barClr   = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "var(--green)";

    return (
      <div style={{
        background: "var(--surface)", borderRadius: 16,
        border: "1px solid var(--border)",
        overflow: "hidden",
        transition: "box-shadow .2s",
      }}>
        {/* coloured top strip */}
        <div style={{ height: 4, background: cfg.bar }} />

        <div style={{ padding: "16px 18px" }}>
          {/* row 1: badges + actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
              <Badge tone={cfg.tone}>{cfg.label}</Badge>
              <span style={{
                fontSize: 11, background: cfg.bg, color: cfg.color,
                borderRadius: 6, padding: "2px 9px", fontWeight: 600,
              }}>{t.type}</span>
              {t.isOnline
                ? <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "2px 9px", fontWeight: 600 }}>
                    <i className="ti ti-wifi" style={{ marginLeft: 3 }} />أونلاين
                  </span>
                : <span style={{ fontSize: 11, background: "var(--cream)", color: "var(--text2)", borderRadius: 6, padding: "2px 9px" }}>
                    <i className="ti ti-building-arch" style={{ marginLeft: 3 }} />حضوري
                  </span>
              }
            </div>
            {/* action buttons */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                className="topbar-btn btn-ghost"
                style={{ padding: "5px 11px", fontSize: 12, color: "var(--green)", borderColor: "rgba(26,92,42,0.25)" }}
                onClick={() => { setAddStudentId(""); setStudentsSearch(""); setModal({ mode: "students", item: t }); }}
              >
                <i className="ti ti-users" />
                {enrolled > 0 && (
                  <span style={{ background: "var(--green)", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px", marginRight: 4 }}>
                    {enrolled}
                  </span>
                )}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => openEdit(t)}>
                <i className="ti ti-pencil" />
              </button>
              <button
                className="topbar-btn btn-ghost"
                style={{ padding: "5px 11px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}
                onClick={() => setDeleteId(t._id)}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>

          {/* title */}
          <h3 style={{ margin: "10px 0 12px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{t.title}</h3>

          {/* info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
            <InfoRow icon="ti-clock"    label="الوقت"    val={t.timeSlot} />
            <InfoRow icon="ti-calendar-repeat" label="الأيام" val={t.daysPerWeek} />
            <InfoRow icon="ti-calendar" label="البداية"  val={fmtDate(t.startDate)} />
            <InfoRow icon="ti-calendar-off" label="النهاية" val={fmtDate(t.endDate)} />
            <InfoRow
              icon={t.isOnline ? "ti-video" : "ti-map-pin"}
              label="المكان"
              val={t.isOnline ? "أونلاين" : t.location}
              span
            />
          </div>

          {/* teachers */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>المعلمون</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {t.teachers.map((tc, i) => {
                const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <div key={getTeacherId(tc)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: c.bg, color: c.fg,
                    borderRadius: 99, padding: "4px 10px 4px 4px", fontSize: 12, fontWeight: 600,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: c.fg, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800,
                    }}>
                      {avatarInitials(getTeacherName(tc))}
                    </div>
                    {getTeacherName(tc)}
                  </div>
                );
              })}
              {t.teachers.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--text3)" }}>— لا يوجد معلم —</span>
              )}
            </div>
          </div>

          {/* capacity bar */}
          <div style={{ background: "var(--cream)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
                <i className="ti ti-user-check" style={{ marginLeft: 4 }} />الطاقة الاستيعابية
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: barClr }}>
                {enrolled} / {t.maxStudents}
              </span>
            </div>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
            </div>
          </div>

          {/* meet link */}
          {t.isOnline && t.meetLink && (
            <a
              href={t.meetLink} target="_blank" rel="noreferrer"
              style={{
                marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, color: "#1d4ed8", background: "#eff6ff",
                padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(29,78,216,0.2)",
                textDecoration: "none", fontWeight: 600,
              }}
            >
              <i className="ti ti-video" /> انضم للجلسة
            </a>
          )}
        </div>
      </div>
    );
  }

  function InfoRow({ icon, label, val, span }: { icon: string; label: string; val: string; span?: boolean }) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, gridColumn: span ? "1 / -1" : undefined }}>
        <i className={`ti ${icon}`} style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>{label}</div>
          <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{val}</div>
        </div>
      </div>
    );
  }

  function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 4, height: 18, borderRadius: 2, background: color }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{label}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
          background: color + "22", color,
        }}>{count}</span>
      </div>
    );
  }

  /* ════════════════════ RENDER ════════════════════════════ */
  return (
    <>
      {isLoading && <div className="page-loading"><i className="ti ti-loader-2" /> جارٍ التحميل...</div>}

      {!isLoading && tracks.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 0" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: "var(--green-pale)", color: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 16px",
          }}>
            <i className="ti ti-calendar-event" />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>لا توجد مسارات بعد</p>
          <p style={{ margin: "6px 0 20px", fontSize: 13, color: "var(--text3)" }}>أضف أول مسار استثنائي</p>
          <button className="topbar-btn btn-primary" style={{ padding: "10px 24px" }} onClick={openAdd}>
            <i className="ti ti-plus" /> مسار جديد
          </button>
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {active.length > 0 && (
            <section>
              <SectionHeader label="المسارات النشطة" count={active.length} color="var(--green)" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
                {active.map((t) => <TrackCard key={t._id} t={t} />)}
              </div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <SectionHeader label="المسارات القادمة" count={upcoming.length} color="#d97706" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
                {upcoming.map((t) => <TrackCard key={t._id} t={t} />)}
              </div>
            </section>
          )}
          {ended.length > 0 && (
            <section>
              <SectionHeader label="المسارات المنتهية" count={ended.length} color="var(--text3)" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14, opacity: 0.75 }}>
                {ended.map((t) => <TrackCard key={t._id} t={t} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ════════ FORM MODAL ════════ */}
      {modal?.mode === "form" && (
        <div style={OVERLAY} onClick={() => setModal(null)}>
          <div style={{ ...DIALOG, maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            {/* header */}
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
                  <i className="ti ti-calendar-event" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>
                    {"item" in modal && modal.item ? "تعديل المسار" : "مسار استثنائي جديد"}
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text3)" }}>أدخل بيانات المسار بالكامل</p>
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

              {/* ── Section: نوع الجلسة ── */}
              <FormSection label="نوع الجلسة" icon="ti-device-laptop">
                <div style={{ display: "flex", gap: 8 }}>
                  {([false, true] as const).map((online) => (
                    <button
                      key={String(online)}
                      type="button"
                      onClick={() => sf("isOnline", online)}
                      style={{
                        flex: 1, padding: "11px 0", borderRadius: 10, cursor: "pointer",
                        border: `2px solid ${form.isOnline === online ? "var(--green)" : "var(--border)"}`,
                        background: form.isOnline === online ? "var(--green-pale)" : "var(--cream)",
                        color: form.isOnline === online ? "var(--green)" : "var(--text2)",
                        fontWeight: form.isOnline === online ? 700 : 400,
                        fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        transition: "all .15s",
                      }}
                    >
                      <i className={`ti ${online ? "ti-video" : "ti-building-mosque"}`} />
                      {online ? "أونلاين" : "حضوري"}
                    </button>
                  ))}
                </div>
              </FormSection>

              {/* ── Section: المعلومات الأساسية ── */}
              <FormSection label="المعلومات الأساسية" icon="ti-info-circle">
                <div className="form-grid-2">
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">اسم المسار <span>*</span></label>
                    <input className="form-input" placeholder="مثال: دورة المراجعة الصيفية ١٤٤٧" value={form.title} onChange={(e) => sf("title", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">النوع <span>*</span></label>
                    <select className="form-input" value={form.type} onChange={(e) => sf("type", e.target.value)}>
                      <option value="">— اختر —</option>
                      {TYPE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الحالة</label>
                    <select className="form-input" value={form.status} onChange={(e) => sf("status", e.target.value as SpecialTrack["status"])}>
                      <option value="upcoming">قادم</option>
                      <option value="active">نشط</option>
                      <option value="ended">منتهي</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الحد الأقصى للطلاب</label>
                    <input className="form-input" type="number" min={1} value={form.maxStudents} onChange={(e) => sf("maxStudents", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ملاحظات</label>
                    <input className="form-input" placeholder="أي معلومات إضافية..." value={form.notes} onChange={(e) => sf("notes", e.target.value)} />
                  </div>
                </div>
              </FormSection>

              {/* ── Section: المعلمون ── */}
              <FormSection label="المعلمون المسؤولون" icon="ti-chalkboard">
                {form.teachers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {form.teachers.map((id) => {
                      const t = teachers.find((x) => x._id === id);
                      return (
                        <div key={id} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: "var(--green-pale)", color: "var(--green)",
                          borderRadius: 99, padding: "5px 10px 5px 6px", fontSize: 12, fontWeight: 700,
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: "var(--green)", color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 8, fontWeight: 800,
                          }}>
                            {avatarInitials(t?.name ?? "")}
                          </div>
                          {t?.name}
                          <button
                            type="button"
                            onClick={() => toggleTeacher(id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1, marginRight: 2 }}
                          >
                            <i className="ti ti-x" style={{ fontSize: 11 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{
                  border: "1px solid var(--border)", borderRadius: 10,
                  maxHeight: 160, overflowY: "auto",
                }}>
                  {teachers.length === 0 && (
                    <div style={{ padding: 12, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
                      لا يوجد معلمون مسجّلون
                    </div>
                  )}
                  {teachers.map((tc, i) => {
                    const selected = form.teachers.includes(tc._id);
                    return (
                      <label
                        key={tc._id}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", cursor: "pointer",
                          borderBottom: i < teachers.length - 1 ? "1px solid var(--border)" : "none",
                          background: selected ? "var(--green-pale)" : "transparent",
                          transition: "background .12s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleTeacher(tc._id)}
                          style={{ accentColor: "var(--green)", width: 15, height: 15, flexShrink: 0 }}
                        />
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: selected ? "var(--green)" : "var(--cream)",
                          color: selected ? "#fff" : "var(--text2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800, flexShrink: 0,
                        }}>
                          {avatarInitials(tc.name)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: selected ? 700 : 400, color: selected ? "var(--green)" : "var(--text)" }}>
                          {tc.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FormSection>

              {/* ── Section: الجدول والموقع ── */}
              <FormSection label="الجدول والموقع" icon="ti-map-pin">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">الوقت <span>*</span></label>
                    <input className="form-input" placeholder="بعد الفجر | ٦:١٠ – ٧:٣٠" value={form.timeSlot} onChange={(e) => sf("timeSlot", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الأيام <span>*</span></label>
                    <select className="form-input" value={form.daysPerWeek} onChange={(e) => sf("daysPerWeek", e.target.value)}>
                      <option value="">— اختر —</option>
                      {DAYS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                      <option value="custom">أخرى (أدخل يدوياً)</option>
                    </select>
                    {form.daysPerWeek === "custom" && (
                      <input className="form-input" style={{ marginTop: 6 }} placeholder="مثال: السبت والثلاثاء والخميس" onChange={(e) => sf("daysPerWeek", e.target.value)} />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ البداية <span>*</span></label>
                    <input className="form-input" type="date" dir="ltr" value={form.startDate} onChange={(e) => sf("startDate", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ النهاية <span>*</span></label>
                    <input className="form-input" type="date" dir="ltr" value={form.endDate} onChange={(e) => sf("endDate", e.target.value)} />
                  </div>
                  {form.isOnline ? (
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <label className="form-label">رابط الجلسة <span>*</span></label>
                      <input className="form-input" dir="ltr" placeholder="https://meet.google.com/xxx-xxxx-xxx" value={form.meetLink} onChange={(e) => sf("meetLink", e.target.value)} />
                    </div>
                  ) : (
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <label className="form-label">الموقع <span>*</span></label>
                      <select className="form-input" value={form.locationSelect} onChange={(e) => sf("locationSelect", e.target.value)}>
                        <option value="">— اختر مسجداً —</option>
                        {masajid.map((m) => <option key={m._id} value={m._id}>{m.name} — {m.location}</option>)}
                        <option value="custom">موقع آخر (أدخل يدوياً)</option>
                      </select>
                      {form.locationSelect === "custom" && (
                        <input className="form-input" style={{ marginTop: 6 }} placeholder="اسم المسجد أو القاعة" value={form.locationCustom} onChange={(e) => sf("locationCustom", e.target.value)} />
                      )}
                    </div>
                  )}
                </div>
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
                    : <><i className="ti ti-check" /> حفظ المسار</>
                  }
                </button>
                <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => setModal(null)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ STUDENTS MODAL ════════ */}
      {modal?.mode === "students" && (() => {
        const track       = tracks.find((t) => t._id === modal.item._id) ?? modal.item;
        const enrolledCnt = track.enrolledStudents.length;
        const capPct      = Math.min(100, Math.round((enrolledCnt / track.maxStudents) * 100));
        const barClr      = capPct >= 90 ? "#ef4444" : capPct >= 70 ? "#f59e0b" : "var(--green)";
        const isFull      = enrolledCnt >= track.maxStudents;
        const enrolledIds = new Set(track.enrolledStudents.map(getEnrolledId));
        const available   = allStudents.filter(
          (s) => !enrolledIds.has(s._id) && (!studentsSearch.trim() || s.name.includes(studentsSearch.trim()))
        );

        return (
          <div style={OVERLAY} onClick={() => { setModal(null); setStudentsSearch(""); }}>
            <div style={{ ...DIALOG, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
              {/* header */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "18px 22px 14px", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--green-pale)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                    <i className="ti ti-users" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text)" }}>إدارة طلاب المسار</h3>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>{track.title}</p>
                  </div>
                </div>
                <button className="topbar-btn btn-ghost" style={{ padding: "5px 8px" }} onClick={() => { setModal(null); setStudentsSearch(""); }}>
                  <i className="ti ti-x" />
                </button>
              </div>

              <div style={{ padding: "16px 22px" }}>
                {/* capacity */}
                <div style={{ background: "var(--cream)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>
                      <i className="ti ti-user-check" style={{ marginLeft: 4 }} />طاقة المسار
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barClr }}>{enrolledCnt} / {track.maxStudents}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${capPct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
                  </div>
                  {isFull && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#ef4444", fontWeight: 600 }}><i className="ti ti-alert-circle" style={{ marginLeft: 4 }} />وصل المسار للحد الأقصى</p>}
                </div>

                {/* add student */}
                {!isFull && (
                  <div style={{ border: "1.5px dashed var(--border2)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                      <i className="ti ti-user-plus" style={{ marginLeft: 5, color: "var(--green)" }} />إضافة طالب
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select className="form-input" style={{ flex: 1, fontSize: 13 }} value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)}>
                        <option value="">— اختر طالباً —</option>
                        {available.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                      <button
                        className="topbar-btn btn-primary"
                        style={{ padding: "0 16px", whiteSpace: "nowrap", fontSize: 13 }}
                        disabled={!addStudentId || enrollStudent.isPending}
                        onClick={async () => {
                          if (!addStudentId) return;
                          await enrollStudent.mutateAsync({ id: track._id, studentId: addStudentId });
                          setAddStudentId("");
                        }}
                      >
                        {enrollStudent.isPending
                          ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} />
                          : <><i className="ti ti-plus" /> إضافة</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* enrolled list header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>الطلاب المسجّلون</span>
                  {enrolledCnt > 0 && (
                    <input className="form-input" style={{ width: 140, fontSize: 12, padding: "5px 10px" }} placeholder="بحث..." value={studentsSearch} onChange={(e) => setStudentsSearch(e.target.value)} />
                  )}
                </div>

                {enrolledCnt === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", background: "var(--cream)", borderRadius: 10 }}>
                    <i className="ti ti-user-off" style={{ fontSize: 28, color: "var(--text3)", display: "block", marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text3)" }}>لا يوجد طلاب مسجّلون بعد</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                    {track.enrolledStudents
                      .filter((s) => !studentsSearch.trim() || getEnrolledName(s).includes(studentsSearch.trim()))
                      .map((s, idx) => {
                        const name = getEnrolledName(s);
                        const id   = getEnrolledId(s);
                        const c    = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        return (
                          <div key={id} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "9px 12px", background: "var(--cream)", borderRadius: 10,
                            border: "1px solid var(--border)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: "50%",
                                background: c.bg, color: c.fg,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, flexShrink: 0,
                              }}>{avatarInitials(name)}</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{name}</div>
                                <div style={{ fontSize: 10, color: "var(--text3)" }}>#{idx + 1}</div>
                              </div>
                            </div>
                            <button
                              className="topbar-btn btn-ghost"
                              style={{ padding: "5px 11px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}
                              disabled={unenrollSt.isPending}
                              onClick={() => unenrollSt.mutate({ id: track._id, studentId: id })}
                            >
                              <i className="ti ti-user-minus" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}

                <button
                  className="topbar-btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center", marginTop: 16, padding: 10 }}
                  onClick={() => { setModal(null); setStudentsSearch(""); }}
                >إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

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
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>حذف المسار</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>سيُحذف المسار نهائياً ولا يمكن التراجع.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", borderColor: "#ef4444", padding: 11 }}
                onClick={async () => { await deleteTrack.mutateAsync(deleteId); setDeleteId(null); }}
                disabled={deleteTrack.isPending}
              >
                <i className="ti ti-trash" />
                {deleteTrack.isPending ? "جارٍ الحذف..." : "حذف"}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => setDeleteId(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── small presentational helper ── */
function FormSection({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        marginBottom: 12, paddingBottom: 8,
        borderBottom: "1px solid var(--border)",
      }}>
        <i className={`ti ${icon}`} style={{ color: "var(--green)", fontSize: 14 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
