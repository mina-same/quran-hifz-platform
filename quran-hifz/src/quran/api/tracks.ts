import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "../../lib/api";

/** sessionStorage key used to hand off "open this track's detail page" from the
 * Tracks list to TeacherTrackDetail, which reads it on mount to know which
 * track to show (the hash-based router has no room for per-page params). */
export const TRACK_DETAIL_ID_KEY = "qh_track_detail_id";

/** sessionStorage key used to hand off "open the track form" from the Tracks
 * list to AdminTrackForm — same no-router-params pattern as
 * TRACK_DETAIL_ID_KEY / PLAN_FORM_HANDOFF_KEY. The full `Track` is carried in
 * the payload for edit mode (already in memory in the caller). */
export const TRACK_FORM_HANDOFF_KEY = "qh_track_form_handoff";
export type TrackFormHandoff =
  | { mode: "create" }
  | { mode: "edit"; track: Track };

export type TrackTeacher = { _id: string; name: string };
export type TrackMasjid  = { _id: string; name: string; location?: string; gender: "male" | "female" };

export type Track = {
  _id: string;
  masjid: TrackMasjid | string;
  title: string;
  type: string;
  status: "active" | "upcoming" | "ended";
  startDate: string;
  endDate: string;
  daysPerWeek: string;
  timeSlot: string;
  isOnline: boolean;
  meetLink?: string;
  teachers: (TrackTeacher | string)[];
  maxStudents: number;
  notes?: string;
  /** Computed server-side (`Student.countDocuments({track})`) — present on
   * every `useTracks` list response, not stored on the document itself. */
  studentCount?: number;
};

type ListResponse   = { success: boolean; count: number; data: Track[] };
type SingleResponse = { success: boolean; data: Track };

export function useTracks(status?: string, teacherId?: string) {
  const params = new URLSearchParams();
  if (status)    params.set("status",  status);
  if (teacherId) params.set("teacher", teacherId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["tracks", status ?? "", teacherId ?? ""],
    queryFn: () => get<ListResponse>(`/tracks${qs}`).then((r) => r.data),
  });
}

export function useTrack(id: string | undefined) {
  return useQuery({
    queryKey: ["tracks", id],
    queryFn: () => get<SingleResponse>(`/tracks/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>("/tracks", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracks"] }),
  });
}

export function useUpdateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      put<SingleResponse>(`/tracks/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracks"] }),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/tracks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracks"] }),
  });
}

/** Moves a student onto this track — a transfer, not an addition, since
 * `Student.track` is the student's sole membership (single-track-per-student
 * is intentional; there is no "add without removing from elsewhere"). */
export function useAssignStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      post<SingleResponse>(`/tracks/${id}/assign`, { studentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracks"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
