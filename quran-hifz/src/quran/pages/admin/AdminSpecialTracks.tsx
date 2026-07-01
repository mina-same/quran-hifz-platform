import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import {
  useSpecialTracks,
  useCreateTrack,
  useUpdateTrack,
  useDeleteTrack,
  useEnrollStudent,
  useUnenrollStudent,
  type SpecialTrack,
  type EnrolledStudent,
} from "../../api/special-tracks";
import { useTeachers } from "../../api/teachers";
import { useMasajid } from "../../api/masajid";
import { useStudents } from "../../api/students";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";

const STATUS_TONE: Record<SpecialTrack["status"], "green" | "gold" | "gray"> = {
  active:   "green",
  upcoming: "gold",
  ended:    "gray",
};
const STATUS_LABEL: Record<SpecialTrack["status"], string> = {
  active:   "نشط",
  upcoming: "قادم",
  ended:    "منتهي",
};

type FormFields = {
  title: string;
  type: string;
  timeSlot: string;
  locationSelect: string; // masjid._id | "custom"
  locationCustom: string;
  isOnline: boolean;
  meetLink: string;
  teacher: string;
  maxStudents: string;
  startDate: string;
  endDate: string;
  daysPerWeek: string;
  status: SpecialTrack["status"];
};

const EMPTY_FORM: FormFields = {
  title: "", type: "", timeSlot: "", locationSelect: "", locationCustom: "",
  isOnline: false, meetLink: "", teacher: "", maxStudents: "",
  startDate: "", endDate: "", daysPerWeek: "", status: "upcoming",
};

type ModalState = null | { mode: "add" } | { mode: "edit"; item: SpecialTrack } | { mode: "students"; item: SpecialTrack };

function getEnrolledId(v: EnrolledStudent | string): string {
  return typeof v === "object" ? v._id : v;
}
function getEnrolledName(v: EnrolledStudent | string): string {
  return typeof v === "object" ? v.name : v;
}

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
};
const DIALOG: React.CSSProperties = {
  background: "white", borderRadius: 12, padding: 24, width: "100%", maxWidth: 520,
  maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

function getTeacherName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return String(v ?? "");
}
function getTeacherId(v: unknown): string {
  if (v && typeof v === "object" && "_id" in v) return (v as { _id: string })._id;
  return String(v ?? "");
}

