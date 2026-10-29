import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { todayIso } from '@/lib/date';
import { usePortalStore } from '@/lib/store/portalStore';

export type KpiStatus = 'achieved' | 'near' | 'below' | 'nodata';

/** One indicator, computed by the server from this month's real records. */
export type KPI = {
  _id: string;
  key: string;
  indicator: string;
  /** How the value is computed. */
  hint: string;
  value: number | null;
  target: string;
  actual: string;
  status: KpiStatus;
  /** 0–100: progress toward the target. */
  progress: number;
  rating: 'ممتاز' | 'جيد' | 'مقبول' | 'ضعيف';
};

export const KPI_STATUS: Record<KpiStatus, { label: string; variant: 'green' | 'gold' | 'red' | 'gray' }> = {
  achieved: { label: 'محقق', variant: 'green' },
  near: { label: 'قريب من الهدف', variant: 'gold' },
  below: { label: 'دون الهدف', variant: 'red' },
  nodata: { label: 'لا توجد بيانات', variant: 'gray' },
};

type ListResponse = { success: boolean; count: number; data: KPI[] };

/** This month's indicators for the active gender scope (web parity). */
export function useKpis() {
  const genderScope = usePortalStore((s) => s.genderScope);
  const today = todayIso();
  const gender = genderScope && genderScope !== 'all' ? `&gender=${genderScope}` : '';
  return useQuery({
    queryKey: ['kpis', genderScope, today],
    queryFn: () => get<ListResponse>(`/kpis?today=${today}${gender}`).then((r) => r.data),
  });
}
