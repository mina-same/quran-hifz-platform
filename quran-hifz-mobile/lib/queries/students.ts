import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

export type Student = {
  _id: string;
  name: string;
  path: string;
  level?: number;
  /** Populated with `name teacher time days capacity` by the server. */
  halqa:
    | { _id: string; name: string; time?: string; days?: string; specialTrack?: { _id: string; title: string } | string }
    | string;
  masjid: { _id: string; name: string } | string;
  attendancePct: number;
  progressPct: number;
  progressPages: number;
  totalPages: number;
  /** Legacy fields — real guardian identity comes from parentName/parentEmail below. */
  guardian: string;
  guardianPhone: string;
  /** Saudi national ID — 10 digits, leading 1 (مواطن) or 2 (مقيم). */
  nationalId?: string;
  lastMemorization: string;
  status: 'active' | 'inactive' | 'new';
  homeworkStatus: 'submitted' | 'pending' | 'late';
  email: string | null;
  parentName: string | null;
  parentEmail: string | null;
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
type CreateResponse = { success: boolean; data: Student; credentials?: { email: string; password: string } };

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

export function useStudents(filters?: StudentFilters, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: () => get<ListResponse>(`/students${buildQuery(filters)}`).then((r) => r.data),
    enabled: opts?.enabled,
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
    mutationFn: (body: Record<string, unknown>) => post<CreateResponse>('/students', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      put<SingleResponse>(`/students/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/students/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}
