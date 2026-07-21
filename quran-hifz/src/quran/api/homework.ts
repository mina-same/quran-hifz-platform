import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del } from "../../lib/api";

export type Homework = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher: { _id: string; name: string } | string;
  halqa?: { _id: string; name: string } | string;
  specialTrack?: { _id: string; title: string } | string;
  type: string;
  segment: string;
  dueDate: string;
  submittedAt?: string;
  status: "مراجع" | "معلق" | "متأخر";
  rating?: "ممتاز" | "جيد جداً" | "جيد" | "مقبول";
  notes?: string;
};

export type HomeworkFilters = {
  student?: string;
  teacher?: string;
  halqa?: string;
  specialTrack?: string;
  status?: string;
};

type ListResponse = { success: boolean; count: number; data: Homework[] };
type SingleResponse = { success: boolean; data: Homework };

function buildQuery(f?: HomeworkFilters) {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.student) p.set("student", f.student);
  if (f.teacher) p.set("teacher", f.teacher);
  if (f.halqa) p.set("halqa", f.halqa);
  if (f.specialTrack) p.set("specialTrack", f.specialTrack);
  if (f.status) p.set("status", f.status);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export function useHomework(filters?: HomeworkFilters) {
  return useQuery({
    queryKey: ["homework", filters],
    queryFn: () => get<ListResponse>(`/homework${buildQuery(filters)}`).then((r) => r.data),
  });
}

export function useCreateHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>("/homework", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homework"] }),
  });
}

export function useGradeHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; rating?: string; notes?: string }) =>
      patch<SingleResponse>(`/homework/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/homework/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homework"] }),
  });
}
