import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { useSpecialTracks, useCreateTrack, useDeleteTrack } from "../../api/special-tracks";
import type { SpecialTrack } from "../../api/special-tracks";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
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

export function AdminSpecialTracks() {
  const { data: tracks, isLoading } = useSpecialTracks();
  const createTrack = useCreateTrack();
  const deleteTrack = useDeleteTrack();

  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [form, setForm]         = useState({
    title: "", type: "", timeSlot: "", location: "", teacher: "", maxStudents: "",
    startDate: "", endDate: "", daysPerWeek: "",
  });

  useTopbar(
    "ti-calendar-event",
    "المسارات الاستثنائية",
    <button className="topbar-btn btn-primary" onClick={() => setShowForm(true)}>
      <i className="ti ti-plus" /> مسار جديد
    </button>,
  );

  async function handleAdd() {
    if (!form.title.trim()) return;
    await createTrack.mutateAsync({
      title:       form.title,
      type:        form.type || "عام",
      status:      "upcoming",
      startDate:   form.startDate || new Date().toISOString(),
      endDate:     form.endDate   || new Date().toISOString(),
      daysPerWeek: form.daysPerWeek || "—",
      timeSlot:    form.timeSlot,
      location:    form.location,
      teacher:     form.teacher,
      maxStudents: Number(form.maxStudents) || 30,
    });
    setForm({ title: "", type: "", timeSlot: "", location: "", teacher: "", maxStudents: "", startDate: "", endDate: "", daysPerWeek: "" });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      {saved && <Alert tone="success">تم إضافة المسار الاستثنائي بنجاح ✓</Alert>}
      {createTrack.isError && <Alert tone="error">فشلت الإضافة، حاول مجدداً.</Alert>}

      {showForm && (
        <Card icon="ti-plus" title="إضافة مسار استثنائي">
          <div className="form-grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">اسم المسار <span>*</span></label>
              <input className="form-input" placeholder="مثال: حلقات الصيف ١٤٤٧" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">النوع</label>
              <input className="form-input" placeholder="مثال: صيفي، رمضاني، مكثف" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">الموقع</label>
              <input className="form-input" placeholder="اسم المسجد أو القاعة" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">الوقت</label>
              <input className="form-input" placeholder="مثال: بعد الفجر | ٦:١٠ – ٧:٣٠" value={form.timeSlot} onChange={(e) => setForm((f) => ({ ...f, timeSlot: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">المعلم المسؤول</label>
              <input className="form-input" placeholder="معرّف المعلم" value={form.teacher} onChange={(e) => setForm((f) => ({ ...f, teacher: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">الحد الأقصى للطلاب</label>
              <input className="form-input" type="number" min={1} placeholder="٣٠" value={form.maxStudents} onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="topbar-btn btn-primary" onClick={handleAdd} disabled={createTrack.isPending}>
              <i className="ti ti-check" /> {createTrack.isPending ? "جارٍ الحفظ..." : "إضافة"}
            </button>
            <button className="topbar-btn btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
          </div>
        </Card>
      )}

      {isLoading && <div style={{ padding: "1rem", color: "var(--text-muted)" }}>جارٍ التحميل...</div>}

      {(tracks ?? []).map((t) => {
        const teacherName = typeof t.teacher === "object" ? t.teacher.name : t.teacher;
        const enrolled    = t.enrolledStudents?.length ?? 0;
        return (
          <Card key={t._id} icon="ti-calendar-event" title={t.title}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
              <Badge tone="blue">{t.type}</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginBottom: 12 }}>
              <div className="halqa-row"><span className="lbl">المعلم</span><span className="val">{teacherName}</span></div>
              <div className="halqa-row"><span className="lbl">الموقع</span><span className="val">{t.location}</span></div>
              <div className="halqa-row"><span className="lbl">الوقت</span><span className="val">{t.timeSlot}</span></div>
              <div className="halqa-row"><span className="lbl">الأيام</span><span className="val">{t.daysPerWeek}</span></div>
              <div className="halqa-row"><span className="lbl">البداية</span><span className="val">{new Date(t.startDate).toLocaleDateString("ar-SA")}</span></div>
              <div className="halqa-row"><span className="lbl">النهاية</span><span className="val">{new Date(t.endDate).toLocaleDateString("ar-SA")}</span></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>
                المسجّلون: <strong>{enrolled}/{t.maxStudents}</strong>
              </span>
              <button
                className="topbar-btn btn-danger"
                style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={() => deleteTrack.mutate(t._id)}
                disabled={deleteTrack.isPending}
              >
                <i className="ti ti-trash" /> حذف
              </button>
            </div>
          </Card>
        );
      })}
    </>
  );
}
