import { useState, useRef, useEffect, useCallback } from "react";
import { usePortal } from "../../context/PortalContext";
import { useHalqat, type Halqa } from "../../api/halqat";
import { useStudents, type Student } from "../../api/students";
import { useCreateRecording } from "../../api/lesson-recordings";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge } from "../../components/common/Badge";

const LESSON_TYPES = ["حفظ جديد", "مراجعة قريبة", "مراجعة بعيدة", "تحسين تلاوة", "اختبار"];

type RecState = "idle" | "recording" | "done";

type StudentForm = { type: string; segment: string; pts: string; note: string };
type RecorderRef = { mr: MediaRecorder; stream: MediaStream; interval: ReturnType<typeof setInterval> };

function toAr(n: number) {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}
function fmtTimer(secs: number) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return (m < 10 ? "٠" : "") + toAr(m) + ":" + (s < 10 ? "٠" : "") + toAr(s);
}

export function TeacherRecordLesson() {
  const { setTopbar } = usePortal();
  const [selectedHalqa, setSelectedHalqa] = useState<Halqa | null>(null);

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat();
  const { data: students = [], isLoading: loadingStudents } = useStudents(
    selectedHalqa ? { halqa: selectedHalqa._id } : undefined
  );
  const createRecording = useCreateRecording();

  // Per-student state
  const [recStates, setRecStates] = useState<Record<string, RecState>>({});
  const [timers, setTimers]       = useState<Record<string, string>>({});
  const [forms, setForms]         = useState<Record<string, StudentForm>>({});
  const [sent, setSent]           = useState<Record<string, boolean>>({});
  const recsRef = useRef<Record<string, RecorderRef>>({});
  const blobsRef = useRef<Record<string, Blob | null>>({});

  // Topbar
  useEffect(() => {
    if (!selectedHalqa) {
      setTopbar({ icon: "ti-player-record", title: "سجّل درس الحلقة" });
    } else {
      setTopbar({
        icon: "ti-player-record",
        title: "سجّل دروس — " + selectedHalqa.name,
        actions: (
          <button className="topbar-btn btn-ghost" onClick={() => setSelectedHalqa(null)}>
            <i className="ti ti-arrow-right" /> الحلقات
          </button>
        ),
      });
    }
  }, [selectedHalqa, setTopbar]);

  // Stop all recorders when leaving halqa view
  useEffect(() => {
    if (!selectedHalqa) {
      Object.values(recsRef.current).forEach((r) => {
        try { clearInterval(r.interval); r.mr.stop(); r.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      });
      recsRef.current = {};
      blobsRef.current = {};
      setRecStates({});
      setTimers({});
      setForms({});
      setSent({});
    }
  }, [selectedHalqa]);

  // Initialize form defaults when students load
  useEffect(() => {
    if (!students.length) return;
    setForms((prev) => {
      const next = { ...prev };
      students.forEach((st) => {
        if (!next[st._id]) {
          next[st._id] = {
            type: LESSON_TYPES[0],
            segment: st.lastMemorization ?? "",
            pts: "700",
            note: "",
          };
        }
      });
      return next;
    });
  }, [students]);

  function getForm(id: string): StudentForm {
    return forms[id] ?? { type: LESSON_TYPES[0], segment: "", pts: "700", note: "" };
  }
  function setField(id: string, field: keyof StudentForm, val: string) {
    setForms((prev) => ({ ...prev, [id]: { ...getForm(id), [field]: val } }));
  }

  const toggleRec = useCallback((st: Student) => {
    const id = st._id;
    const state = recStates[id] ?? "idle";

    if (state === "idle") {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("المتصفح لا يدعم التسجيل الصوتي. استخدم Chrome أو Safari.");
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const mr = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        mr.onstop = () => {
          blobsRef.current[id] = new Blob(chunks, { type: "audio/webm" });
          stream.getTracks().forEach((t) => t.stop());
          setRecStates((p) => ({ ...p, [id]: "done" }));
        };
        let secs = 0;
        const interval = setInterval(() => {
          secs++;
          setTimers((p) => ({ ...p, [id]: fmtTimer(secs) }));
        }, 1000);
        recsRef.current[id] = { mr, stream, interval };
        mr.start();
        setTimers((p) => ({ ...p, [id]: "٠٠:٠٠" }));
        setRecStates((p) => ({ ...p, [id]: "recording" }));
      }).catch((err) => alert("تعذّر الوصول للميكروفون: " + err.message));

    } else if (state === "recording") {
      const rec = recsRef.current[id];
      if (rec) { clearInterval(rec.interval); rec.mr.stop(); }

    } else {
      // reset
      blobsRef.current[id] = null;
      setTimers((p) => ({ ...p, [id]: "٠٠:٠٠" }));
      setRecStates((p) => ({ ...p, [id]: "idle" }));
    }
  }, [recStates]);

  async function handleSend(st: Student) {
    const id = st._id;
    const f = getForm(id);
    if (!f.segment.trim()) return;
    await createRecording.mutateAsync({
      student:     id,
      halqa:       selectedHalqa!._id,
      type:        f.type,
      segment:     f.segment,
      points:      Number(f.pts) || 0,
      teacherNote: f.note,
    });
    setSent((p) => ({ ...p, [id]: true }));
    setRecStates((p) => ({ ...p, [id]: "idle" }));
  }

  // ── View 1: Halqa Selector ─────────────────────────────────────────
  if (!selectedHalqa) {
    if (loadingHalqat) return <div style={{ padding: 32, textAlign: "center", color: "var(--text2)" }}>جارٍ التحميل…</div>;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {halqat.map((hq) => {
          const masjid = typeof hq.masjid === "object" ? hq.masjid.name : hq.masjid;
          return (
            <div
              key={hq._id}
              className="card"
              style={{ cursor: "pointer", border: "2px solid transparent", transition: "border .15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
              onClick={() => setSelectedHalqa(hq)}
            >
              <div className="card-header">
                <div className="card-title"><i className="ti ti-school" /> {hq.name}</div>
              </div>
              <div className="halqa-row"><span className="lbl">المسجد</span><span className="val">{masjid}</span></div>
              <div className="halqa-row"><span className="lbl">المواعيد</span><span className="val" style={{ fontSize: 11 }}>{hq.days} | {hq.time}</span></div>
              <div className="halqa-row"><span className="lbl">الطلاب</span><span className="val">{hq.studentCount ?? "—"} طالب</span></div>
              <button
                className="topbar-btn btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
                onClick={(e) => { e.stopPropagation(); setSelectedHalqa(hq); }}
              >
                <i className="ti ti-player-record" /> سجّل دروس الحلقة
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  // ── View 2: Per-student session ─────────────────────────────────────
  if (loadingStudents) return <div style={{ padding: 32, textAlign: "center", color: "var(--text2)" }}>جارٍ تحميل الطلاب…</div>;

  return (
    <>
      <Alert tone="info">
        سجّل واجب كل طالب صوتياً — يُرسل تلقائياً للطالب وولي أمره فور الانتهاء.
      </Alert>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {students.map((st) => {
          const state   = recStates[st._id] ?? "idle";
          const timer   = timers[st._id] ?? "٠٠:٠٠";
          const f       = getForm(st._id);
          const isSent  = sent[st._id];
          const hwTone  = st.homeworkStatus === "submitted" ? "green" : st.homeworkStatus === "late" ? "red" : "gold";
          const hwLabel = st.homeworkStatus === "submitted" ? "مُسلَّم" : st.homeworkStatus === "late" ? "متأخر" : "معلَّق";

          return (
            <Card key={st._id}>
              {/* Student header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--green-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "var(--green)", flexShrink: 0 }}>
                  {st.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{st.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>
                    آخر حفظ: {st.lastMemorization ?? "—"}
                  </div>
                </div>
                {isSent
                  ? <Badge tone="green">أُرسل ✓</Badge>
                  : <Badge tone="gold">لم يُسجَّل</Badge>
                }
              </div>

              {isSent ? (
                <Alert tone="success">تم الإرسال لـ <b>{st.name}</b> وولي أمره • النقاط: <b>{f.pts}</b></Alert>
              ) : (
                <>
                  {/* Form row */}
                  <div className="form-grid-2" style={{ marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">نوع الواجب</label>
                      <select className="form-input" value={f.type} onChange={(e) => setField(st._id, "type", e.target.value)}>
                        {LESSON_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">المقطع</label>
                      <input className="form-input" value={f.segment} onChange={(e) => setField(st._id, "segment", e.target.value)} placeholder="البقرة ص.." />
                    </div>
                  </div>

                  {/* Recorder */}
                  <div style={{ background: "var(--cream)", borderRadius: 10, padding: "14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {state !== "done" && (
                      <button
                        className="topbar-btn btn-primary"
                        style={{ gap: 8, background: state === "recording" ? "#ef4444" : undefined }}
                        onClick={() => toggleRec(st)}
                      >
                        <i className={`ti ${state === "recording" ? "ti-player-stop" : "ti-microphone"}`} />
                        {state === "idle" ? "ابدأ التسجيل" : "إيقاف وحفظ"}
                      </button>
                    )}
                    {state === "recording" && (
                      <>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{timer}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#ef4444" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
                          يتم التسجيل
                        </div>
                      </>
                    )}
                  </div>

                  {/* After recording */}
                  {state === "done" && (
                    <div style={{ marginTop: 10 }}>
                      <Alert tone="success" style={{ marginBottom: 10 }}>تم التسجيل — راجع وأرسل</Alert>
                      <div className="form-grid-2">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">النقاط (٠–١٠٠٠)</label>
                          <input className="form-input" type="number" min={0} max={1000} value={f.pts}
                            onChange={(e) => setField(st._id, "pts", String(Math.min(1000, +e.target.value)))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">ملاحظة للطالب</label>
                          <input className="form-input" value={f.note} onChange={(e) => setField(st._id, "note", e.target.value)} placeholder="اختياري..." />
                        </div>
                      </div>
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <button
                          className="topbar-btn btn-primary"
                          style={{ flex: 1, justifyContent: "center" }}
                          disabled={createRecording.isPending}
                          onClick={() => handleSend(st)}
                        >
                          <i className="ti ti-send" />
                          {createRecording.isPending ? "جارٍ الإرسال..." : "إرسال للطالب وولي الأمر"}
                        </button>
                        <button className="topbar-btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { blobsRef.current[st._id] = null; setRecStates((p) => ({ ...p, [st._id]: "idle" })); }}>
                          <i className="ti ti-refresh" /> إعادة تسجيل
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })}

        {students.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text2)" }}>لا يوجد طلاب في هذه الحلقة</div>
        )}
      </div>
    </>
  );
}
