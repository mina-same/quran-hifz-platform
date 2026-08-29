import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

export type Halqa = {
  _id: string;
  name: string;
  teacher: { _id: string; name: string } | string;
  masjid: { _id: string; name: string } | string;
  /** The halqa's programme — populated on read, sent as an id on write. */
  specialTrack?: { _id: string; title: string } | string | null;
  days: string;
  time: string;
  capacity: number;
  attendancePct: number;
  completionPct: number;
  studentCount?: number;
};

export type HalqaFilters = {
  teacher?: string;
  masjid?: string;
};

type ListResponse = { success: boolean; count: number; data: Halqa[] };
type SingleResponse = { success: boolean; data: Halqa };

function buildQuery(filters?: HalqaFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.teacher) params.set('teacher', filters.teacher);
  if (filters.masjid) params.set('masjid', filters.masjid);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function useHalqat(filters?: HalqaFilters) {
  return useQuery({
    queryKey: ['halqat', filters],
    queryFn: () => get<ListResponse>(`/halqat${buildQuery(filters)}`).then((r) => r.data),
  });
}

export function useHalqa(id: string | undefined) {
  return useQuery({
    queryKey: ['halqat', id],
    queryFn: () => get<SingleResponse>(`/halqat/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateHalqa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>('/halqat', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['halqat'] }),
  });
}

export function useUpdateHalqa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      put<SingleResponse>(`/halqat/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['halqat'] }),
  });
}

export function useDeleteHalqa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/halqat/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['halqat'] }),
  });
}
