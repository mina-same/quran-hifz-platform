import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { SkeletonTable } from "../../components/common/Skeleton";
import { Modal } from "../../components/common/Modal";
import {
  useAdminParents, useCreateParent, useUpdateParent, useLinkChild, useUnlinkChild,
  type ParentUser,
} from "../../api/admin-parents";
import { useStudents } from "../../api/students";

type AddForm = { name: string; email: string; password: string };
const EMPTY_ADD: AddForm = { name: "", email: "", password: "" };

type EditForm = { name: string; email: string; newPassword: string };
type CreatedCredentials = { email: string; password: string };

export function AdminParents() {
  const { data: parents = [], isLoading, error } = useAdminParents();
  const { data: students = [] } = useStudents();
  const createParent = useCreateParent();
  const updateParent = useUpdateParent();
  const linkChild    = useLinkChild();
  const unlinkChild  = useUnlinkChild();

  const [showAdd, setShowAdd]         = useState(false);
  const [addForm, setAddForm]         = useState<AddForm>(EMPTY_ADD);
  const [addError, setAddError]       = useState("");
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);

  const [editItem, setEditItem]   = useState<ParentUser | null>(null);
  const [editForm, setEditForm]   = useState<EditForm>({ name: "", email: "", newPassword: "" });
  const [editError, setEditError] = useState("");

  const [linkParent, setLinkParent]           = useState<ParentUser | null>(null);
  const [selectedStudent, setSelectedStudent] = useState("");

  function setAddField<K extends keyof AddForm>(key: K, value: string) {
    setAddForm((prev) => ({ ...prev, [key]: value }));
  }
  function setEditField<K extends keyof EditForm>(key: K, value: string) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  function openEdit(p: ParentUser) {
    setEditForm({ name: p.name, email: p.email, newPassword: "" });
    setEditError("");
    setEditItem(p);
  }

  async function handleCreate() {
    if (!addForm.name.trim())  { setAddError("الاسم مطلوب"); return; }
    if (!addForm.email.trim()) { setAddError("البريد الإلكتروني مطلوب"); return; }
    if (!addForm.password)     { setAddError("كلمة المرور مطلوبة"); return; }
    setAddError("");
    try {
      const res = await createParent.mutateAsync({
        name:     addForm.name.trim(),
        email:    addForm.email.trim(),
        password: addForm.password,
      });
      setShowAdd(false);
      setAddForm(EMPTY_ADD);
      setCredentials(res.credentials);
    } catch (e) {
      setAddError((e as Error).message);
    }
  }

  async function handleUpdate() {
    if (!editForm.name.trim()) { setEditError("الاسم مطلوب"); return; }
    setEditError("");
    try {
      await updateParent.mutateAsync({
        parentId:    editItem!._id,
        name:        editForm.name.trim(),
        email:       editForm.email.trim() || undefined,
        newPassword: editForm.newPassword.trim() || undefined,
      });
      setEditItem(null);
    } catch (e) {
      setEditError((e as Error).message);
    }
  }

  async function handleLink() {
    if (!linkParent || !selectedStudent) return;
    try {
      await linkChild.mutateAsync({ parentId: linkParent._id, studentId: selectedStudent });
      setSelectedStudent("");
    } catch { /* already linked */ }
  }

  async function handleUnlink(parentId: string, studentId: string) {
    await unlinkChild.mutateAsync({ parentId, studentId });
  }

  const linkedStudentIds   = new Set(linkParent?.children.map((c) => c._id) ?? []);
  const availableStudents  = students.filter((s) => !linkedStudentIds.has(s._id));

  useTopbar(
    "ti-user-heart",
    "أولياء الأمور",
    <button className="topbar-btn btn-primary" onClick={() => { setAddForm(EMPTY_ADD); setAddError(""); setShowAdd(true); }}>
      <i className="ti ti-plus" /> إضافة ولي أمر
    </button>,
  );

  return (
    <>
      <Card>
        {isLoading && <SkeletonTable cols={5} rows={5} />}
        {error && (
          <div style={{ color: "#ef4444", padding: 12, fontSize: 13 }}>تعذّر تحميل بيانات أولياء الأمور</div>
        )}
        {!isLoading && !error && (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الأبناء المرتبطون</th>
                    <th>الحالة</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {parents.map((p) => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontSize: 12, direction: "ltr" }}>{p.email}</td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {p.children.length === 0 && (
                            <span style={{ fontSize: 12, color: "var(--text3)" }}>لا يوجد أبناء</span>
                          )}
                          {p.children.map((c) => (
                            <span
                              key={c._id}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                fontSize: 11, background: "var(--bg2)", borderRadius: 6,
                                padding: "2px 8px", border: "1px solid var(--border)",
                              }}
                            >
                              {c.name}
                              <button
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, lineHeight: 1, fontSize: 12 }}
                                title="إلغاء الربط"
                                onClick={() => handleUnlink(p._id, c._id)}
                              >
                                <i className="ti ti-x" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Badge tone={p.isActive ? "green" : "gray"}>
                          {p.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="topbar-btn btn-ghost"
                            style={{ padding: "3px 9px", fontSize: 12 }}
                            onClick={() => openEdit(p)}
                            title="تعديل"
                          >
                            <i className="ti ti-pencil" />
                          </button>
                          <button
                            className="topbar-btn btn-ghost"
                            style={{ padding: "3px 9px", fontSize: 12 }}
                            onClick={() => { setLinkParent(p); setSelectedStudent(""); }}
                            title="ربط ابن"
                          >
                            <i className="ti ti-user-plus" /> ربط
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {parents.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                        لا يوجد أولياء أمور مسجلون
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="rc-list">
              {parents.map((p) => (
                <div key={p._id} className="rc-card">
                  <div className="rc-card-head">
                    <span className="rc-card-title">{p.name}</span>
                    <Badge tone={p.isActive ? "green" : "gray"}>{p.isActive ? "نشط" : "غير نشط"}</Badge>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">البريد الإلكتروني</span>
                    <span style={{ direction: "ltr" }}>{p.email}</span>
                  </div>
                  <div className="rc-row">
                    <span className="rc-row-label">الأبناء</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
                      {p.children.length === 0 && (
                        <span style={{ fontSize: 12, color: "var(--text3)" }}>لا يوجد أبناء</span>
                      )}
                      {p.children.map((c) => (
                        <span
                          key={c._id}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 11, background: "var(--bg2)", borderRadius: 6,
                            padding: "2px 8px", border: "1px solid var(--border)",
                          }}
                        >
                          {c.name}
                          <button
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, lineHeight: 1, fontSize: 12 }}
                            title="إلغاء الربط"
                            onClick={() => handleUnlink(p._id, c._id)}
                          >
                            <i className="ti ti-x" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rc-actions">
                    <button
                      className="topbar-btn btn-ghost"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => openEdit(p)}
                    >
                      <i className="ti ti-pencil" /> تعديل
                    </button>
                    <button
                      className="topbar-btn btn-ghost"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => { setLinkParent(p); setSelectedStudent(""); }}
                    >
                      <i className="ti ti-user-plus" /> ربط
                    </button>
                  </div>
                </div>
              ))}
              {parents.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                  لا يوجد أولياء أمور مسجلون
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Add Parent Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="إضافة ولي أمر جديد" maxWidth={440}>
        {addError && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
            {addError}
          </div>
        )}
        <div className="form-grid-2">
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">الاسم الكامل <span>*</span></label>
            <input className="form-input" placeholder="اسم ولي الأمر" value={addForm.name} onChange={(e) => setAddField("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني <span>*</span></label>
            <input className="form-input" type="email" placeholder="parent@example.com" dir="ltr" value={addForm.email} onChange={(e) => setAddField("email", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور <span>*</span></label>
            <input className="form-input" type="password" placeholder="6 أحرف على الأقل" dir="ltr" value={addForm.password} onChange={(e) => setAddField("password", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            className="topbar-btn btn-primary"
            style={{ flex: 1, justifyContent: "center", padding: 10 }}
            onClick={handleCreate}
            disabled={createParent.isPending}
          >
            <i className="ti ti-check" />
            {createParent.isPending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </button>
          <button className="topbar-btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setShowAdd(false)}>
            إلغاء
          </button>
        </div>
      </Modal>

      {/* Edit Parent Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="تعديل بيانات ولي الأمر" maxWidth={440}>
        {editError && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
            {editError}
          </div>
        )}
        <div className="form-grid-2">
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">الاسم الكامل <span>*</span></label>
            <input className="form-input" value={editForm.name} onChange={(e) => setEditField("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input className="form-input" type="email" dir="ltr" value={editForm.email} onChange={(e) => setEditField("email", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة مرور جديدة</label>
            <input className="form-input" type="password" placeholder="اتركه فارغاً إن لم تُرد تغييرها" dir="ltr" value={editForm.newPassword} onChange={(e) => setEditField("newPassword", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            className="topbar-btn btn-primary"
            style={{ flex: 1, justifyContent: "center", padding: 10 }}
            onClick={handleUpdate}
            disabled={updateParent.isPending}
          >
            <i className="ti ti-check" />
            {updateParent.isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
          <button className="topbar-btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setEditItem(null)}>
            إلغاء
          </button>
        </div>
      </Modal>

      {/* Credentials Success Modal */}
      <Modal open={!!credentials} onClose={() => setCredentials(null)} maxWidth={400}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <i className="ti ti-circle-check" style={{ fontSize: 44, color: "#22c55e", display: "block" }} />
          <h3 style={{ margin: "12px 0 4px", fontSize: 16 }}>تم إنشاء حساب ولي الأمر</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>احتفظ ببيانات الدخول وأرسلها لولي الأمر</p>
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

      {/* Link Child Modal */}
      <Modal
        open={!!linkParent}
        onClose={() => setLinkParent(null)}
        title={linkParent ? `ربط طالب بـ ${linkParent.name}` : ""}
        maxWidth={400}
      >
        {linkParent && linkParent.children.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>الأبناء الحاليون:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {linkParent.children.map((c) => (
                <span
                  key={c._id}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 12, background: "var(--bg2)", borderRadius: 8,
                    padding: "4px 10px", border: "1px solid var(--border)",
                  }}
                >
                  {c.name}
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, fontSize: 12 }}
                    onClick={() => handleUnlink(linkParent._id, c._id)}
                  >
                    <i className="ti ti-x" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">اختر الطالب</label>
          <select className="form-input" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
            <option value="">— اختر طالباً —</option>
            {availableStudents.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            className="topbar-btn btn-primary"
            style={{ flex: 1, justifyContent: "center", padding: 10 }}
            onClick={handleLink}
            disabled={!selectedStudent || linkChild.isPending}
          >
            <i className="ti ti-link" />
            {linkChild.isPending ? "جارٍ الربط..." : "ربط"}
          </button>
          <button className="topbar-btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setLinkParent(null)}>
            إغلاق
          </button>
        </div>
      </Modal>
    </>
  );
}
