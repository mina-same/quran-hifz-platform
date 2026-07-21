import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';

export type GroupHomework = {
  _id: string;
  halqa: { _id: string; name: string } | string;
  teacher: { _id: string; name: string } | string;
  title: string;
  description: string;
  dueDay: string;
  dueDate: string;
};

type ListResponse = { success: boolean; count: number; data: GroupHomework[] };
type SingleResponse = { success: boolean; data: GroupHomework };

export function useGroupHomework(halqa?: string) {
  return useQuery({
    queryKey: ['group-homework', halqa],
    queryFn: () => get<ListResponse>(`/group-homework${halqa ? `?halqa=${halqa}` : ''}`).then((r) => r.data),
  });
}

export function useCreateGroupHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>('/group-homework', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-homework'] }),
  });
}

export function useDeleteGroupHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/group-homework/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-homework'] }),
  });
}
