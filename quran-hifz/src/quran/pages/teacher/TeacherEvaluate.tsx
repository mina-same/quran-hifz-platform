import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";

const STUDENTS = [
  "عبدالله الحميداني",
  "محمد القحطاني",
  "يوسف الشمري",
  "عمر العتيبي",
];
const TYPES = ["حفظ جديد", "مراجعة قريبة", "مراجعة بعيدة", "تحسين تلاوة"];
const RATINGS = ["ممتاز", "جيد جداً", "جيد", "مقبول"] as const;

export function TeacherEvaluate() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    student: STUDENTS[0],
    type: TYPES[0],
    segment: "",
    points: "",
    rating: RATINGS[0],
    note: "",
  });

  useTopbar("ti-star", "تقييم الجلسة", <></>);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      {saved && <Alert tone="success">تم حفظ التقييم بنجاح ✓</Alert>}
      <Card icon="ti-star" title="تقييم جلسة طالب">
        <div className="form-grid-2" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">الطالب <span>*</span></label>
            <select className="form-input" value={form.student} onChange={(e) => setForm((f) => ({ ...f, student: e.target.value }))}>
              {STUDENTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">نوع الجلسة <span>*</span></label>
            <select className="form-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">المقطع / الآيات <span>*</span></label>
            <input className="form-input" placeholder="مثال: البقرة ٢٤٠-٢٤٥" value={form.segment} onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">النقاط المُعطاة</label>
            <input className="form-input" type="number" min={0} max={1000} placeholder="٠ — ١٠٠٠" value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">التقييم العام</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {RATINGS.map((r) => (
              <button
                key={r}
                type="button"
                className={`topbar-btn ${form.rating === r ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setForm((f) => ({ ...f, rating: r }))}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 18 }}>
          <label className="form-label">ملاحظات للطالب وولي الأمر</label>
          <textarea className="form-input" rows={3} placeholder="اكتب ملاحظاتك هنا..." value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </div>
        <button className="topbar-btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "11px 0" }} onClick={handleSave}>
          <i className="ti ti-device-floppy" /> حفظ التقييم
        </button>
      </Card>
    </>
  );
}
