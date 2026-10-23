import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch } from "../../lib/api";

export type Message = {
  _id: string;
  sender: string;
  recipient: string;
  senderRole: string;
  senderName: string;
  senderInitials: string;
  body: string;
  readAt?: string;
  createdAt: string;
};

type ListResponse = { success: boolean; count: number; data: Message[] };
type SingleResponse = { success: boolean; data: Message };

export function useMessages() {
  return useQuery({
    queryKey: ["messages"],
    queryFn: () => get<ListResponse>("/messages").then((r) => r.data),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { recipient: string; body: string }) =>
      post<SingleResponse>("/messages", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });
}

/** Teacher → parents of one halqa (one-way). `students` omitted = the whole
 *  halqa. Students without a linked parent come back as `unnotified`. */
export function useSendToParents() {
  return useMutation({
    mutationFn: (body: { track: string; students?: string[]; body: string }) =>
      post<{
        success: boolean;
        data: { notified: number; unnotified: { id: string; name: string }[] };
      }>("/messages/to-parents", body).then((r) => r.data),
  });
}

/** Student → supervision note; the server resolves recipients itself. */
export function useSendNoteToSupervisors() {
  return useMutation({
    mutationFn: (body: string) =>
      post<{ success: boolean; data: { sent: number } }>("/messages/to-supervisors", { body }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch(`/messages/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });
}

// ── Teacher ↔ parent conversations ──────────────────────────────────────

export type Contact = {
  userId: string;
  name: string;
  role: "teacher" | "parent";
  subtitle: string;
};
export type ConversationRow = {
  userId: string;
  name: string;
  role: string;
  last: { body: string; createdAt: string; fromMe: boolean };
  unread: number;
  canReply: boolean;
};
export type ThreadMessage = Message & { student?: string };

/** People I've exchanged messages with — polled so new replies show up. */
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      get<{ success: boolean; data: ConversationRow[] }>("/messages/conversations").then(
        (r) => r.data,
      ),
    refetchInterval: 20000,
  });
}

/** Teacher → parents of their students; parent → their children's teachers. */
export function useMessageContacts(enabled: boolean) {
  return useQuery({
    queryKey: ["message-contacts"],
    queryFn: () =>
      get<{ success: boolean; data: Contact[] }>("/messages/contacts").then((r) => r.data),
    enabled,
  });
}

export function useThread(userId: string | null) {
  return useQuery({
    queryKey: ["thread", userId ?? ""],
    queryFn: () =>
      get<{ success: boolean; data: { messages: ThreadMessage[]; canReply: boolean } }>(
        `/messages/with/${userId}`,
      ).then((r) => r.data),
    enabled: !!userId,
    refetchInterval: 10000,
  });
}

export function useSendInThread(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => post(`/messages/with/${userId}`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread", userId ?? ""] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => post(`/messages/with/${userId}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
