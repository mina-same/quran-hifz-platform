import { useTopbar } from "../../context/useTopbar";

export function TeacherHalqa() {
  useTopbar("ti-school", "حلقاتي");

  return (
    <div style={{ textAlign: "center", padding: "56px 0" }}>
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: "var(--green-pale)", color: "var(--green)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 32, margin: "0 auto 16px",
      }}>
        <i className="ti ti-school" />
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>قريباً</p>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text3)" }}>هذه الصفحة قيد التطوير حالياً</p>
    </div>
  );
}
