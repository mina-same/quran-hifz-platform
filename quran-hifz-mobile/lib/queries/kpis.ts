import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export type KPI = {
  _id: string;
  indicator: string;
  target: string;
  actual: string;
  rating: 'ممتاز' | 'جيد' | 'مقبول' | 'ضعيف';
  period: string;
};

type ListResponse = { success: boolean; count: number; data: KPI[] };

export function useKpis() {
  return useQuery({
    queryKey: ['kpis'],
    queryFn: () => get<ListResponse>('/kpis').then((r) => r.data),
  });
}
