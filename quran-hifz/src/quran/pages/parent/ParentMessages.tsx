import { useTopbar } from "../../context/useTopbar";
import { useParentContext } from "../../context/ParentContext";
import { useChildMessages } from "../../api/parent";
import { Card } from "../../components/common/Card";
import { SkeletonList } from "../../components/common/Skeleton";

export function ParentMessages() {
  const { activeChild } = useParentContext();
  const { data: messages, isLoading } = useChildMessages(activeChild?._id);

  useTopbar("ti-message", "الرسائل", <></>);

  return (
    <Card icon="ti-inbox" title="الرسائل الواردة">
      {isLoading && <SkeletonList rows={5} avatar={true} />}
      {(messages ?? []).map((m, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 0",
            borderTop: i ? "1px solid var(--border)" : undefined,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--green-pale)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "var(--green)",
              fontSize: 16,
            }}
          >
            <i className="ti ti-user" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>
                {m.senderName ?? m.sender}
              </span>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                {new Date(m.createdAt).toLocaleDateString("ar-SA")}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>{m.body}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}
