import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher, type Teacher } from "../../api/teachers";
import { toAr } from "../../../lib/format";

type ModalState = null | { mode: "add" } | { mode: "edit"; item: Teacher };

type FormFields = {
  name: string;
  specialty: string;
  phone: string;
  rating: string;
  status: "active" | "inactive";
};
const EMPTY_FORM: FormFields = { name: "", specialty: "", phone: "", rating: "", status: "active" };

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
};
const DIALOG: React.CSSProperties = {
  background: "white", borderRadius: 12, padding: 24, width: "100%", maxWidth: 440,
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

export function AdminTeachers() {
  const { data: teachers = [], isLoading, error } = useTeachers();
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const deleteTeacher = useDeleteTeacher();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal({ mode: "add" });
  }

  function openEdit(item: Teacher) {
    setForm({
      name:      item.name,
      specialty: item.specialty ?? "",
      phone:     item.phone ?? "",
      rating:    item.rating ?? "",
      status:    item.status,
    });
    setFormError("");
    setModal({ mode: "edit", item });
  }

  function setField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setFormError("اسم المعلم مطلوب"); return; }
    setFormError("");
    const body = {
      name:      form.name.trim(),
      specialty: form.specialty.trim() || undefined,
      phone:     form.phone.trim() || undefined,
      rating:    form.rating.trim() || undefined,
      status:    form.status,
    };
    try {
      if (modal?.mode === "add") {
        await createTeacher.mutateAsync(body);
      } else if (modal?.mode === "edit") {
        await updateTeacher.mutateAsync({ id: modal.item._id, ...body });
      }
      setModal(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await deleteTeacher.mutateAsync(deleteId); }
    finally { setDeleteId(null); }
  }

  useTopbar(
    "ti-chalkboard",
    "المعلمون",
    <button className="topbar-btn btn-primary" onClick={openAdd}>
      <i className="ti ti-plus" /> إضافة معلم
    </button>,
  );

  const isPending = createTeacher.isPending || updateTeacher.isPending;

  return (
    <>
      <Card>
        {isLoading && (
          <div className="page-loading"><i className="ti ti-loader-2" /> جارٍ التحميل...</div>
        )}
        {error && (
          <div style={{ color: "#ef4444", padding: 12, fontSize: 13 }}>تعذّر تحميل بيانات المعلمين</div>
        )}
        {!isLoading && !error && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>التخصص</th>
                  <th>الجوال</th>
                  <th>الحلقات</th>
                  <th>الطلاب</th>
                  <th>التقييم</th>
                  <th>الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t._id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td><Badge tone="blue">{t.specialty || "—"}</Badge></td>
                    <td style={{ fontSize: 12, direction: "ltr" }}>{t.phone || "—"}</td>
                    <td>{toAr(t.halqatCount ?? 0)}</td>
                    <td>{toAr(t.studentCount ?? 0)}</td>
                    <td>{t.rating || "—"}</td>
                    <td>
                      <Badge tone={t.status === "active" ? "green" : "gray"}>
                        {t.status === "active" ? "نشط" : "غير نشط"}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="topbar-btn btn-ghost"
                          style={{ padding: "3px 9px", fontSize: 12 }}
                          onClick={() => openEdit(t)}
                          title="تعديل"
                        >
                          <i className="ti ti-pencil" />
                        </button>
                        <button
                          className="topbar-btn btn-ghost"
                          style={{ padding: "3px 9px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                          onClick={() => setDeleteId(t._id)}
                          title="حذف"
                        >
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا يوجد معلمون مسجلون
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      {modal && (
        <div style={OVERLAY} onClick={() => setModal(null)}>
          <div style={DIALOG} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {modal.mode === "add" ? "إضافة معلم جديد" : "تعديل بيانات المعلم"}
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

            <div className="form-grid-2">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">الاسم الكامل <span>*</span></label>
                <input className="form-input" placeholder="اسم المعلم" value={form.name} onChange={(e) => setField("name", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">التخصص</label>
                <input className="form-input" placeholder="تجويد، حفظ، قراءات" value={form.specialty} onChange={(e) => setField("specialty", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الجوال</label>
                <input className="form-input" type="tel" placeholder="05XXXXXXXX" dir="ltr" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">التقييم</label>
                <input className="form-input" placeholder="مثال: 4.5/5" dir="ltr" value={form.rating} onChange={(e) => setField("rating", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={(e) => setField("status", e.target.value as "active" | "inactive")}>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
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

      {/* Delete Confirmation */}
      {deleteId && (
        <div style={OVERLAY} onClick={() => setDeleteId(null)}>
          <div style={{ ...DIALOG, maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: "#ef4444", display: "block" }} />
              <h3 style={{ margin: "12px 0 6px", fontSize: 16 }}>حذف المعلم</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>
                سيتم حذف المعلم نهائياً. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", padding: 10 }}
                onClick={handleDelete}
                disabled={deleteTeacher.isPending}
              >
                <i className="ti ti-trash" />
                {deleteTeacher.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
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
