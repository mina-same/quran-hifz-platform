import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "../../lib/api";

export type EnrolledStudent = { _id: string; name: string };
export type TrackTeacher    = { _id: string; name: string };

export type SpecialTrack = {
  _id: string;
  title: string;
  type: string;
  status: "active" | "upcoming" | "ended";
  startDate: string;
  endDate: string;
  daysPerWeek: string;
  timeSlot: string;
  location: string;
  isOnline: boolean;
  meetLink?: string;
  teachers: (TrackTeacher | string)[];
  maxStudents: number;
  enrolledStudents: (EnrolledStudent | string)[];
  notes?: string;
};

type ListResponse   = { success: boolean; count: number; data: SpecialTrack[] };
type SingleResponse = { success: boolean; data: SpecialTrack };

export function useSpecialTracks(status?: string, teacherId?: string, studentId?: string) {
  const params = new URLSearchParams();
  if (status)    params.set("status",  status);
  if (teacherId) params.set("teacher", teacherId);
  if (studentId) params.set("student", studentId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["special-tracks", status ?? "", teacherId ?? "", studentId ?? ""],
    queryFn: () => get<ListResponse>(`/special-tracks${qs}`).then((r) => r.data),
  });
}

export function useCreateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>("/special-tracks", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["special-tracks"] }),
  });
}

export function useUpdateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      put<SingleResponse>(`/special-tracks/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["special-tracks"] }),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/special-tracks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["special-tracks"] }),
  });
}

export function useEnrollStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      post<SingleResponse>(`/special-tracks/${id}/enroll`, { studentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["special-tracks"] }),
  });
}

export function useUnenrollStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      post<SingleResponse>(`/special-tracks/${id}/unenroll`, { studentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["special-tracks"] }),
  });
}
