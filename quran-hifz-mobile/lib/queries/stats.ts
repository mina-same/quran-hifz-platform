import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export type DashboardStats = {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalHalqat: number;
  totalMasajid: number;
  pendingHomework: number;
  lateHomework: number;
  avgAttendancePct: number;
  avgProgressPct: number;
};

type SingleResponse = { success: boolean; data: DashboardStats };

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => get<SingleResponse>('/stats/dashboard').then((r) => r.data),
  });
}
