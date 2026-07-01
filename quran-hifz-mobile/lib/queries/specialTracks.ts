import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

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

export function useSpecialTracks() {
  return useQuery({
    queryKey: ['special-tracks'],
    queryFn: () => get<ListResponse>('/special-tracks').then((r) => r.data),
  });
}
