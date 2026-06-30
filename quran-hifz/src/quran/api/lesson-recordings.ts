import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "../../lib/api";

export type LessonRecording = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher: { _id: string; name: string } | string;
  halqa: { _id: string; name: string } | string;
  type: string;
  segment: string;
  points: number;
  teacherNote?: string;
  audioUrl?: string;
  recordedAt: string;
};

type ListFilters = { student?: string; teacher?: string; halqa?: string };
type ListResponse = { success: boolean; count: number; data: LessonRecording[] };
type SingleResponse = { success: boolean; data: LessonRecording };

function buildQuery(f: ListFilters) {
  const p = new URLSearchParams();
  if (f.student) p.set("student", f.student);
  if (f.teacher) p.set("teacher", f.teacher);
  if (f.halqa)   p.set("halqa",   f.halqa);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export function useRecordings(filters: ListFilters = {}) {
  return useQuery({
    queryKey: ["lesson-recordings", filters],
    queryFn: () => get<ListResponse>(`/lesson-recordings${buildQuery(filters)}`).then((r) => r.data),
  });
}

export function useCreateRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>("/lesson-recordings", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson-recordings"] }),
  });
}

export function useDeleteRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/lesson-recordings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson-recordings"] }),
  });
}
