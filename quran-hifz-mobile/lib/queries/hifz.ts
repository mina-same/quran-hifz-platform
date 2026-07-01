import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export type HifzEntry = {
  _id: string;
  surah: string;
  surahNumber: number;
  status: 'مكتمل' | 'جارٍ' | 'لم يبدأ';
  completionDate?: string;
  notes?: string;
};

type ListResponse = { success: boolean; data: HifzEntry[] };

export function useHifz(studentId: string | undefined) {
  return useQuery({
    queryKey: ['hifz', studentId],
    queryFn: () => get<ListResponse>(`/hifz/${studentId}`).then((r) => r.data),
    enabled: !!studentId,
  });
}
