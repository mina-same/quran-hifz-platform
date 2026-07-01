import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { useGroupHomework, useCreateGroupHomework, useDeleteGroupHomework } from "../../api/group-homework";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge } from "../../components/common/Badge";

const STUDENTS = ["عبدالله الحميداني", "يوسف الزهراني", "أحمد الشهري", "فارس العسيري", "سالم الدوسري"];

type IndivHW = { student: string; title: string; dueDay: string; note: string };

function IndividualHomeworkCard() {
  const [showForm, setShowForm] = useState(false);
  const [list, setList]         = useState<IndivHW[]>([]);
  const [form, setForm]         = useState({ student: STUDENTS[0], title: "", dueDay: "", note: "" });

  function add() {
    if (!form.student || !form.title) return;
    setList((prev) => [{ ...form }, ...prev]);
    setForm({ student: STUDENTS[0], title: "", dueDay: "", note: "" });
    setShowForm(false);
  }

  return (
    <Card
      icon="ti-user"
      title="الواجبات الفردية"
      headerExtra={
        <button className="topbar-btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setShowForm((v) => !v)}>
          <i className="ti ti-plus" /> واجب فردي
        </button>
      }
    >
      {showForm && (
        <div style={{ padding: 12, background: "var(--cream, #f9f6f2)", borderRadius: 8, marginBottom: 12 }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">الطالب</label>
              <select className="form-input" value={form.student} onChange={(e) => setForm((f) => ({ ...f, student: e.target.value }))}>
                {STUDENTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">الموعد</label>
              <input className="form-input" placeholder="مثال: الثلاثاء" value={form.dueDay} onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">الواجب</label>
              <input className="form-input" placeholder="عنوان الواجب الفردي" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">ملاحظة للطالب</label>
              <input className="form-input" placeholder="سبب الواجب الفردي..." value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <button className="topbar-btn btn-primary" style={{ marginTop: 8 }} onClick={add}>
            <i className="ti ti-send" /> إرسال للطالب وولي أمره
          </button>
        </div>
      )}
      {list.length === 0 ? (
        <p style={{ color: "var(--text2)", textAlign: "center", padding: 20, fontSize: 13 }}>لا توجد واجبات فردية حتى الآن</p>
      ) : (
        list.map((hw, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--border)" : undefined }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--gold-pale, #fef9ec)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="ti ti-user" style={{ color: "var(--gold)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{hw.student}</div>
              <div style={{ fontSize: 12, marginBottom: 3 }}>{hw.title}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {hw.dueDay && <Badge tone="gold">موعد: {hw.dueDay}</Badge>}
                {hw.note && <Badge tone="gray">{hw.note}</Badge>}
              </div>
            </div>
          </div>
        ))
      )}
    </Card>
  );
}

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

      <Card icon="ti-users" title="الواجبات الجماعية">
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
                <Badge tone="gold">موعد التسليم: {hw.dueDay}</Badge>
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
      <IndividualHomeworkCard />
    </>
  );
}
