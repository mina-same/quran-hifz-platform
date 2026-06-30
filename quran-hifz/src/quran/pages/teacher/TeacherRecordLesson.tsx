import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { useStudents } from "../../api/students";
import { useCreateRecording } from "../../api/lesson-recordings";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";

type RecState = "idle" | "recording" | "done";

const TYPES = ["حفظ جديد", "مراجعة قريبة", "مراجعة بعيدة", "تحسين تلاوة"];

export function TeacherRecordLesson() {
  const { data: students } = useStudents();
  const createRecording = useCreateRecording();

  const [recState, setRecState] = useState<RecState>("idle");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ student: "", type: TYPES[0], segment: "", note: "", points: "700" });

  useTopbar("ti-video", "تسجيل الدرس", <></>);

  function toggleRec() {
    if (recState === "idle") setRecState("recording");
    else if (recState === "recording") setRecState("done");
    else setRecState("idle");
  }

  async function handleSave() {
    if (!form.student || !form.segment) return;
    await createRecording.mutateAsync({
      student:     form.student,
      type:        form.type,
      segment:     form.segment,
      teacherNote: form.note,
      points:      Number(form.points) || 700,
    });
    setSaved(true);
    setRecState("idle");
    setForm((f) => ({ ...f, segment: "", note: "" }));
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      {saved && <Alert tone="success">تم حفظ التسجيل بنجاح ✓</Alert>}
      {createRecording.isError && <Alert tone="error">فشل الحفظ، حاول مجدداً.</Alert>}

      <Card icon="ti-microphone" title="بيانات الدرس">
        <div className="form-grid-2" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">الطالب <span>*</span></label>
            <select className="form-input" value={form.student} onChange={(e) => setForm((f) => ({ ...f, student: e.target.value }))}>
              <option value="">-- اختر الطالب --</option>
              {(students ?? []).map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">نوع الدرس <span>*</span></label>
            <select className="form-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">المقطع <span>*</span></label>
            <input className="form-input" placeholder="مثال: البقرة ٢٤٠-٢٤٥" value={form.segment} onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">النقاط</label>
            <input className="form-input" type="number" min={0} value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">ملاحظة المعلم</label>
            <input className="form-input" placeholder="ملاحظة مختصرة..." value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
      </Card>

      <Card icon="ti-microphone-2" title="التسجيل الصوتي">
        <div className="record-area">
          <i className={`ti ti-microphone rec-icon${recState === "recording" ? " rec-pulse" : ""}`} />
          <div style={{ marginBottom: 16, fontSize: 14, color: "var(--text2)" }}>
            {recState === "idle"      && "اضغط لبدء التسجيل"}
            {recState === "recording" && <span style={{ color: "#ef4444", fontWeight: 700 }}>● جارٍ التسجيل...</span>}
            {recState === "done"      && <span style={{ color: "var(--green)", fontWeight: 700 }}>✓ تم التسجيل — جاهز للحفظ</span>}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button className={`topbar-btn ${recState === "recording" ? "btn-danger" : "btn-primary"}`} onClick={toggleRec}>
              <i className={`ti ${recState === "recording" ? "ti-player-stop" : "ti-microphone"}`} />
              {recState === "idle" ? "ابدأ التسجيل" : recState === "recording" ? "إيقاف" : "تسجيل جديد"}
            </button>
            {recState === "done" && (
              <button className="topbar-btn btn-gold" onClick={handleSave} disabled={createRecording.isPending}>
                <i className="ti ti-device-floppy" /> {createRecording.isPending ? "جارٍ الحفظ..." : "حفظ الدرس"}
              </button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
