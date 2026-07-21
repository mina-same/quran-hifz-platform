import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api';

export type Homework = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher: { _id: string; name: string } | string;
  halqa?: { _id: string; name: string } | string;
  specialTrack?: { _id: string; title: string } | string;
  type: string;
  segment: string;
  dueDate: string;
  submittedAt?: string;
  status: 'مراجع' | 'معلق' | 'متأخر';
  rating?: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول';
  notes?: string;
};

export type HomeworkFilters = {
  student?: string;
  teacher?: string;
  halqa?: string;
  specialTrack?: string;
  status?: string;
};

type ListResponse = { success: boolean; count: number; data: Homework[] };
type SingleResponse = { success: boolean; data: Homework };

function buildQuery(filters?: HomeworkFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.student) params.set('student', filters.student);
  if (filters.teacher) params.set('teacher', filters.teacher);
  if (filters.halqa) params.set('halqa', filters.halqa);
  if (filters.specialTrack) params.set('specialTrack', filters.specialTrack);
  if (filters.status) params.set('status', filters.status);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function useHomework(filters?: HomeworkFilters) {
  return useQuery({
    queryKey: ['homework', filters],
    queryFn: () => get<ListResponse>(`/homework${buildQuery(filters)}`).then((r) => r.data),
  });
}

export function useCreateHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>('/homework', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homework'] }),
  });
}

export function useGradeHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; rating?: string; notes?: string }) =>
      patch<SingleResponse>(`/homework/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homework'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/homework/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homework'] }),
  });
}
