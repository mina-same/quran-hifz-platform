import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';

export type SupervisorUser = {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  gender: 'male' | 'female';
};

type ListResponse = { success: boolean; count: number; data: SupervisorUser[] };
type CreateResponse = {
  success: boolean;
  data: { _id: string; name: string; email: string; gender: 'male' | 'female' };
  credentials: { email: string; password: string };
};

export function useAdminSupervisors() {
  return useQuery({
    queryKey: ['admin-supervisors'],
    queryFn: () => get<ListResponse>('/admin/supervisors').then((r) => r.data),
  });
}

export function useCreateSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string; gender: 'male' | 'female' }) =>
      post<CreateResponse>('/admin/supervisors', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-supervisors'] }),
  });
}

export function useDeleteSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (supervisorId: string) => del(`/admin/supervisors/${supervisorId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-supervisors'] }),
  });
}
