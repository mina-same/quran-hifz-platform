import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

export type ParentUser = {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  children: Array<{ _id: string; name: string; path: string }>;
};

type ListResponse = { success: boolean; count: number; data: ParentUser[] };
type CreateResponse = { success: boolean; data: { _id: string; name: string; email: string }; credentials: { email: string; password: string } };

export function useAdminParents() {
  return useQuery({
    queryKey: ['admin-parents'],
    queryFn: () => get<ListResponse>('/admin/parents').then((r) => r.data),
  });
}

export function useCreateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      post<CreateResponse>('/admin/parents', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-parents'] }),
  });
}

export function useLinkChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
      post(`/admin/parents/${parentId}/children/${studentId}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-parents'] }),
  });
}

export function useUnlinkChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
      del(`/admin/parents/${parentId}/children/${studentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-parents'] }),
  });
}

export function useUpdateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, ...body }: { parentId: string; name?: string; email?: string; newPassword?: string }) =>
      put(`/admin/parents/${parentId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-parents'] }),
  });
}
