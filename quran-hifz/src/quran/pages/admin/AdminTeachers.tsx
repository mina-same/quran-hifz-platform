import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { useTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher, type Teacher } from "../../api/teachers";
import { toAr } from "../../../lib/format";

type ModalState = null | { mode: "add" } | { mode: "edit"; item: Teacher };

type FormFields = {
  name: string;
  specialty: string;
  phone: string;
  rating: string;
  status: "active" | "inactive";
  email: string;
  password: string;
  newPassword: string;
};
const EMPTY_FORM: FormFields = { name: "", specialty: "", phone: "", rating: "", status: "active", email: "", password: "", newPassword: "" };

type CreatedCredentials = { email: string; password: string };

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
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal({ mode: "add" });
  }

  function openEdit(item: Teacher) {
    setForm({
      name:        item.name,
      specialty:   item.specialty ?? "",
      phone:       item.phone ?? "",
      rating:      item.rating ?? "",
      status:      item.status,
      email:       item.email ?? "",
      password:    "",
      newPassword: "",
    });
    setFormError("");
    setModal({ mode: "edit", item });
  }

  function setField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setFormError("اسم المعلم مطلوب"); return; }
    if (modal?.mode === "add" && form.email && !form.password) {
      setFormError("يرجى إدخال كلمة المرور مع البريد الإلكتروني");
      return;
    }
    setFormError("");
    const body: Record<string, unknown> = {
      name:      form.name.trim(),
      specialty: form.specialty.trim() || undefined,
      phone:     form.phone.trim() || undefined,
      rating:    form.rating.trim() || undefined,
      status:    form.status,
    };
    if (modal?.mode === "add") {
      if (form.email.trim()) body.email    = form.email.trim();
      if (form.password)     body.password = form.password;
    } else if (modal?.mode === "edit") {
      if (form.email.trim())      body.email       = form.email.trim();
      if (form.newPassword.trim()) body.newPassword = form.newPassword.trim();
    }
    try {
      if (modal?.mode === "add") {
        const res = await createTeacher.mutateAsync(body);
        setModal(null);
        if (res.credentials) setCredentials(res.credentials);
      } else if (modal?.mode === "edit") {
        await updateTeacher.mutateAsync({ id: modal.item._id, ...body });
        setModal(null);
      }
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
        {isLoading && <SkeletonTable cols={8} rows={5} />}
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
          <div style={{ ...DIALOG, maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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

              {modal.mode === "add" && (
                <>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 12px", paddingTop: 12 }}>
                      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>
                        <i className="ti ti-lock" style={{ marginLeft: 4 }} />
                        بيانات الدخول (اختياري — لمنح المعلم حساباً في النظام)
                      </p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">البريد الإلكتروني</label>
                    <input className="form-input" type="email" placeholder="teacher@example.com" dir="ltr" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">كلمة المرور</label>
                    <input className="form-input" type="password" placeholder="6 أحرف على الأقل" dir="ltr" value={form.password} onChange={(e) => setField("password", e.target.value)} />
                  </div>
                </>
              )}

              {modal.mode === "edit" && (
                <>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 12px", paddingTop: 12 }}>
                      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>
                        <i className="ti ti-lock" style={{ marginLeft: 4 }} />
                        بيانات الدخول
                        {!form.email && <span style={{ fontWeight: 400, marginRight: 6 }}>— لا يوجد حساب بعد</span>}
                      </p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">البريد الإلكتروني</label>
                    <input className="form-input" type="email" placeholder="teacher@example.com" dir="ltr" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">كلمة مرور جديدة</label>
                    <input className="form-input" type="password" placeholder="اتركه فارغاً إن لم تُرد تغييرها" dir="ltr" value={form.newPassword} onChange={(e) => setField("newPassword", e.target.value)} />
                  </div>
                </>
              )}
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

      {/* Credentials Success Modal */}
      {credentials && (
        <div style={OVERLAY} onClick={() => setCredentials(null)}>
          <div style={{ ...DIALOG, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 44, color: "#22c55e", display: "block" }} />
              <h3 style={{ margin: "12px 0 4px", fontSize: 16 }}>تم إنشاء حساب المعلم</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>
                احتفظ ببيانات الدخول وأرسلها للمعلم
              </p>
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ marginBottom: 10 }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>البريد الإلكتروني</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, direction: "ltr", textAlign: "left" }}>{credentials.email}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>كلمة المرور</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, direction: "ltr", textAlign: "left" }}>{credentials.password}</p>
              </div>
            </div>
            <button
              className="topbar-btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: 10 }}
              onClick={() => setCredentials(null)}
            >
              <i className="ti ti-check" /> حسناً
            </button>
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
