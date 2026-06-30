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

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch(`/messages/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });
}
