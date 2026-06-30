import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { useGroupHomework, useCreateGroupHomework, useDeleteGroupHomework } from "../../api/group-homework";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge } from "../../components/common/Badge";

const DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export function TeacherGroupHomework() {
  const { data: homeworks, isLoading } = useGroupHomework();
  const createHW = useCreateGroupHomework();
  const deleteHW = useDeleteGroupHomework();

  const [form, setForm]         = useState({ title: "", desc: "", dueDay: DAYS[0] });
  const [saved, setSaved]       = useState(false);
  const [showForm, setShowForm] = useState(false);

  useTopbar(
    "ti-list-check",
    "الواجبات الجماعية",
    <button className="topbar-btn btn-primary" onClick={() => setShowForm(true)}>
      <i className="ti ti-plus" /> واجب جديد
    </button>,
  );

  async function handleAdd() {
    if (!form.title.trim() || !form.desc.trim()) return;
    await createHW.mutateAsync({
      title:       form.title,
      description: form.desc,
      dueDay:      form.dueDay,
      dueDate:     new Date().toISOString(),
    });
    setForm({ title: "", desc: "", dueDay: DAYS[0] });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      {saved && <Alert tone="success">تم إضافة الواجب الجماعي بنجاح ✓</Alert>}
      {createHW.isError && <Alert tone="error">فشلت الإضافة، حاول مجدداً.</Alert>}

      {showForm && (
        <Card icon="ti-plus" title="إضافة واجب جماعي">
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">عنوان الواجب <span>*</span></label>
            <input className="form-input" placeholder="مثال: مراجعة سورة البقرة" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">وصف الواجب <span>*</span></label>
            <textarea className="form-input" rows={2} placeholder="تفاصيل ما يجب على الطلاب فعله..." value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">موعد التسليم</label>
            <select className="form-input" value={form.dueDay} onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}>
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="topbar-btn btn-primary" onClick={handleAdd} disabled={createHW.isPending}>
              <i className="ti ti-check" /> {createHW.isPending ? "جارٍ الحفظ..." : "إضافة"}
            </button>
            <button className="topbar-btn btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
          </div>
        </Card>
      )}

      <Card icon="ti-list-check" title="الواجبات الجماعية الحالية">
        {isLoading ? (
          <div style={{ padding: "1rem", color: "var(--text-muted)" }}>جارٍ التحميل...</div>
        ) : (homeworks ?? []).length === 0 ? (
          <p style={{ color: "var(--text2)", padding: 16, textAlign: "center", fontSize: 13 }}>لا توجد واجبات جماعية بعد</p>
        ) : (
          (homeworks ?? []).map((hw, i) => (
            <div
              key={hw._id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 0",
                borderTop: i ? "1px solid var(--border)" : undefined,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{hw.title}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>{hw.description}</div>
                <Badge tone="gold" style={{ fontSize: 10 }}>موعد التسليم: {hw.dueDay}</Badge>
              </div>
              <button
                className="topbar-btn btn-danger"
                style={{ padding: "5px 10px", fontSize: 12 }}
                onClick={() => deleteHW.mutate(hw._id)}
                disabled={deleteHW.isPending}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
