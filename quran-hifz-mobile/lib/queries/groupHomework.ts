import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';

export type GroupHomework = {
  _id: string;
  halqa?: { _id: string; name: string } | string;
  specialTrack?: { _id: string; title: string } | string;
  teacher: { _id: string; name: string } | string;
  title: string;
  description: string;
  dueDay: string;
  dueDate: string;
};

export type GroupHomeworkFilters = {
  halqa?: string;
  specialTrack?: string;
};

type ListResponse = { success: boolean; count: number; data: GroupHomework[] };
type SingleResponse = { success: boolean; data: GroupHomework };

function buildQuery(filters?: GroupHomeworkFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.halqa) params.set('halqa', filters.halqa);
  if (filters.specialTrack) params.set('specialTrack', filters.specialTrack);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function useGroupHomework(filters?: GroupHomeworkFilters) {
  return useQuery({
    queryKey: ['group-homework', filters],
    queryFn: () => get<ListResponse>(`/group-homework${buildQuery(filters)}`).then((r) => r.data),
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
