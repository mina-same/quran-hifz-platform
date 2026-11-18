import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '@/lib/api';

export type Message = {
  _id: string;
  sender: { _id: string; name: string } | string;
  senderRole: string;
  senderName: string;
  senderInitials: string;
  body: string;
  readAt?: string;
  createdAt: string;
};

type ListResponse = { success: boolean; count: number; data: Message[] };

export function useMessages() {
  return useQuery({
    queryKey: ['messages'],
    queryFn: () => get<ListResponse>('/messages').then((r) => r.data),
  });
}

/** Student → supervision note; the server resolves recipients itself. */
export function useSendNoteToSupervisors() {
  return useMutation({
    mutationFn: (body: string) =>
      post<{ success: boolean; data: { sent: number } }>('/messages/to-supervisors', { body }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch(`/messages/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });
}

// ── Teacher ↔ parent conversations (mirrors web api/messages.ts) ────────

export type Contact = {
  userId: string;
  name: string;
  role: 'teacher' | 'parent';
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
export type ThreadMessage = Omit<Message, 'sender'> & { sender: string; student?: string };

/** People I've exchanged messages with — polled so new replies show up. */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () =>
      get<{ success: boolean; data: ConversationRow[] }>('/messages/conversations').then((r) => r.data),
    refetchInterval: 20000,
  });
}

/** Teacher → parents of their students; parent → their children's teachers. */
export function useMessageContacts(enabled: boolean) {
  return useQuery({
    queryKey: ['message-contacts'],
    queryFn: () => get<{ success: boolean; data: Contact[] }>('/messages/contacts').then((r) => r.data),
    enabled,
  });
}

export function useThread(userId: string | null) {
  return useQuery({
    queryKey: ['thread', userId ?? ''],
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
      qc.invalidateQueries({ queryKey: ['thread', userId ?? ''] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => post(`/messages/with/${userId}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

/** Teacher → parents of a whole halqa (or of chosen students). One-way: lands
 *  in each parent's «الرسائل». Mirrors web api/messages.ts `useSendToParents`. */
export function useSendToParents() {
  return useMutation({
    mutationFn: (body: { track: string; students?: string[]; body: string }) =>
      post<{
        success: boolean;
        data: { notified: number; unnotified: { id: string; name: string }[] };
      }>('/messages/to-parents', body).then((r) => r.data),
  });
}
