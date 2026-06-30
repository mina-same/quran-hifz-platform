import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { useMessages, useMarkRead } from "../../api/messages";

export function StudentMessages() {
  const { data: messages = [], isLoading } = useMessages();
  const markRead = useMarkRead();

  useTopbar("ti-message", "الرسائل");

  if (isLoading) {
    return (
      <div className="page-loading">
        <i className="ti ti-loader-2" /> جارٍ التحميل...
      </div>
    );
  }

  return (
    <Card>
      {messages.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: 32, fontSize: 14 }}>
          لا توجد رسائل بعد
        </div>
      )}
      {messages.map((msg, i) => (
        <div
          key={msg._id}
          onClick={() => { if (!msg.readAt) markRead.mutate(msg._id); }}
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 0",
            borderTop: i > 0 ? "1px solid var(--border)" : undefined,
            cursor: msg.readAt ? "default" : "pointer",
            opacity: msg.readAt ? 0.85 : 1,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: msg.readAt ? "var(--border)" : "var(--green-pale)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: msg.readAt ? "var(--text3)" : "var(--green)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {msg.senderInitials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{msg.senderName}</span>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                {new Date(msg.createdAt).toLocaleDateString("ar-SA")}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>{msg.body}</div>
            {!msg.readAt && (
              <div style={{ marginTop: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    background: "var(--green)",
                    color: "white",
                    borderRadius: 4,
                    padding: "1px 6px",
                  }}
                >
                  جديد
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </Card>
  );
}
