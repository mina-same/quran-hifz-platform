import { useState, type ReactNode } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { SkeletonList } from "../../components/common/Skeleton";
import { useMessages, useMarkRead, useSendNoteToSupervisors } from "../../api/messages";
import { AR_LOCALE } from "@/lib/format";
import { EmptyState } from "../../components/common/EmptyState";

export function StudentMessages() {
  return <MessagesInbox compose={<NoteToSupervisors />} />;
}

/** Received-messages list keyed by recipient = current user. Reused as the
 *  admin/supervisor inbox (no compose box there). */
export function MessagesInbox({ compose }: { compose?: ReactNode }) {
  const { data: messages = [], isLoading } = useMessages();
  const markRead = useMarkRead();

  useTopbar("ti-message", "الرسائل");

  if (isLoading) {
    return (
      <>
        {compose}
        <Card>
          <SkeletonList rows={5} avatar={true} />
        </Card>
      </>
    );
  }

  return (
    <>
    {compose}
    <Card>
      {messages.length === 0 && (
        <EmptyState icon="ti-message-circle-off" title="لا توجد رسائل بعد" />
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
                {new Date(msg.createdAt).toLocaleDateString(AR_LOCALE)}
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
    </>
  );
}

const NOTE_MAX = 1000;

function NoteToSupervisors() {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const send = useSendNoteToSupervisors();
  const trimmed = body.trim();

  const submit = async () => {
    if (!trimmed || send.isPending) return;
    setStatus(null);
    try {
      await send.mutateAsync(trimmed);
      setBody("");
      setStatus({ tone: "success", text: "تم إرسال ملاحظتك للمشرف" });
    } catch (e) {
      setStatus({ tone: "danger", text: (e as Error).message || "تعذر إرسال الملاحظة" });
    }
  };

  return (
    <Card title="إرسال ملاحظة للمشرف" icon="ti-send" style={{ marginBottom: 16 }}>
      <textarea
        className="form-input"
        rows={3}
        maxLength={NOTE_MAX}
        placeholder="اكتب ملاحظتك هنا..."
        value={body}
        onChange={(e) => { setBody(e.target.value); if (status) setStatus(null); }}
        style={{ width: "100%", resize: "vertical" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{body.length}/{NOTE_MAX}</span>
        <button className="topbar-btn btn-primary" onClick={submit} disabled={!trimmed || send.isPending}>
          {send.isPending ? "جارٍ الإرسال..." : "إرسال"}
        </button>
      </div>
      {status && <Alert tone={status.tone} style={{ marginTop: 10 }}>{status.text}</Alert>}
    </Card>
  );
}
