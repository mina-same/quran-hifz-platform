import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "../../lib/api";

export type Teacher = {
  _id: string;
  name: string;
  specialty: string;
  phone: string;
  rating: string;
  status: "active" | "inactive";
  halqatCount?: number;
  studentCount?: number;
};

type ListResponse = { success: boolean; count: number; data: Teacher[] };
type SingleResponse = { success: boolean; data: Teacher };

export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: () => get<ListResponse>("/teachers").then((r) => r.data),
  });
}

export function useTeacher(id: string | undefined) {
  return useQuery({
    queryKey: ["teachers", id],
    queryFn: () => get<SingleResponse>(`/teachers/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>("/teachers", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/teachers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}
