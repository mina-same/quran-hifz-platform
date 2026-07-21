import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '@/lib/api';

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

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch(`/messages/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });
}
