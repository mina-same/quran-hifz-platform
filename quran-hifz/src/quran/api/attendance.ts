import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../../lib/api";

export type AttendanceRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  halqa?: { _id: string; name: string } | string;
  specialTrack?: { _id: string; title: string } | string;
  date: string;
  day: string;
  time: string;
  status: "حاضر" | "غائب" | "متأخر";
};

export type AttendanceFilters = {
  student?: string;
  halqa?: string;
  specialTrack?: string;
  from?: string;
  to?: string;
};

type ListResponse = { success: boolean; count: number; data: AttendanceRecord[] };

function buildQuery(f?: AttendanceFilters) {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.student) p.set("student", f.student);
  if (f.halqa) p.set("halqa", f.halqa);
  if (f.specialTrack) p.set("specialTrack", f.specialTrack);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export function useAttendance(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ["attendance", filters],
    queryFn: () => get<ListResponse>(`/attendance${buildQuery(filters)}`).then((r) => r.data),
    enabled: !!(filters?.student || filters?.halqa || filters?.specialTrack),
  });
}

export function useRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { student: string; halqa?: string; specialTrack?: string; date: string; status: string }) =>
      post("/attendance", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useBulkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { halqa?: string; specialTrack?: string; date: string; records: { student: string; status: string }[] }) =>
      post("/attendance/bulk", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
