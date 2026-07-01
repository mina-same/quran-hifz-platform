import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Badge } from "../../components/common/Badge";
import {
  useMasajid,
  useCreateMasjid,
  useUpdateMasjid,
  useDeleteMasjid,
  type Masjid,
} from "../../api/masajid";
import { toAr } from "../../../lib/format";

type ModalState = null | { mode: "add" } | { mode: "edit"; item: Masjid };

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

export function AdminMasajid() {
  const { data: masajid = [], isLoading, error } = useMasajid();
  const createMasjid = useCreateMasjid();
  const updateMasjid = useUpdateMasjid();
  const deleteMasjid = useDeleteMasjid();

  const [open, setOpen] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [formError, setFormError] = useState("");

  function openAdd() {
    setName("");
    setLocation("");
    setFormError("");
    setModal({ mode: "add" });
  }

  function openEdit(item: Masjid) {
    setName(item.name);
    setLocation(item.location);
    setFormError("");
    setModal({ mode: "edit", item });
  }

  async function handleSubmit() {
    if (!name.trim() || !location.trim()) {
      setFormError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setFormError("");
    try {
      if (modal?.mode === "add") {
        await createMasjid.mutateAsync({ name: name.trim(), location: location.trim() });
      } else if (modal?.mode === "edit") {
        await updateMasjid.mutateAsync({ id: modal.item._id, name: name.trim(), location: location.trim() });
      }
      setModal(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMasjid.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      setDeleteId(null);
    }
  }

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useTopbar(
    "ti-building-arch",
    "المساجد والحلقات",
    <button className="topbar-btn btn-primary" onClick={openAdd}>
      <i className="ti ti-plus" /> مسجد جديد
    </button>,
  );

  if (isLoading) {
    return (
      <div className="page-loading">
        <i className="ti ti-loader-2" /> جارٍ التحميل...
      </div>
    );
  }
  if (error) {
    return <div style={{ color: "#ef4444", padding: 12 }}>تعذّر تحميل المساجد</div>;
  }

  const isPending = createMasjid.isPending || updateMasjid.isPending;

  return (
    <>
      {masajid.map((m) => (
        <div key={m._id} className="masjid-item">
          <div className="masjid-head" onClick={() => toggle(m._id)}>
            <span className="masjid-head-title">
              <i className="ti ti-building-arch" />
              {m.name}
              <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 400, marginInlineStart: 6 }}>
                {m.location}
              </span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Badge tone="green">{toAr(m.halqat?.length ?? 0)} حلقات</Badge>
              <button
                className="topbar-btn btn-ghost"
                style={{ padding: "3px 9px", fontSize: 12 }}
                onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                title="تعديل"
              >
                <i className="ti ti-pencil" />
              </button>
              <button
                className="topbar-btn btn-ghost"
                style={{ padding: "3px 9px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                onClick={(e) => { e.stopPropagation(); setDeleteId(m._id); }}
                title="حذف"
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>
          <div className={`masjid-body${open.has(m._id) ? " open" : ""}`}>
            {(m.halqat ?? []).map((h) => (
              <div key={h._id} className="halqa-row-item">
                <span className="h-name">{h.name}</span>
                <Badge tone="blue">{toAr(h.studentCount ?? 0)}/{toAr(h.capacity ?? 0)}</Badge>
                {h.time && (
                  <span className="h-info">
                    <i className="ti ti-clock" style={{ fontSize: 12 }} /> {h.time}
                  </span>
                )}
              </div>
            ))}
            {!m.halqat?.length && (
              <div style={{ padding: "10px 16px", color: "var(--text3)", fontSize: 13 }}>
                لا توجد حلقات مسجلة
              </div>
            )}
          </div>
        </div>
      ))}

      {masajid.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)", fontSize: 14 }}>
          <i className="ti ti-building-arch" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
          لا توجد مساجد مسجلة بعد
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div style={OVERLAY} onClick={() => setModal(null)}>
          <div style={DIALOG} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {modal.mode === "add" ? "إضافة مسجد جديد" : "تعديل بيانات المسجد"}
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
              <label className="form-label">اسم المسجد <span>*</span></label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مسجد النور"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">الموقع <span>*</span></label>
              <input
                className="form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="حي السلام، الرياض"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
              <h3 style={{ margin: "12px 0 6px", fontSize: 16, color: "var(--text)" }}>حذف المسجد</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>
                سيتم حذف المسجد نهائياً. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", padding: 10 }}
                onClick={handleDelete}
                disabled={deleteMasjid.isPending}
              >
                <i className="ti ti-trash" />
                {deleteMasjid.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
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
