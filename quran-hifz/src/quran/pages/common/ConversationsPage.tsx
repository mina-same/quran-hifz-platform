import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import {
  useConversations,
  useMarkThreadRead,
  useMessageContacts,
  useSendInThread,
  useThread,
} from "../../api/messages";
import { AR_LOCALE, toAr } from "../../../lib/format";

const MAX = 1000;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString(AR_LOCALE, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(AR_LOCALE, { day: "numeric", month: "short" });
}

/**
 * «الرسائل» for teachers and parents: two-way, one thread per person. A
 * teacher talks to the parents of their students, a parent to their
 * children's teachers — the server enforces who may write to whom.
 */
export function ConversationsPage() {
  const { user } = usePortal();
  const isTeacher = user?.role === "teacher";
  const [openId, setOpenId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: rows = [], isLoading } = useConversations();
  const { data: contacts = [] } = useMessageContacts(picking);
  const { data: thread } = useThread(openId);
  const send = useSendInThread(openId);
  const markRead = useMarkThreadRead();

  useTopbar("ti-message", "الرسائل");

  const openRow = rows.find((r) => r.userId === openId);
  const openContact = contacts.find((c) => c.userId === openId);
  const openName = openRow?.name ?? openContact?.name ?? "";
  const unreadHere = openRow?.unread ?? 0;

  // Opening a thread with unread messages marks them read.
  useEffect(() => {
    if (openId && unreadHere > 0) markRead.mutate(openId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, unreadHere]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length, openId]);

  async function submit() {
    const body = draft.trim();
    if (!body || !openId) return;
    try {
      await send.mutateAsync(body);
      setDraft("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const filtered = contacts.filter(
    (c) => !q.trim() || c.name.includes(q.trim()) || c.subtitle.includes(q.trim()),
  );

  return (
    <div className={`conv-page ${openId ? "has-open" : ""}`}>
      <aside className="card conv-list">
        <div className="conv-list-head">
          <b>المحادثات</b>
          <button
            type="button"
            className="topbar-btn btn-primary"
            onClick={() => {
              setPicking(true);
              setQ("");
            }}
          >
            <i className="ti ti-edit" /> رسالة جديدة
          </button>
        </div>

        {picking && (
          <div className="conv-picker">
            <div className="conv-picker-head">
              <input
                className="form-input"
                autoFocus
                placeholder={isTeacher ? "ابحث عن ولي أمر أو طالب…" : "ابحث عن معلم…"}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                type="button"
                className="topbar-btn btn-ghost"
                onClick={() => setPicking(false)}
                aria-label="إغلاق"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            {filtered.length === 0 ? (
              <p className="conv-empty">
                {isTeacher ? "لا يوجد أولياء أمور مرتبطون بطلابك" : "لا يوجد معلمون لأبنائك"}
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.userId}
                  type="button"
                  className="conv-row"
                  onClick={() => {
                    setOpenId(c.userId);
                    setPicking(false);
                  }}
                >
                  <span className="conv-avatar">{initials(c.name)}</span>
                  <span className="conv-row-main">
                    <b>{c.name}</b>
                    <span>{c.subtitle}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {!picking &&
          (isLoading ? (
            <p className="conv-empty">
              <i className="ti ti-loader-2 lp-spin" /> جارٍ التحميل…
            </p>
          ) : rows.length === 0 ? (
            <p className="conv-empty">لا توجد محادثات بعد — ابدأ بـ «رسالة جديدة»</p>
          ) : (
            rows.map((r) => (
              <button
                key={r.userId}
                type="button"
                className={`conv-row ${r.userId === openId ? "active" : ""}`}
                onClick={() => setOpenId(r.userId)}
              >
                <span className="conv-avatar">{initials(r.name)}</span>
                <span className="conv-row-main">
                  <span className="conv-row-top">
                    <b>{r.name}</b>
                    <time>{timeLabel(r.last.createdAt)}</time>
                  </span>
                  <span className="conv-snippet">
                    {r.last.fromMe ? "أنت: " : ""}
                    {r.last.body}
                  </span>
                </span>
                {r.unread > 0 && <span className="conv-unread">{toAr(r.unread)}</span>}
              </button>
            ))
          ))}
      </aside>

      <section className="card conv-thread">
        {!openId ? (
          <div className="conv-placeholder">
            <i className="ti ti-messages" />
            اختر محادثة أو ابدأ «رسالة جديدة»
          </div>
        ) : (
          <>
            <header className="conv-thread-head">
              <button
                type="button"
                className="topbar-btn btn-ghost conv-back"
                onClick={() => setOpenId(null)}
                aria-label="رجوع"
              >
                <i className="ti ti-arrow-right" />
              </button>
              <span className="conv-avatar">{initials(openName)}</span>
              <b>{openName}</b>
            </header>
            <div className="conv-messages">
              {(thread?.messages ?? []).map((m) => {
                const mine = String(m.sender) === user?.id;
                return (
                  <div key={m._id} className={`conv-bubble ${mine ? "mine" : "theirs"}`}>
                    <p>{m.body}</p>
                    <time>{timeLabel(m.createdAt)}</time>
                  </div>
                );
              })}
              {thread && thread.messages.length === 0 && (
                <p className="conv-empty">لا توجد رسائل بعد — اكتب أول رسالة</p>
              )}
              <div ref={endRef} />
            </div>
            {thread && !thread.canReply ? (
              <p className="conv-readonly">
                <i className="ti ti-lock" /> لا يمكنك مراسلة هذا المستخدم حالياً
              </p>
            ) : (
              <div className="conv-compose">
                <textarea
                  className="form-input"
                  rows={2}
                  maxLength={MAX}
                  placeholder="اكتب رسالتك…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  aria-label="نص الرسالة"
                />
                <button
                  type="button"
                  className="topbar-btn btn-primary"
                  disabled={!draft.trim() || send.isPending}
                  onClick={submit}
                  aria-label="إرسال"
                >
                  <i className={`ti ${send.isPending ? "ti-loader-2 lp-spin" : "ti-send"}`} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
