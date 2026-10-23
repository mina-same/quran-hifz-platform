import { useQuery } from "@tanstack/react-query";
import { get } from "../../lib/api";
import { todayKey } from "../lib/dailyReport";

export type RankPeriod = "week" | "month" | "all";

export type RankStudent = {
  id: string;
  name: string;
  trackId: string;
  trackTitle: string;
  points: number;
  avg10: number;
  attendancePct: number;
  days: number;
};
export type RankTrack = {
  id: string;
  title: string;
  students: number;
  points: number;
  avg10: number;
  attendancePct: number;
  champion: string | null;
  ranked: boolean;
};
export type RankTeacher = {
  id: string;
  name: string;
  tracks: string[];
  students: number;
  avg10: number;
  attendancePct: number;
  ranked: boolean;
};
export type RankSection = {
  students: RankStudent[];
  tracks: RankTrack[];
  teachers: RankTeacher[];
  totals: { students: number; points: number; avg10: number; attendancePct: number; days: number };
};
export type Rankings = {
  period: RankPeriod;
  from: string | null;
  to: string;
  sections: Partial<Record<"male" | "female", RankSection>>;
};

/** Admin / supervisor: leaderboards per section (a supervisor gets theirs only). */
export function useRankings(period: RankPeriod, enabled = true) {
  return useQuery({
    queryKey: ["rankings", period],
    queryFn: () =>
      get<{ success: boolean; data: Rankings }>(
        `/rankings?period=${period}&today=${todayKey()}`,
      ).then((r) => r.data),
    enabled,
  });
}

export type MyRankRow = {
  name: string;
  trackTitle: string;
  points: number;
  rank: number;
  me: boolean;
};
export type MyRanking = {
  period: RankPeriod;
  from: string | null;
  to: string;
  me: {
    points: number;
    avg10: number;
    days: number;
    rankInTrack: number;
    trackSize: number;
    rankInSection: number;
    sectionSize: number;
    trackTitle: string;
  };
  track: MyRankRow[];
  section: MyRankRow[];
};

/** Student: «لوحة الشرف» — own rank in the halqa and the section. */
export function useMyRanking(period: RankPeriod) {
  return useQuery({
    queryKey: ["my-ranking", period],
    queryFn: () =>
      get<{ success: boolean; data: MyRanking }>(
        `/rankings/me?period=${period}&today=${todayKey()}`,
      ).then((r) => r.data),
  });
}

export const PERIOD_LABEL: Record<RankPeriod, string> = {
  week: "آخر ٧ أيام",
  month: "هذا الشهر",
  all: "منذ البداية",
};
