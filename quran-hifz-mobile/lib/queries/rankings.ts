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

/* ── Admin / supervisor «تقرير الإنجاز والتميّز» (web: quran-hifz/src/quran/api/rankings.ts) ──
 * Separate period type so `RankPeriod`/`PERIOD_LABEL` above stay exactly as the
 * student leaderboard expects them. */
export type AdminRankPeriod = 'week' | 'month' | 'lastMonth' | 'all' | 'custom';
export const ADMIN_PERIOD_LABEL: Record<AdminRankPeriod, string> = {
  week: 'آخر ٧ أيام',
  month: 'هذا الشهر',
  lastMonth: 'الشهر الماضي',
  all: 'منذ البداية',
  custom: 'فترة مخصصة',
};

export type RankStudent = {
  id: string; name: string; trackId: string; trackTitle: string;
  points: number; avg10: number; attendancePct: number; days: number;
};
export type RankTrack = {
  id: string; title: string; students: number; points: number;
  avg10: number; attendancePct: number; champion: string | null; ranked: boolean;
};
export type RankTeacher = {
  id: string; name: string; tracks: string[]; students: number;
  avg10: number; attendancePct: number; ranked: boolean;
};
export type RankSection = {
  students: RankStudent[];
  tracks: RankTrack[];
  teachers: RankTeacher[];
  totals: { students: number; points: number; avg10: number; attendancePct: number; days: number };
};
export type Rankings = {
  period: AdminRankPeriod; from: string | null; to: string;
  /** `all` = both sections together, only when asked for with `withAll`. */
  sections: Partial<Record<'male' | 'female' | 'all', RankSection>>;
};

/** Admin / supervisor leaderboards per section (a supervisor gets theirs only). */
export function useRankings(
  period: AdminRankPeriod,
  opts: { from?: string; to?: string; masjid?: string; track?: string; withAll?: boolean } = {},
) {
  const params = new URLSearchParams({ period, today: todayIso() });
  if (period === 'custom' && opts.from && opts.to) {
    params.set('from', opts.from);
    params.set('to', opts.to);
  }
  if (opts.masjid) params.set('masjid', opts.masjid);
  if (opts.track) params.set('track', opts.track);
  if (opts.withAll) params.set('withAll', '1');
  return useQuery({
    queryKey: ['rankings', params.toString()],
    queryFn: () => get<{ success: boolean; data: Rankings }>(`/rankings?${params}`).then((r) => r.data),
    enabled: period !== 'custom' || (!!opts.from && !!opts.to && opts.from <= opts.to),
    placeholderData: (prev) => prev,
  });
}
