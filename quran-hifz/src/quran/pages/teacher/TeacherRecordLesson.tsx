import { useEffect } from "react";
import { useSetTopbar } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";

export function TeacherRecordLesson() {
  const setTopbar = useSetTopbar();

  useEffect(() => {
    setTopbar({ icon: "ti-player-record", title: "سجّل درس الحلقة" });
  }, [setTopbar]);

  return (
    <Card>
      <div style={{ textAlign: "center", padding: "48px 16px" }}>
        <i className="ti ti-player-record" style={{ fontSize: 40, color: "var(--green)", marginBottom: 16, display: "inline-block" }} />
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>قريباً</div>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>ميزة تسجيل دروس الحلقة الصوتية قيد التطوير حالياً.</div>
      </div>
    </Card>
  );
}
