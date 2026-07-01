import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export type Teacher = {
  _id: string;
  name: string;
  specialty: string;
  phone?: string;
  rating: string;
  status: 'active' | 'inactive';
  halqatCount?: number;
  studentCount?: number;
};

type ListResponse = { success: boolean; count: number; data: Teacher[] };
type SingleResponse = { success: boolean; data: Teacher };

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: () => get<ListResponse>('/teachers').then((r) => r.data),
  });
}

export function useTeacher(id: string | undefined) {
  return useQuery({
    queryKey: ['teachers', id],
    queryFn: () => get<SingleResponse>(`/teachers/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
