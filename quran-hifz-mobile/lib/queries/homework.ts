import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export type Homework = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher: { _id: string; name: string } | string;
  halqa: { _id: string; name: string } | string;
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
  status?: string;
};

type ListResponse = { success: boolean; count: number; data: Homework[] };

function buildQuery(filters?: HomeworkFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.student) params.set('student', filters.student);
  if (filters.teacher) params.set('teacher', filters.teacher);
  if (filters.halqa) params.set('halqa', filters.halqa);
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
