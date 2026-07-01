import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export type AttendanceRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  halqa: { _id: string; name: string } | string;
  date: string;
  day: string;
  time: string;
  status: 'حاضر' | 'غائب' | 'متأخر';
};

export type AttendanceFilters = {
  student?: string;
  halqa?: string;
  from?: string;
  to?: string;
};

type ListResponse = { success: boolean; count: number; data: AttendanceRecord[] };

function buildQuery(filters?: AttendanceFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.student) params.set('student', filters.student);
  if (filters.halqa) params.set('halqa', filters.halqa);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function useAttendance(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: () => get<ListResponse>(`/attendance${buildQuery(filters)}`).then((r) => r.data),
  });
}
