import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../../lib/api";

/** sessionStorage key used to hand off "take attendance for this track" from
 * the Tracks page to TeacherAttendance, which reads it on mount and jumps
 * straight to that track's attendance list instead of showing the picker. */
export const ATTENDANCE_PREFILL_TRACK_KEY = "qh_prefill_attendance_track";

export type AttendanceRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  track?: { _id: string; title: string } | string;
  date: string;
  day: string;
  time: string;
  status: "حاضر" | "غائب" | "متأخر";
};

export type AttendanceFilters = {
  student?: string;
  track?: string;
  from?: string;
  to?: string;
};

type ListResponse = { success: boolean; count: number; data: AttendanceRecord[] };

function buildQuery(f?: AttendanceFilters) {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.student) p.set("student", f.student);
  if (f.track) p.set("track", f.track);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export function useAttendance(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ["attendance", filters],
    queryFn: () => get<ListResponse>(`/attendance${buildQuery(filters)}`).then((r) => r.data),
    enabled: !!(filters?.student || filters?.track),
  });
}

export function useRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { student: string; track?: string; date: string; status: string }) =>
      post("/attendance", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export type BulkAttendanceResponse = {
  success: boolean;
  message: string;
  notified: number;
  unnotified: { id: string; name: string }[];
};

export function useBulkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { track?: string; date: string; records: { student: string; status: string }[] }) =>
      post<BulkAttendanceResponse>("/attendance/bulk", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
