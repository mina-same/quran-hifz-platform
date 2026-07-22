import { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { ProgressBar } from "../../components/common/ProgressBar";
import { SkeletonTable } from "../../components/common/Skeleton";
import { useStudents, useUpdateStudent, useDeleteStudent, type Student } from "../../api/students";
import { useHalqat } from "../../api/halqat";
import { useMasajid } from "../../api/masajid";
import { useAdminParents, useStudentParent, useSetStudentParent } from "../../api/admin-parents";
import { toAr, pct } from "../../../lib/format";

const PATH_TONE: Record<string, BadgeTone> = {
  "حفظ كامل": "gold",
  "عشرون جزءاً": "green",
  "عشرة أجزاء": "blue",
  "خمسة أجزاء": "blue",
};

function getObjName(h: unknown): string {
  if (h && typeof h === "object" && "name" in h) return (h as { name: string }).name;
  return "";
}
function getObjId(h: unknown): string {
  if (h && typeof h === "object" && "_id" in h) return (h as { _id: string })._id;
  if (typeof h === "string") return h;
  return "";
}

type EditFormFields = {
  name: string;
  path: string;
  level: string;
  halqa: string;
  masjid: string;
  guardianPhone: string;
  status: "active" | "inactive" | "new";
  email: string;
  password: string;
};

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
};
const DIALOG: React.CSSProperties = {
  background: "white", borderRadius: 12, padding: 24, width: "100%", maxWidth: 480,
  maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

export function AdminStudents() {
  const { showPage } = usePortal();
  const { data: students = [], isLoading, error } = useStudents();
  const { data: halqat = [] } = useHalqat();
  const { data: masajid = [] } = useMasajid();
  const { data: parents = [] } = useAdminParents();
  const updateStudent    = useUpdateStudent();
  const deleteStudent    = useDeleteStudent();
  const setStudentParent = useSetStudentParent();

  const [search, setSearch] = useState("");
  const [pathFilter, setPathFilter] = useState("");
  const [editItem, setEditItem] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormFields>({ name: "", path: "", level: "", halqa: "", masjid: "", guardianPhone: "", status: "active", email: "", password: "" });
  const [formError, setFormError] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  const { data: currentParent, isLoading: parentLoading } = useStudentParent(editItem?._id ?? null);

  function openEdit(s: Student) {
    setForm({
      name:          s.name,
      path:          s.path,
      level:         s.level != null ? String(s.level) : "",
      halqa:         getObjId(s.halqa),
      masjid:        getObjId(s.masjid),
      guardianPhone: s.guardianPhone,
      status:        s.status,
      email:         s.email ?? "",
      password:      "",
    });
    setSelectedParentId("");
    setFormError("");
    setEditItem(s);
  }

  function setField<K extends keyof EditFormFields>(key: K, value: EditFormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpdate() {
    if (!form.name.trim()) { setFormError("الاسم مطلوب"); return; }
    if (form.email.trim() && !form.password && !editItem?.email) {
      setFormError("يرجى إدخال كلمة المرور لمنح الطالب حساباً جديداً");
      return;
    }
    setFormError("");
    try {
      await updateStudent.mutateAsync({
        id:            editItem!._id,
        name:          form.name.trim(),
        path:          form.path,
        halqa:         form.halqa || undefined,
        masjid:        form.masjid || undefined,
        guardianPhone: form.guardianPhone.trim(),
        status:        form.status,
        ...(form.level.trim() && { level: Number(form.level) }),
        ...(form.email.trim()  && { email:    form.email.trim() }),
        ...(form.password      && { password: form.password }),
      });
      if (selectedParentId !== "") {
        await setStudentParent.mutateAsync({
          studentId: editItem!._id,
          parentId:  selectedParentId === "null" ? null : selectedParentId,
        });
      }
      setEditItem(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await deleteStudent.mutateAsync(deleteId); }
    finally { setDeleteId(null); }
  }

  useTopbar(
    "ti-users",
    "إدارة الطلاب",
    <>
      <button className="topbar-btn btn-ghost">
        <i className="ti ti-filter" /> تصفية
      </button>
      <button className="topbar-btn btn-primary" onClick={() => showPage("register")}>
        <i className="ti ti-user-plus" /> تسجيل جديد
      </button>
    </>,
  );

  const filtered = students.filter((s) => {
    const matchSearch = !search || s.name.includes(search);
    const matchPath = !pathFilter || s.path === pathFilter;
    return matchSearch && matchPath;
  });

  return (
    <>
      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="البحث باسم الطالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input"
            style={{ width: 170 }}
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
          >
            <option value="">كل المسارات</option>
            <option>حفظ كامل</option>
            <option>عشرون جزءاً</option>
            <option>عشرة أجزاء</option>
            <option>خمسة أجزاء</option>
          </select>
        </div>

        {isLoading && <SkeletonTable cols={9} rows={6} />}
        {error && (
          <div style={{ color: "#ef4444", padding: 12, fontSize: 13 }}>تعذّر تحميل بيانات الطلاب</div>
        )}

        {!isLoading && !error && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>المسار</th>
                  <th>المستوى</th>
                  <th>الحلقة</th>
                  <th>المسجد</th>
                  <th>الحضور</th>
                  <th>التقدم</th>
                  <th>ولي الأمر</th>
                  <th>الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><Badge tone={PATH_TONE[s.path] ?? "blue"}>{s.path}</Badge></td>
                    <td>{s.level != null ? toAr(s.level) : "—"}</td>
                    <td>{getObjName(s.halqa)}</td>
                    <td>{getObjName(s.masjid)}</td>
                    <td>{pct(s.attendancePct)}</td>
                    <td style={{ minWidth: 90 }}>
                      <ProgressBar pct={s.progressPct} />
                      <span style={{ fontSize: 10, color: "var(--text2)" }}>{pct(s.progressPct)}</span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }} dir="ltr">{s.guardianPhone}</td>
                    <td>
                      <Badge tone={s.status === "active" ? "green" : s.status === "new" ? "gold" : "gray"}>
                        {s.status === "active" ? "نشط" : s.status === "new" ? "جديد" : "غير نشط"}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button
                          className="topbar-btn btn-ghost"
                          style={{ padding: "3px 8px", fontSize: 12 }}
                          onClick={() => openEdit(s)}
                          title="تعديل"
                        >
                          <i className="ti ti-pencil" />
                        </button>
                        <button
                          className="topbar-btn btn-ghost"
                          style={{ padding: "3px 8px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                          onClick={() => setDeleteId(s._id)}
                          title="حذف"
                        >
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا توجد نتائج
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      {editItem && (
        <div style={OVERLAY} onClick={() => setEditItem(null)}>
          <div style={DIALOG} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                تعديل بيانات الطالب
              </h3>
              <button className="topbar-btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setEditItem(null)}>
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
                <input className="form-input" value={form.name} onChange={(e) => setField("name", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">المسار</label>
                <select className="form-input" value={form.path} onChange={(e) => setField("path", e.target.value)}>
                  <option value="">اختر المسار</option>
                  <option value="حفظ كامل">حفظ كامل</option>
                  <option value="عشرون جزءاً">عشرون جزءاً</option>
                  <option value="عشرة أجزاء">عشرة أجزاء</option>
                  <option value="خمسة أجزاء">خمسة أجزاء</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المستوى (رقم من ١ إلى ١٠)</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={10}
                  placeholder="مثال: ٣"
                  value={form.level}
                  onChange={(e) => setField("level", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={(e) => setField("status", e.target.value as EditFormFields["status"])}>
                  <option value="active">نشط</option>
                  <option value="new">جديد</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">الحلقة</label>
                <select className="form-input" value={form.halqa} onChange={(e) => setField("halqa", e.target.value)}>
                  <option value="">اختر الحلقة</option>
                  {halqat.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المسجد</label>
                <select className="form-input" value={form.masjid} onChange={(e) => setField("masjid", e.target.value)}>
                  <option value="">اختر المسجد</option>
                  {masajid.map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">جوال ولي الأمر</label>
                <input className="form-input" type="tel" dir="ltr" placeholder="05XXXXXXXX" value={form.guardianPhone} onChange={(e) => setField("guardianPhone", e.target.value)} />
              </div>

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
                <input className="form-input" type="email" placeholder="student@example.com" dir="ltr" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{editItem?.email ? "كلمة مرور جديدة" : "كلمة المرور"}</label>
                <input className="form-input" type="password" placeholder={editItem?.email ? "اتركه فارغاً إن لم تُرد تغييرها" : "6 أحرف على الأقل"} dir="ltr" value={form.password} onChange={(e) => setField("password", e.target.value)} />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 12px", paddingTop: 12 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    <i className="ti ti-user-heart" style={{ marginLeft: 4 }} />
                    ولي الأمر في النظام
                  </label>
                </div>
                {parentLoading ? (
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>جارٍ التحميل...</div>
                ) : (
                  <>
                    {currentParent && selectedParentId === "" && (
                      <div style={{ marginBottom: 8, padding: "6px 10px", background: "var(--bg2)", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="ti ti-user-check" style={{ color: "var(--green)" }} />
                        <span>{currentParent.name}</span>
                        <span style={{ fontSize: 11, color: "var(--text2)", direction: "ltr" }}>({currentParent.email})</span>
                      </div>
                    )}
                    <select
                      className="form-input"
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                    >
                      <option value="">— {currentParent ? "الإبقاء على الحالي" : "لا يوجد ولي أمر"} —</option>
                      <option value="null">بدون ولي أمر</option>
                      {parents.map((p) => (
                        <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", padding: 10 }}
                onClick={handleUpdate}
                disabled={updateStudent.isPending}
              >
                <i className="ti ti-check" />
                {updateStudent.isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setEditItem(null)}>
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
              <h3 style={{ margin: "12px 0 6px", fontSize: 16 }}>حذف الطالب</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>
                سيتم حذف الطالب نهائياً. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", padding: 10 }}
                onClick={handleDelete}
                disabled={deleteStudent.isPending}
              >
                <i className="ti ti-trash" />
                {deleteStudent.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
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
