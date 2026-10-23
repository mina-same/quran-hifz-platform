import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { todayIso } from '@/lib/date';

export type RankPeriod = 'week' | 'month' | 'all';
export type MyRankRow = { name: string; trackTitle: string; points: number; rank: number; me: boolean };
export type MyRanking = {
  period: RankPeriod; from: string | null; to: string;
  me: {
    points: number; avg10: number; days: number;
    rankInTrack: number; trackSize: number; rankInSection: number; sectionSize: number; trackTitle: string;
  };
  track: MyRankRow[];
  section: MyRankRow[];
};

export const PERIOD_LABEL: Record<RankPeriod, string> = {
  week: 'آخر ٧ أيام',
  month: 'هذا الشهر',
  all: 'منذ البداية',
};

/** Student «لوحة الشرف» — own rank in the halqa and the section (web parity). */
export function useMyRanking(period: RankPeriod) {
  return useQuery({
    queryKey: ['my-ranking', period],
    queryFn: () =>
      get<{ success: boolean; data: MyRanking }>(`/rankings/me?period=${period}&today=${todayIso()}`).then((r) => r.data),
  });
}
