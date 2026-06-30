import { useTopbar } from "../../context/useTopbar";
import { useParentContext } from "../../context/ParentContext";
import { useChildHomework } from "../../api/parent";
import { Alert } from "../../components/common/Alert";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";

export function ParentHomeworkView() {
  const { activeChild } = useParentContext();
  const { data: hwData, isLoading } = useChildHomework(activeChild?._id);

  useTopbar("ti-list-check", `واجبات ${activeChild?.name ?? "—"}`, <></>);

  const groupHWs    = hwData?.group    ?? [];
  const individualHWs = hwData?.individual ?? [];

  return (
    <>
      <Alert tone="info">واجبات ابنك الجماعية والفردية المُكلَّف بها من المعلم.</Alert>

      <Card icon="ti-users" title="الواجبات الجماعية">
        {isLoading ? (
          <div style={{ padding: "1rem", color: "var(--text-muted)" }}>جارٍ التحميل...</div>
        ) : groupHWs.length === 0 ? (
          <p style={{ color: "var(--text2)", padding: 16, textAlign: "center", fontSize: 12 }}>
            لا توجد واجبات جماعية
          </p>
        ) : (
          groupHWs.map((hw, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 0",
                borderTop: i ? "1px solid var(--border)" : undefined,
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--green-pale)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="ti ti-list-check" style={{ color: "var(--green)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{hw.title}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 5 }}>{hw.description}</div>
                <Badge tone="gold" style={{ fontSize: 10 }}>الموعد: {hw.dueDay}</Badge>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card icon="ti-user" title={`واجبات خاصة بـ ${activeChild?.name ?? "—"}`}>
        {individualHWs.length === 0 ? (
          <p style={{ color: "var(--text2)", padding: 16, textAlign: "center", fontSize: 12 }}>
            لا توجد واجبات فردية حالياً — ممتاز!
          </p>
        ) : (
          individualHWs.map((hw, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 0",
                borderTop: i ? "1px solid var(--border)" : undefined,
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--gold-pale)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="ti ti-star" style={{ color: "var(--gold)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{hw.segment}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 5 }}>{hw.notes ?? hw.type}</div>
                <Badge tone="gold" style={{ fontSize: 10 }}>الموعد: {new Date(hw.dueDate).toLocaleDateString("ar-SA")}</Badge>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
