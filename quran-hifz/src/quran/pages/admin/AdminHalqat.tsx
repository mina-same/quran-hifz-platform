import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Badge } from "../../components/common/Badge";
import { SkeletonList } from "../../components/common/Skeleton";
import {
  useHalqat,
  useCreateHalqa,
  useUpdateHalqa,
  useDeleteHalqa,
  type Halqa,
} from "../../api/halqat";
import { useTeachers } from "../../api/teachers";
import { useMasajid } from "../../api/masajid";
import { useSpecialTracks } from "../../api/special-tracks";
import { toAr } from "../../../lib/format";

type ModalState = null | { mode: "add" } | { mode: "edit"; item: Halqa };

const OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const DIALOG: React.CSSProperties = {
  background: "white",
  borderRadius: 12,
  padding: 24,
  width: "100%",
  maxWidth: 440,
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

// teacher/masjid come back either populated ({_id,name}) or as a bare id string.
function refId(ref: { _id: string } | string | null | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref._id;
}
function refName(ref: { name: string } | string | null | undefined): string {
  if (!ref) return "—";
  return typeof ref === "string" ? "—" : ref.name;
}
function refTitle(ref: { title: string } | string | null | undefined): string {
  if (!ref) return "—";
  return typeof ref === "string" ? "—" : ref.title;
}

export function AdminHalqat() {
  const { data: halqat = [], isLoading, error } = useHalqat();
  const { data: teachers = [] } = useTeachers();
  const { data: masajid = [] } = useMasajid();
  const { data: tracks = [] } = useSpecialTracks();
  const createHalqa = useCreateHalqa();
  const updateHalqa = useUpdateHalqa();
  const deleteHalqa = useDeleteHalqa();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [masjid, setMasjid] = useState("");
  const [specialTrack, setSpecialTrack] = useState("");
  const [days, setDays] = useState("");
  const [time, setTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [formError, setFormError] = useState("");

  function openAdd() {
    setName("");
    setTeacher("");
    setMasjid("");
    setSpecialTrack("");
    setDays("");
    setTime("");
    setCapacity("");
    setFormError("");
    setModal({ mode: "add" });
  }

  function openEdit(item: Halqa) {
    setName(item.name);
    setTeacher(refId(item.teacher));
    setMasjid(refId(item.masjid));
    setSpecialTrack(refId(item.specialTrack));
    setDays(item.days ?? "");
    setTime(item.time ?? "");
    setCapacity(item.capacity ? String(item.capacity) : "");
    setFormError("");
    setModal({ mode: "edit", item });
  }

  async function handleSubmit() {
    if (!name.trim() || !teacher || !masjid || !specialTrack || !days.trim() || !time.trim()) {
      setFormError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setFormError("");
    const body: Record<string, unknown> = {
      name: name.trim(),
      teacher,
      masjid,
      specialTrack,
      days: days.trim(),
      time: time.trim(),
    };
    if (capacity.trim()) body.capacity = Number(capacity);
    try {
      if (modal?.mode === "add") {
        await createHalqa.mutateAsync(body);
      } else if (modal?.mode === "edit") {
        await updateHalqa.mutateAsync({ id: modal.item._id, ...body });
      }
      setModal(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteHalqa.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      setDeleteId(null);
    }
  }

  useTopbar(
    "ti-school",
    "الحلقات",
    <button className="topbar-btn btn-primary" onClick={openAdd}>
      <i className="ti ti-plus" /> حلقة جديدة
    </button>,
  );

  if (isLoading) {
    return <SkeletonList rows={4} avatar={false} />;
  }
  if (error) {
    return <div style={{ color: "#ef4444", padding: 12 }}>تعذّر تحميل الحلقات</div>;
  }

  const isPending = createHalqa.isPending || updateHalqa.isPending;

  return (
    <>
      {halqat.map((h) => (
        <div key={h._id} className="masjid-item">
          <div className="masjid-head" style={{ cursor: "default" }}>
            <span className="masjid-head-title">
              <i className="ti ti-school" />
              {h.name}
              <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 400, marginInlineStart: 6 }}>
                {refName(h.masjid)}
              </span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Badge tone="blue">{toAr(h.studentCount ?? 0)}/{toAr(h.capacity ?? 0)}</Badge>
              <button
                className="topbar-btn btn-ghost"
                style={{ padding: "3px 9px", fontSize: 12 }}
                onClick={() => openEdit(h)}
                title="تعديل"
              >
                <i className="ti ti-pencil" />
              </button>
              <button
                className="topbar-btn btn-ghost"
                style={{ padding: "3px 9px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                onClick={() => setDeleteId(h._id)}
                title="حذف"
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>
          <div className="masjid-body open">
            <div className="halqa-row-item">
              <span className="h-info">
                <i className="ti ti-user" style={{ fontSize: 12 }} /> {refName(h.teacher)}
              </span>
              <span className="h-info">
                <i className="ti ti-calendar-event" style={{ fontSize: 12 }} /> {refTitle(h.specialTrack)}
              </span>
              {h.days && (
                <span className="h-info">
                  <i className="ti ti-calendar" style={{ fontSize: 12 }} /> {h.days}
                </span>
              )}
              {h.time && (
                <span className="h-info">
                  <i className="ti ti-clock" style={{ fontSize: 12 }} /> {h.time}
                </span>
              )}
              <Badge tone="green">حضور {toAr(h.attendancePct ?? 0)}٪</Badge>
              <Badge tone="gold">إنجاز {toAr(h.completionPct ?? 0)}٪</Badge>
            </div>
          </div>
        </div>
      ))}

      {halqat.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)", fontSize: 14 }}>
          <i className="ti ti-school" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
          لا توجد حلقات مسجلة بعد
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div style={OVERLAY} onClick={() => setModal(null)}>
          <div style={DIALOG} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {modal.mode === "add" ? "إضافة حلقة جديدة" : "تعديل بيانات الحلقة"}
              </h3>
              <button className="topbar-btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>

            {formError && (
              <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
                {formError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">اسم الحلقة <span>*</span></label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="حلقة الفجر"
              />
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">المعلم <span>*</span></label>
              <select className="form-input" value={teacher} onChange={(e) => setTeacher(e.target.value)}>
                <option value="">اختر المعلم</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">المسجد <span>*</span></label>
              <select className="form-input" value={masjid} onChange={(e) => setMasjid(e.target.value)}>
                <option value="">اختر المسجد</option>
                {masajid.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">المسار <span>*</span></label>
              <select className="form-input" value={specialTrack} onChange={(e) => setSpecialTrack(e.target.value)}>
                <option value="">اختر المسار</option>
                {tracks.map((t) => (
                  <option key={t._id} value={t._id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">الأيام <span>*</span></label>
              <input
                className="form-input"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="الأحد، الثلاثاء، الخميس"
              />
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">الوقت <span>*</span></label>
              <input
                className="form-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="بعد صلاة العصر"
              />
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">السعة</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="١٥"
              />
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

      {/* Delete Confirmation */}
      {deleteId && (
        <div style={OVERLAY} onClick={() => setDeleteId(null)}>
          <div style={{ ...DIALOG, maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: "#ef4444", display: "block" }} />
              <h3 style={{ margin: "12px 0 6px", fontSize: 16, color: "var(--text)" }}>حذف الحلقة</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>
                سيتم حذف الحلقة نهائياً. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", padding: 10 }}
                onClick={handleDelete}
                disabled={deleteHalqa.isPending}
              >
                <i className="ti ti-trash" />
                {deleteHalqa.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
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
