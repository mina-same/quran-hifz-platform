import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import type { GenderScope } from '@/lib/constants/genderScope';
import { todayIso } from '@/lib/date';

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

export type DashboardAlerts = {
  absent: { name: string; pct: number }[];
  nearCapacity: { title: string; pct: number }[];
  excellent: string[];
  reportMissing: string[];
  /** Grades/attendance changed after being saved, today. */
  gradeEdits: number;
};

/** «آخر التنبيهات» — computed server-side from real records (web parity). */
export function useDashboardAlerts(gender?: GenderScope) {
  const today = todayIso();
  const g = gender && gender !== 'all' ? `&gender=${gender}` : '';
  return useQuery({
    queryKey: ['stats-alerts', gender ?? 'all', today],
    queryFn: () =>
      get<{ success: boolean; data: DashboardAlerts }>(`/stats/alerts?today=${today}${g}`).then((r) => r.data),
  });
}
