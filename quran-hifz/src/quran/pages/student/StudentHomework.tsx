import { useEffect, useRef, useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabic = (n: number) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
const pad = (n: number) => (n < 10 ? "٠" : "") + toArabic(n);

export function StudentHomework() {
  useTopbar("ti-microphone", "تسجيل الواجب اليومي");
  const [recording, setRecording] = useState(false);
  const [done, setDone] = useState(false);
  const [secs, setSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  function toggleRec() {
    if (!recording) {
      setRecording(true);
      setSecs(0);
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } else {
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setDone(true);
    }
  }

  const m = Math.floor(secs / 60);
  const s = secs % 60;

  return (
    <>
      <Alert tone="warning">
        التسجيل مرة واحدة فقط — يُرسل تلقائياً لأستاذك وولي أمرك فور الإرسال، ولا يمكن إعادته إلا
        بإذن الأستاذ.
      </Alert>
      <Card icon="ti-settings" title="إعداد الواجب">
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">نوع الواجب</label>
            <select className="form-input">
              <option>حفظ جديد</option>
              <option>مراجعة قريبة</option>
              <option>مراجعة بعيدة</option>
              <option>تحسين تلاوة</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">السورة / المقطع</label>
            <input className="form-input" placeholder="مثال: البقرة آيات ٢٤٠ إلى ٢٤٥" />
          </div>
        </div>
      </Card>

      {!done && (
        <div className="record-area">
          {recording && (
            <div className="live-indicator" style={{ marginBottom: 12 }}>
              <span
                className="rec-pulse"
                style={{
                  width: 10,
                  height: 10,
                  background: "#ef4444",
                  borderRadius: "50%",
                  display: "inline-block",
                  marginLeft: 6,
                }}
              />
              يتم التسجيل الآن...
            </div>
          )}
          <i className={`ti ti-microphone rec-icon ${recording ? "rec-pulse" : ""}`} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
            اضغط لبدء التسجيل
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 16 }}>
            سيتم الإرسال التلقائي عند الانتهاء
          </div>
          <button
            className="topbar-btn btn-primary"
            onClick={toggleRec}
            style={{
              padding: "12px 28px",
              fontSize: 14,
              background: recording ? "#ef4444" : undefined,
            }}
          >
            <i className={`ti ${recording ? "ti-player-stop" : "ti-player-play"}`} />
            {recording ? " إيقاف وإرسال" : " ابدأ التسجيل"}
          </button>
          {recording && (
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--green)",
                marginTop: 12,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pad(m)}:{pad(s)}
            </div>
          )}
        </div>
      )}

      {done && (
        <Alert tone="success">
          <b>تم الإرسال!</b>
          <br />
          📲 أُرسل لولي الأمر • 👨‍🏫 وصل للأستاذ ناصر • 📋 سُجِّل في ملفك
        </Alert>
      )}
    </>
  );
}
