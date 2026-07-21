import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';

export type SpecialTrack = {
  _id: string;
  title: string;
  type: string;
  status: 'active' | 'upcoming' | 'ended';
  startDate: string;
  endDate: string;
  daysPerWeek: string;
  timeSlot: string;
  location: string;
  teacher: { _id: string; name: string } | string;
  maxStudents: number;
  enrolledStudents?: ({ _id: string; name: string } | string)[];
  notes?: string;
};

type ListResponse = { success: boolean; count: number; data: SpecialTrack[] };
type SingleResponse = { success: boolean; data: SpecialTrack };

export function useSpecialTracks() {
  return useQuery({
    queryKey: ['special-tracks'],
    queryFn: () => get<ListResponse>('/special-tracks').then((r) => r.data),
  });
}

export function useCreateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>('/special-tracks', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['special-tracks'] }),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/special-tracks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['special-tracks'] }),
  });
}
