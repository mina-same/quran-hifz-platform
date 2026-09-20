import { useState } from "react";
import { toast } from "sonner";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { Modal } from "../../components/common/Modal";
import {
  useAdminSupervisors, useCreateSupervisor, useDeleteSupervisor,
  type SupervisorUser,
} from "../../api/admin-supervisors";

type AddForm = { name: string; email: string; password: string; gender: "male" | "female" };
const EMPTY_ADD: AddForm = { name: "", email: "", password: "", gender: "male" };
type CreatedCredentials = { email: string; password: string };

const GENDER_LABEL: Record<"male" | "female", string> = { male: "بنين", female: "بنات" };

export function AdminSupervisors() {
  const { data: supervisors = [], isLoading, error } = useAdminSupervisors();
  const createSupervisor = useCreateSupervisor();
  const deleteSupervisor = useDeleteSupervisor();

  const [showAdd, setShowAdd]         = useState(false);
  const [addForm, setAddForm]         = useState<AddForm>(EMPTY_ADD);
  const [addError, setAddError]       = useState("");
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [deleteItem, setDeleteItem]   = useState<SupervisorUser | null>(null);

  function setAddField<K extends keyof AddForm>(key: K, value: AddForm[K]) {
    setAddForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!addForm.name.trim())  { setAddError("الاسم مطلوب"); return; }
    if (!addForm.email.trim()) { setAddError("البريد الإلكتروني مطلوب"); return; }
    if (!addForm.password)     { setAddError("كلمة المرور مطلوبة"); return; }
    setAddError("");
    try {
      const res = await createSupervisor.mutateAsync({
        name:     addForm.name.trim(),
        email:    addForm.email.trim(),
        password: addForm.password,
        gender:   addForm.gender,
      });
      setShowAdd(false);
      setAddForm(EMPTY_ADD);
      setCredentials(res.credentials);
    } catch (e) {
      setAddError((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteSupervisor.mutateAsync(deleteItem._id);
      setDeleteItem(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  useTopbar(
    "ti-eye-check",
    "المشرفون",
    <button className="topbar-btn btn-primary" onClick={() => { setAddForm(EMPTY_ADD); setAddError(""); setShowAdd(true); }}>
      <i className="ti ti-plus" /> إضافة مشرف
    </button>,
  );

  return (
    <>
      <Card>
        {isLoading && <SkeletonTable cols={4} rows={5} />}
        {error && (
          <div style={{ color: "#ef4444", padding: 12, fontSize: 13 }}>تعذّر تحميل بيانات المشرفين</div>
        )}
        {!isLoading && !error && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد الإلكتروني</th>
                  <th>النطاق</th>
                  <th>الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {supervisors.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ fontSize: 12, direction: "ltr" }}>{s.email}</td>
                    <td><Badge tone={s.gender === "male" ? "blue" : "gold"}>{GENDER_LABEL[s.gender]}</Badge></td>
                    <td>
                      <Badge tone={s.isActive ? "green" : "gray"}>{s.isActive ? "نشط" : "غير نشط"}</Badge>
                    </td>
                    <td>
                      <button
                        className="topbar-btn btn-ghost"
                        style={{ padding: "3px 9px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                        onClick={() => setDeleteItem(s)}
                        title="حذف"
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
                {supervisors.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا يوجد مشرفون مسجلون بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Supervisor Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="إضافة مشرف جديد" maxWidth={440}>
        {addError && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
            {addError}
          </div>
        )}
        <div className="form-grid-2">
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">الاسم الكامل <span>*</span></label>
            <input className="form-input" placeholder="اسم المشرف" value={addForm.name} onChange={(e) => setAddField("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني <span>*</span></label>
            <input className="form-input" type="email" placeholder="supervisor@example.com" dir="ltr" value={addForm.email} onChange={(e) => setAddField("email", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور <span>*</span></label>
            <input className="form-input" type="password" placeholder="6 أحرف على الأقل" dir="ltr" value={addForm.password} onChange={(e) => setAddField("password", e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">النطاق <span>*</span></label>
            <select
              className="form-input"
              value={addForm.gender}
              onChange={(e) => setAddField("gender", e.target.value as AddForm["gender"])}
            >
              <option value="male">بنين</option>
              <option value="female">بنات</option>
            </select>
            <small style={{ fontSize: 11, color: "var(--text3)" }}>
              هذا النطاق ثابت ولا يمكن تغييره بعد إنشاء الحساب
            </small>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            className="topbar-btn btn-primary"
            style={{ flex: 1, justifyContent: "center", padding: 10 }}
            onClick={handleCreate}
            disabled={createSupervisor.isPending}
          >
            <i className="ti ti-check" />
            {createSupervisor.isPending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </button>
          <button className="topbar-btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setShowAdd(false)}>
            إلغاء
          </button>
        </div>
      </Modal>

      {/* Credentials Success Modal */}
      <Modal open={!!credentials} onClose={() => setCredentials(null)} maxWidth={400}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <i className="ti ti-circle-check" style={{ fontSize: 44, color: "#22c55e", display: "block" }} />
          <h3 style={{ margin: "12px 0 4px", fontSize: 16 }}>تم إنشاء حساب المشرف</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>احتفظ ببيانات الدخول وأرسلها للمشرف</p>
        </div>
        {credentials && (
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
        )}
        <button
          className="topbar-btn btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: 10 }}
          onClick={() => setCredentials(null)}
        >
          <i className="ti ti-check" /> حسناً
        </button>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} maxWidth={360}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: "#ef4444", display: "block" }} />
          <h3 style={{ margin: "12px 0 6px", fontSize: 16 }}>حذف المشرف</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>
            سيتم حذف حساب المشرف "{deleteItem?.name}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="topbar-btn btn-primary"
            style={{ flex: 1, justifyContent: "center", background: "#ef4444", padding: 10 }}
            onClick={handleDelete}
            disabled={deleteSupervisor.isPending}
          >
            <i className="ti ti-trash" />
            {deleteSupervisor.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
          </button>
          <button className="topbar-btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setDeleteItem(null)}>
            إلغاء
          </button>
        </div>
      </Modal>
    </>
  );
}
