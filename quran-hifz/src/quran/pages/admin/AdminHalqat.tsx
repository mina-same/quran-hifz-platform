import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { HalqaRow } from "../../components/common/HalqaRow";
import { SkeletonCardGrid } from "../../components/common/Skeleton";
import { Modal } from "../../components/common/Modal";
import {
  useHalqat,
  useCreateHalqa,
  useUpdateHalqa,
  useDeleteHalqa,
  type Halqa,
} from "../../api/halqat";
import { useMasajid } from "../../api/masajid";
import { useTeachers } from "../../api/teachers";
import { toAr } from "../../../lib/format";

type ModalState = null | { mode: "add" } | { mode: "edit"; item: Halqa };

type FormFields = {
  name: string;
  teacherId: string;
  masjidId: string;
  days: string;
  time: string;
  capacity: string;
};

const EMPTY_FORM: FormFields = { name: "", teacherId: "", masjidId: "", days: "", time: "", capacity: "" };

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "";
}

function getId(v: unknown): string {
  if (v && typeof v === "object" && "_id" in v) return (v as { _id: string })._id;
  if (typeof v === "string") return v;
  return "";
}

function getLevel(pct: number): { label: string; tone: BadgeTone } {
  if (pct >= 75) return { label: "الحلقة المتميزة", tone: "gold" };
  if (pct >= 55) return { label: "الحفظ العام", tone: "green" };
  if (pct >= 35) return { label: "التلقين", tone: "blue" };
  return { label: "البراعم", tone: "blue" };
}

export function AdminHalqat() {
  const { data: halqat = [], isLoading, error } = useHalqat();
  const { data: masajid = [] } = useMasajid();
  const { data: teachers = [] } = useTeachers();
  const createHalqa = useCreateHalqa();
  const updateHalqa = useUpdateHalqa();
  const deleteHalqa = useDeleteHalqa();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal({ mode: "add" });
  }

  function openEdit(item: Halqa) {
    setForm({
      name: item.name,
      teacherId: getId(item.teacher),
      masjidId: getId(item.masjid),
      days: item.days,
      time: item.time,
      capacity: String(item.capacity ?? ""),
    });
    setFormError("");
    setModal({ mode: "edit", item });
  }

  function setField(key: keyof FormFields, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const { name, teacherId, masjidId, days, time, capacity } = form;
    if (!name.trim() || !teacherId || !masjidId || !days.trim() || !time.trim()) {
      setFormError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setFormError("");
    const body = {
      name: name.trim(),
      teacher: teacherId,
      masjid: masjidId,
      days: days.trim(),
      time: time.trim(),
      ...(capacity ? { capacity: Number(capacity) } : {}),
    };
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
    } finally {
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
    return <SkeletonCardGrid count={6} lines={4} />;
  }
  if (error) {
    return <div style={{ color: "#ef4444", padding: 12 }}>تعذّر تحميل الحلقات</div>;
  }

  const occupancyPct = (h: { studentCount?: number; capacity: number }) =>
    h.capacity > 0 ? Math.round(((h.studentCount ?? 0) / h.capacity) * 100) : 0;

  const isPending = createHalqa.isPending || updateHalqa.isPending;

  return (
    <>
      <div className="halqa-grid">
        {halqat.map((h) => {
          const occ = occupancyPct(h);
          const lvl = getLevel(h.completionPct ?? 0);
          return (
            <div key={h._id} className="halqa-card">
              <div className="halqa-card-head">
                <span className="halqa-card-name">{h.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Badge tone={lvl.tone}>{lvl.label}</Badge>
                  <button
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "none",
                      borderRadius: 6,
                      color: "white",
                      cursor: "pointer",
                      padding: "3px 7px",
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                    onClick={() => openEdit(h)}
                    title="تعديل"
                  >
                    <i className="ti ti-pencil" />
                  </button>
                  <button
                    style={{
                      background: "rgba(239,68,68,0.25)",
                      border: "none",
                      borderRadius: 6,
                      color: "white",
                      cursor: "pointer",
                      padding: "3px 7px",
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                    onClick={() => setDeleteId(h._id)}
                    title="حذف"
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
              <div className="halqa-card-body">
                <HalqaRow label="المعلم" value={getName(h.teacher)} />
                <HalqaRow label="المسجد" value={getName(h.masjid)} />
                <HalqaRow label="المواعيد" value={h.days} valueStyle={{ fontSize: 11 }} />
                <HalqaRow label="الإشغال" value={`${toAr(h.studentCount ?? 0)} / ${toAr(h.capacity)}`} />
                <ProgressBar pct={occ} />
                <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 2 }}>{toAr(occ)}٪ إشغال</div>
              </div>
            </div>
          );
        })}
      </div>

      {halqat.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)", fontSize: 14 }}>
          <i className="ti ti-school" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
          لا توجد حلقات مسجلة بعد
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "add" ? "إضافة حلقة جديدة" : "تعديل بيانات الحلقة"}
        maxWidth={480}
      >
        {formError && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
            {formError}
          </div>
        )}

        <div className="form-grid-2">
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">اسم الحلقة <span>*</span></label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="حلقة النور"
            />
          </div>

          <div className="form-group">
            <label className="form-label">المعلم <span>*</span></label>
            <select className="form-input" value={form.teacherId} onChange={(e) => setField("teacherId", e.target.value)}>
              <option value="">اختر المعلم</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">المسجد <span>*</span></label>
            <select className="form-input" value={form.masjidId} onChange={(e) => setField("masjidId", e.target.value)}>
              <option value="">اختر المسجد</option>
              {masajid.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">الأيام <span>*</span></label>
            <input
              className="form-input"
              value={form.days}
              onChange={(e) => setField("days", e.target.value)}
              placeholder="السبت - الاثنين - الأربعاء"
            />
          </div>

          <div className="form-group">
            <label className="form-label">الوقت <span>*</span></label>
            <input
              className="form-input"
              value={form.time}
              onChange={(e) => setField("time", e.target.value)}
              placeholder="17:00 - 18:30"
              dir="ltr"
            />
          </div>

          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">الطاقة الاستيعابية</label>
            <input
              className="form-input"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setField("capacity", e.target.value)}
              placeholder="20"
            />
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
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth={360}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: "#ef4444", display: "block" }} />
          <h3 style={{ margin: "12px 0 6px", fontSize: 16, color: "var(--text)" }}>حذف الحلقة</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>
            سيتم حذف الحلقة نهائياً وهذا الإجراء لا يمكن التراجع عنه.
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
      </Modal>
    </>
  );
}
