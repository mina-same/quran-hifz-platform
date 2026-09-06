import { useState } from "react";
import { toast } from "sonner";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import {
  useCreateTrack, useUpdateTrack,
  TRACK_FORM_HANDOFF_KEY,
  type TrackFormHandoff, type Track, type TrackTeacher,
} from "../../api/tracks";
import { useTeachers } from "../../api/teachers";
import { useMasajid } from "../../api/masajid";
import { Card } from "../../components/common/Card";
import { FormSection } from "../../components/common/FormSection";
import { TrackStudentsPanel } from "../../components/common/TrackStudentsPanel";

function getTeacherId(v: TrackTeacher | string)   { return typeof v === "object" ? v._id  : v; }
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
}

type FormFields = {
  title: string; type: string; timeSlot: string;
  masjid: string;
  isOnline: boolean; meetLink: string;
  teachers: string[];
  maxStudents: string;
  startDate: string; endDate: string;
  daysPerWeek: string;
  status: Track["status"];
  notes: string;
};
const EMPTY: FormFields = {
  title: "", type: "", timeSlot: "",
  masjid: "",
  isOnline: false, meetLink: "",
  teachers: [], maxStudents: "30",
  startDate: "", endDate: "",
  daysPerWeek: "", status: "upcoming", notes: "",
};
const TYPE_OPTS = ["مراجعة مكثّفة","تجويد","إجازة","ختمة مسرّعة","برنامج رمضاني","تحضير مسابقة","أخرى"];
const DAYS_OPTS = ["يومياً","السبت والثلاثاء","السبت والاثنين والأربعاء","عطلة نهاية الأسبوع","ثلاث مرات أسبوعياً","مرتين أسبوعياً"];

function fieldsFromTrack(t: Track): FormFields {
  const d = (s: string) => s ? new Date(s).toISOString().split("T")[0] : "";
  return {
    title: t.title, type: t.type, timeSlot: t.timeSlot,
    masjid: typeof t.masjid === "object" ? t.masjid._id : t.masjid,
    isOnline: t.isOnline ?? false, meetLink: t.meetLink ?? "",
    teachers: t.teachers.map(getTeacherId),
    maxStudents: String(t.maxStudents),
    startDate: d(t.startDate), endDate: d(t.endDate),
    daysPerWeek: t.daysPerWeek, status: t.status, notes: t.notes ?? "",
  };
}

/** Full-page create/edit form for a track (was a popup modal) — lets the
 * admin fill in every field, then (once the track is saved and has an id)
 * add students to it right here via `TrackStudentsPanel`, same as
 * TeacherPlanForm's "save first, then manage the roster" pattern. */
export function AdminTrackForm() {
  const { showPage } = usePortal();

  const [handoff] = useState<TrackFormHandoff | null>(() => {
    const raw = sessionStorage.getItem(TRACK_FORM_HANDOFF_KEY);
    sessionStorage.removeItem(TRACK_FORM_HANDOFF_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TrackFormHandoff;
    } catch {
      return null;
    }
  });

  const { data: teachers = [] } = useTeachers();
  const { data: masajid  = [] } = useMasajid();

  const createTrack = useCreateTrack();
  const updateTrack = useUpdateTrack();

  const [trackRecord, setTrackRecord] = useState<Track | null>(handoff?.mode === "edit" ? handoff.track : null);
  const [form, setForm] = useState<FormFields>(() =>
    handoff?.mode === "edit" ? fieldsFromTrack(handoff.track) : EMPTY,
  );
  const [formError, setFormError] = useState("");

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

  async function handleSubmit() {
    const { title, type, timeSlot, isOnline, masjid,
            meetLink, teachers: tids, maxStudents, startDate, endDate, daysPerWeek } = form;

    if (!title.trim())        { setFormError("اسم المسار مطلوب"); return; }
    if (!type.trim())         { setFormError("نوع المسار مطلوب"); return; }
    if (tids.length === 0)    { setFormError("يرجى اختيار معلم واحد على الأقل"); return; }
    if (!timeSlot.trim())     { setFormError("وقت الجلسة مطلوب"); return; }
    if (!daysPerWeek.trim())  { setFormError("الأيام مطلوبة"); return; }
    if (!startDate || !endDate) { setFormError("التواريخ مطلوبة"); return; }
    if (isOnline && !meetLink.trim()) { setFormError("رابط الجلسة مطلوب"); return; }
    if (!masjid) { setFormError("يرجى اختيار المسجد"); return; }

    setFormError("");
    const body = {
      title: title.trim(), type: type.trim(), status: form.status,
      timeSlot: timeSlot.trim(), masjid, isOnline,
      meetLink: isOnline ? meetLink.trim() : "",
      teachers: tids, maxStudents: Number(maxStudents) || 30,
      startDate, endDate, daysPerWeek: daysPerWeek.trim(),
      notes: form.notes.trim(),
    };
    try {
      const result = trackRecord
        ? await updateTrack.mutateAsync({ id: trackRecord._id, ...body })
        : await createTrack.mutateAsync(body);
      setTrackRecord(result.data);
      toast.success("تم حفظ المسار");
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  useTopbar("ti-calendar-event", trackRecord ? "تعديل المسار" : "مسار جديد",
    <button className="topbar-btn btn-ghost" onClick={() => showPage("tracks")}>
      <i className="ti ti-arrow-right" /> المسارات
    </button>,
  );

  const isPending = createTrack.isPending || updateTrack.isPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: "var(--green-pale)", color: "var(--green)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>
              <i className="ti ti-calendar-event" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text)" }}>
                {trackRecord ? "تعديل المسار" : "مسار جديد"}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text3)" }}>أدخل بيانات المسار بالكامل</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="topbar-btn btn-ghost" onClick={() => showPage("tracks")}>إلغاء</button>
            <button className="topbar-btn btn-primary" onClick={handleSubmit} disabled={isPending}>
              {isPending
                ? <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> جارٍ الحفظ...</>
                : <><i className="ti ti-check" /> حفظ المسار</>
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
      </Card>

      <Card>
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
              <select className="form-input" value={form.status} onChange={(e) => sf("status", e.target.value as Track["status"])}>
                <option value="upcoming">قادم</option>
                <option value="active">نشط</option>
                <option value="ended">منتهي</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">المسجد <span>*</span></label>
              <select className="form-input" value={form.masjid} onChange={(e) => sf("masjid", e.target.value)}>
                <option value="">— اختر مسجداً —</option>
                {masajid.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
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

        <FormSection label="الجدول" icon="ti-map-pin">
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
            {form.isOnline && (
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">رابط الجلسة <span>*</span></label>
                <input className="form-input" dir="ltr" placeholder="https://meet.google.com/xxx-xxxx-xxx" value={form.meetLink} onChange={(e) => sf("meetLink", e.target.value)} />
              </div>
            )}
          </div>
        </FormSection>
      </Card>

      <Card icon="ti-users" title="طلاب المسار">
        {!trackRecord ? (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--cream)", fontSize: 12, color: "var(--text3)" }}>
            احفظ المسار أولاً لتتمكن من إضافة الطلاب إليه
          </div>
        ) : (
          <TrackStudentsPanel track={trackRecord} />
        )}
      </Card>
    </div>
  );
}
