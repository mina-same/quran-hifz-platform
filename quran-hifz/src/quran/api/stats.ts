import { useQuery } from "@tanstack/react-query";
import { get } from "../../lib/api";
import type { GenderScope } from "../lib/genderScope";
import { todayKey } from "../lib/dailyReport";

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

type StatsResponse = { success: boolean; data: DashboardStats };

export function useStats(gender?: GenderScope) {
  const q = gender && gender !== "all" ? `?gender=${gender}` : "";
  return useQuery({
    queryKey: ["stats", gender ?? "all"],
    queryFn: () => get<StatsResponse>(`/stats/dashboard${q}`).then((r) => r.data),
  });
}

export type DashboardAlerts = {
  absent: { name: string; pct: number }[];
  nearCapacity: { title: string; pct: number }[];
  excellent: string[];
  reportMissing: string[];
};

/** «آخر التنبيهات» — computed server-side from real records. */
export function useDashboardAlerts(gender?: GenderScope) {
  const params = new URLSearchParams({ today: todayKey() });
  if (gender && gender !== "all") params.set("gender", gender);
  return useQuery({
    queryKey: ["stats-alerts", gender ?? "all", params.get("today")],
    queryFn: () =>
      get<{ success: boolean; data: DashboardAlerts }>(`/stats/alerts?${params}`).then((r) => r.data),
  });
}
