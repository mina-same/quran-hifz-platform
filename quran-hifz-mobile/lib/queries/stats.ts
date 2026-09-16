import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import type { GenderScope } from '@/lib/constants/genderScope';

export type DashboardStats = {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalTracks: number;
  totalMasajid: number;
  pendingHomework: number;
  lateHomework: number;
  avgAttendancePct: number;
  avgProgressPct: number;
};

type SingleResponse = { success: boolean; data: DashboardStats };

export function useStats(gender?: GenderScope) {
  const q = gender && gender !== 'all' ? `?gender=${gender}` : '';
  return useQuery({
    queryKey: ['stats', gender ?? 'all'],
    queryFn: () => get<SingleResponse>(`/stats/dashboard${q}`).then((r) => r.data),
  });
}
