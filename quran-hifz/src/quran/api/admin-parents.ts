import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "../../lib/api";

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
    queryKey: ["admin-parents"],
    queryFn: () => get<ListResponse>("/admin/parents").then((r) => r.data),
  });
}

export function useCreateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      post<CreateResponse>("/admin/parents", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-parents"] }),
  });
}

export function useLinkChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
      post(`/admin/parents/${parentId}/children/${studentId}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-parents"] }),
  });
}

export function useUnlinkChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
      del(`/admin/parents/${parentId}/children/${studentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-parents"] }),
  });
}

export function useUpdateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, ...body }: { parentId: string; name?: string; email?: string; newPassword?: string }) =>
      put(`/admin/parents/${parentId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-parents"] }),
  });
}

export function useStudentParent(studentId: string | null) {
  return useQuery({
    queryKey: ["student-parent", studentId],
    queryFn: () => get<{ success: boolean; data: { _id: string; name: string; email: string } | null }>(`/admin/students/${studentId}/parent`).then((r) => r.data),
    enabled: !!studentId,
  });
}

export function useSetStudentParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, parentId }: { studentId: string; parentId: string | null }) =>
      put(`/admin/students/${studentId}/parent`, { parentId }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["student-parent", vars.studentId] });
      qc.invalidateQueries({ queryKey: ["admin-parents"] });
    },
  });
}
