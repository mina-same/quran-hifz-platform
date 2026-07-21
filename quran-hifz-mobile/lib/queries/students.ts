import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';

export type Student = {
  _id: string;
  name: string;
  path: string;
  halqa: { _id: string; name: string } | string;
  masjid: { _id: string; name: string } | string;
  attendancePct: number;
  progressPct: number;
  progressPages: number;
  totalPages: number;
  guardian: string;
  guardianPhone: string;
  lastMemorization: string;
  status: 'active' | 'inactive' | 'new';
  homeworkStatus: 'submitted' | 'pending' | 'late';
};

export type StudentFilters = {
  halqa?: string;
  specialTrack?: string;
  masjid?: string;
  status?: string;
  search?: string;
};

type ListResponse = { success: boolean; count: number; data: Student[] };
type SingleResponse = { success: boolean; data: Student };

function buildQuery(filters?: StudentFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.halqa) params.set('halqa', filters.halqa);
  if (filters.specialTrack) params.set('specialTrack', filters.specialTrack);
  if (filters.masjid) params.set('masjid', filters.masjid);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function useStudents(filters?: StudentFilters) {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: () => get<ListResponse>(`/students${buildQuery(filters)}`).then((r) => r.data),
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => get<SingleResponse>(`/students/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>('/students', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}
