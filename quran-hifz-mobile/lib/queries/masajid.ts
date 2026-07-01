import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export type Masjid = {
  _id: string;
  name: string;
  location: string;
};

type ListResponse = { success: boolean; count: number; data: Masjid[] };
type SingleResponse = { success: boolean; data: Masjid };

export function useMasajid() {
  return useQuery({
    queryKey: ['masajid'],
    queryFn: () => get<ListResponse>('/masajid').then((r) => r.data),
  });
}

export function useMasjid(id: string | undefined) {
  return useQuery({
    queryKey: ['masajid', id],
    queryFn: () => get<SingleResponse>(`/masajid/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
