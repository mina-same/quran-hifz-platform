import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';

export type AttendanceRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  halqa?: { _id: string; name: string } | string;
  specialTrack?: { _id: string; title: string } | string;
  date: string;
  day: string;
  time: string;
  status: 'حاضر' | 'غائب' | 'متأخر';
};

export type AttendanceFilters = {
  student?: string;
  halqa?: string;
  specialTrack?: string;
  from?: string;
  to?: string;
};

type ListResponse = { success: boolean; count: number; data: AttendanceRecord[] };

function buildQuery(filters?: AttendanceFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.student) params.set('student', filters.student);
  if (filters.halqa) params.set('halqa', filters.halqa);
  if (filters.specialTrack) params.set('specialTrack', filters.specialTrack);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function useAttendance(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: () => get<ListResponse>(`/attendance${buildQuery(filters)}`).then((r) => r.data),
    enabled: !!(filters?.student || filters?.halqa || filters?.specialTrack),
  });
}

export function useRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      student: string;
      halqa?: string;
      specialTrack?: string;
      date: string;
      status: string;
    }) => post('/attendance', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export type BulkAttendanceResponse = {
  success: boolean;
  message: string;
  notified: number;
  unnotified: { id: string; name: string }[];
};

export function useBulkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      halqa?: string;
      specialTrack?: string;
      date: string;
      records: { student: string; status: string }[];
    }) => post<BulkAttendanceResponse>('/attendance/bulk', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