export function AdminSpecialTracks() {
  const { data: tracks, isLoading } = useSpecialTracks();
  const { data: teachers = [] } = useTeachers();
  const { data: masajid = [] } = useMasajid();
  const { data: allStudents = [] } = useStudents();
  const createTrack   = useCreateTrack();
  const updateTrack   = useUpdateTrack();
  const deleteTrack   = useDeleteTrack();
  const enrollStudent   = useEnrollStudent();
  const unenrollStudent = useUnenrollStudent();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [addStudentId, setAddStudentId] = useState("");

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal({ mode: "add" });
  }

  function openEdit(item: SpecialTrack) {
    const d = (s: string) => s ? new Date(s).toISOString().split("T")[0] : "";
    const matchedMasjid = masajid.find((m) => m.name === item.location);
    setForm({
      title:          item.title,
      type:           item.type,
      timeSlot:       item.timeSlot,
      locationSelect: item.isOnline ? "" : (matchedMasjid ? matchedMasjid._id : "custom"),
      locationCustom: item.isOnline ? "" : (matchedMasjid ? "" : item.location),
      isOnline:       item.isOnline ?? false,
      meetLink:       item.meetLink ?? "",
      teacher:        getTeacherId(item.teacher),
      maxStudents:    String(item.maxStudents),
      startDate:      d(item.startDate),
      endDate:        d(item.endDate),
      daysPerWeek:    item.daysPerWeek,
      status:         item.status,
    });
    setFormError("");
    setModal({ mode: "edit", item });
  }

  function setField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const {
      title, type, timeSlot, isOnline,
      locationSelect, locationCustom, meetLink,
      teacher, maxStudents, startDate, endDate, daysPerWeek,
    } = form;

    if (!title.trim())       { setFormError("اسم المسار مطلوب"); return; }
    if (!type.trim())        { setFormError("نوع المسار مطلوب"); return; }
    if (!teacher)            { setFormError("يرجى اختيار المعلم"); return; }
    if (!timeSlot.trim())    { setFormError("وقت الحلقة مطلوب"); return; }
    if (!daysPerWeek.trim()) { setFormError("الأيام مطلوبة"); return; }
    if (!startDate || !endDate) { setFormError("التواريخ مطلوبة"); return; }
    if (isOnline && !meetLink.trim()) {
      setFormError("رابط Google Meet مطلوب للحلقات الإلكترونية"); return;
    }
    if (!isOnline && !locationSelect) {
      setFormError("يرجى اختيار المسجد أو الموقع"); return;
    }
    if (!isOnline && locationSelect === "custom" && !locationCustom.trim()) {
      setFormError("يرجى كتابة اسم الموقع"); return;
    }

    const resolvedLocation = isOnline
      ? "عبر الإنترنت"
      : locationSelect === "custom"
        ? locationCustom.trim()
        : (masajid.find((m) => m._id === locationSelect)?.name ?? locationCustom.trim());

    setFormError("");
    const body = {
      title:       title.trim(),
      type:        type.trim(),
      status:      form.status,
      timeSlot:    timeSlot.trim(),
      location:    resolvedLocation,
      isOnline,
      meetLink:    isOnline ? meetLink.trim() : "",
      teacher,
      maxStudents: Number(maxStudents) || 30,
      startDate,
      endDate,
      daysPerWeek: daysPerWeek.trim(),
    };

    try {
      if (modal?.mode === "add") {
        await createTrack.mutateAsync(body);
      } else if (modal?.mode === "edit") {
        await updateTrack.mutateAsync({ id: modal.item._id, ...body });
      }
      setModal(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await deleteTrack.mutateAsync(deleteId); }
    finally { setDeleteId(null); }
  }

  useTopbar(
    "ti-calendar-event",
    "المسارات الاستثنائية",
    <button className="topbar-btn btn-primary" onClick={openAdd}>
      <i className="ti ti-plus" /> مسار جديد
    </button>,
  );

  const isPending = createTrack.isPending || updateTrack.isPending;

  return (
    <>
      {isLoading && (
        <div className="page-loading"><i className="ti ti-loader-2" /> جارٍ التحميل...</div>
      )}

      {(tracks ?? []).map((t) => {
        const teacherName = getTeacherName(t.teacher);
        const enrolled    = t.enrolledStudents?.length ?? 0;
        return (
          <Card key={t._id} icon="ti-calendar-event" title={t.title}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
              <Badge tone="blue">{t.type}</Badge>
              {t.isOnline ? (
                <Badge tone="green"><i className="ti ti-video" style={{ fontSize: 11 }} /> إلكتروني</Badge>
              ) : (
                <Badge tone="gray"><i className="ti ti-building-arch" style={{ fontSize: 11 }} /> حضوري</Badge>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginBottom: 12 }}>
              <div className="halqa-row"><span className="lbl">المعلم</span><span className="val">{teacherName}</span></div>
              <div className="halqa-row">
                <span className="lbl">{t.isOnline ? "الحلقة" : "الموقع"}</span>
                <span className="val">{t.isOnline ? "عبر الإنترنت" : t.location}</span>
              </div>
              <div className="halqa-row"><span className="lbl">الوقت</span><span className="val">{t.timeSlot}</span></div>
              <div className="halqa-row"><span className="lbl">الأيام</span><span className="val">{t.daysPerWeek}</span></div>
              <div className="halqa-row"><span className="lbl">البداية</span><span className="val">{new Date(t.startDate).toLocaleDateString("ar-SA")}</span></div>
              <div className="halqa-row"><span className="lbl">النهاية</span><span className="val">{new Date(t.endDate).toLocaleDateString("ar-SA")}</span></div>
            </div>

            {t.isOnline && t.meetLink && (
              <a
                href={t.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 12px",
                  background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8,
                  color: "#15803d", fontSize: 12, fontWeight: 600, textDecoration: "none",
                  marginBottom: 12,
                }}
              >
                <i className="ti ti-brand-google" style={{ fontSize: 15 }} />
                انضم عبر Google Meet
              </a>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>
                المسجّلون: <strong>{enrolled}/{t.maxStudents}</strong>
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="topbar-btn btn-ghost"
                  style={{ padding: "5px 12px", fontSize: 12, color: "var(--green)", borderColor: "rgba(26,92,42,0.25)" }}
                  onClick={() => { setAddStudentId(""); setModal({ mode: "students", item: t }); }}
                >
                  <i className="ti ti-users" /> الطلاب
                </button>
                <button
                  className="topbar-btn btn-ghost"
                  style={{ padding: "5px 12px", fontSize: 12 }}
                  onClick={() => openEdit(t)}
                >
                  <i className="ti ti-pencil" /> تعديل
                </button>
                <button
                  className="topbar-btn btn-ghost"
                  style={{ padding: "5px 12px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                  onClick={() => setDeleteId(t._id)}
                  disabled={deleteTrack.isPending}
                >
                  <i className="ti ti-trash" /> حذف
                </button>
              </div>
            </div>
          </Card>
        );
      })}

      {!isLoading && (tracks ?? []).length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)", fontSize: 14 }}>
          <i className="ti ti-calendar-event" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
          لا توجد مسارات استثنائية بعد
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div style={OVERLAY} onClick={() => setModal(null)}>
          <div style={DIALOG} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {modal.mode === "add" ? "إضافة مسار استثنائي" : "تعديل المسار"}
              </h3>
              <button className="topbar-btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>

            {formError && (
              <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
                {formError}
              </div>
            )}

            {/* Online / Offline Toggle */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">نوع الحلقة</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setField("isOnline", false)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8, border: "2px solid",
                    borderColor: !form.isOnline ? "var(--green)" : "var(--border)",
                    background: !form.isOnline ? "var(--green-pale)" : "white",
                    color: !form.isOnline ? "var(--green)" : "var(--text2)",
                    fontWeight: !form.isOnline ? 700 : 400,
                    cursor: "pointer", fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <i className="ti ti-building-mosque" /> حضوري
                </button>
                <button
                  type="button"
                  onClick={() => setField("isOnline", true)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8, border: "2px solid",
                    borderColor: form.isOnline ? "var(--green)" : "var(--border)",
                    background: form.isOnline ? "var(--green-pale)" : "white",
                    color: form.isOnline ? "var(--green)" : "var(--text2)",
                    fontWeight: form.isOnline ? 700 : 400,
                    cursor: "pointer", fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <i className="ti ti-video" /> إلكتروني (أونلاين)
                </button>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">اسم المسار <span>*</span></label>
                <input className="form-input" placeholder="حلقات الصيف ١٤٤٧" value={form.title} onChange={(e) => setField("title", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">النوع <span>*</span></label>
                <input className="form-input" placeholder="صيفي، رمضاني، مكثف" value={form.type} onChange={(e) => setField("type", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={(e) => setField("status", e.target.value as SpecialTrack["status"])}>
                  <option value="upcoming">قادم</option>
                  <option value="active">نشط</option>
                  <option value="ended">منتهي</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المعلم المسؤول <span>*</span></label>
                <select className="form-input" value={form.teacher} onChange={(e) => setField("teacher", e.target.value)}>
                  <option value="">اختر المعلم</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">الحد الأقصى للطلاب</label>
                <input className="form-input" type="number" min={1} placeholder="٣٠" value={form.maxStudents} onChange={(e) => setField("maxStudents", e.target.value)} />
              </div>

              {/* Conditional: mosque select OR meet link */}
              {form.isOnline ? (
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">رابط Google Meet <span>*</span></label>
                  <input
                    className="form-input"
                    dir="ltr"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    value={form.meetLink}
                    onChange={(e) => setField("meetLink", e.target.value)}
                  />
                </div>
              ) : (
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">الموقع (المسجد) <span>*</span></label>
                  <select
                    className="form-input"
                    value={form.locationSelect}
                    onChange={(e) => setField("locationSelect", e.target.value)}
                  >
                    <option value="">— اختر مسجداً —</option>
                    {masajid.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} — {m.location}
                      </option>
                    ))}
                    <option value="custom">📝 موقع آخر (أدخل يدوياً)</option>
                  </select>
                  {form.locationSelect === "custom" && (
                    <input
                      className="form-input"
                      style={{ marginTop: 8 }}
                      placeholder="اسم المسجد أو القاعة"
                      value={form.locationCustom}
                      onChange={(e) => setField("locationCustom", e.target.value)}
                    />
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">الوقت <span>*</span></label>
                <input className="form-input" placeholder="بعد الفجر | ٦:١٠ – ٧:٣٠" value={form.timeSlot} onChange={(e) => setField("timeSlot", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">الأيام <span>*</span></label>
                <input className="form-input" placeholder="السبت - الاثنين - الأربعاء" value={form.daysPerWeek} onChange={(e) => setField("daysPerWeek", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">تاريخ البداية <span>*</span></label>
                <input className="form-input" type="date" dir="ltr" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">تاريخ النهاية <span>*</span></label>
                <input className="form-input" type="date" dir="ltr" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", padding: 10 }}
                onClick={handleSubmit}
                disabled={isPending}
              >
                <i className="ti ti-check" />
                {isPending ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setModal(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Students Management Modal */}
      {modal?.mode === "students" && (() => {
        const track = (tracks ?? []).find((t) => t._id === modal.item._id) ?? modal.item;
        const enrolledIds = new Set(track.enrolledStudents.map(getEnrolledId));
        const available = allStudents.filter((s) => !enrolledIds.has(s._id));
        return (
          <div style={OVERLAY} onClick={() => setModal(null)}>
            <div style={{ ...DIALOG, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                    <i className="ti ti-users" style={{ marginLeft: 6, color: "var(--green)" }} />
                    طلاب المسار: {track.title}
                  </h3>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>
                    {track.enrolledStudents.length} / {track.maxStudents} مسجّل
                  </span>
                </div>
                <button className="topbar-btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setModal(null)}>
                  <i className="ti ti-x" />
                </button>
              </div>

              {/* Add Student */}
              {available.length > 0 && track.enrolledStudents.length < track.maxStudents && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <select
                    className="form-input"
                    style={{ flex: 1, fontSize: 13 }}
                    value={addStudentId}
                    onChange={(e) => setAddStudentId(e.target.value)}
                  >
                    <option value="">— اختر طالباً للإضافة —</option>
                    {available.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    className="topbar-btn btn-primary"
                    style={{ padding: "8px 16px", whiteSpace: "nowrap" }}
                    disabled={!addStudentId || enrollStudent.isPending}
                    onClick={async () => {
                      if (!addStudentId) return;
                      await enrollStudent.mutateAsync({ id: track._id, studentId: addStudentId });
                      setAddStudentId("");
                    }}
                  >
                    <i className="ti ti-plus" /> إضافة
                  </button>
                </div>
              )}

              {track.enrolledStudents.length >= track.maxStudents && (
                <div style={{ padding: "8px 12px", background: "#fef9c3", borderRadius: 8, fontSize: 12, color: "#92400e", marginBottom: 12 }}>
                  <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
                  وصل المسار للحد الأقصى ({track.maxStudents} طالب)
                </div>
              )}

              {/* Enrolled List */}
              {track.enrolledStudents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text3)", fontSize: 13 }}>
                  <i className="ti ti-user-off" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                  لا يوجد طلاب مسجّلون بعد
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {track.enrolledStudents.map((s) => (
                    <div
                      key={getEnrolledId(s)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", background: "var(--surface)", borderRadius: 10,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%",
                          background: "var(--green-pale)", color: "var(--green)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, fontWeight: 700,
                        }}>
                          <i className="ti ti-user" />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                          {getEnrolledName(s)}
                        </span>
                      </div>
                      <button
                        className="topbar-btn btn-ghost"
                        style={{ padding: "4px 10px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                        disabled={unenrollStudent.isPending}
                        onClick={() => unenrollStudent.mutate({ id: track._id, studentId: getEnrolledId(s) })}
                      >
                        <i className="ti ti-user-minus" /> إزالة
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="topbar-btn btn-ghost"
                style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
                onClick={() => setModal(null)}
              >
                إغلاق
              </button>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation */}
      {deleteId && (
        <div style={OVERLAY} onClick={() => setDeleteId(null)}>
          <div style={{ ...DIALOG, maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: "#ef4444", display: "block" }} />
              <h3 style={{ margin: "12px 0 6px", fontSize: 16 }}>حذف المسار الاستثنائي</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>
                سيتم حذف المسار نهائياً. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", padding: 10 }}
                onClick={handleDelete}
                disabled={deleteTrack.isPending}
              >
                <i className="ti ti-trash" />
                {deleteTrack.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setDeleteId(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
