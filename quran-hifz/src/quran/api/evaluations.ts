import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../../lib/api";

export type EvaluationScores = { attendance: number; hifz: number; tajweed: number; talawah: number };

export type EvaluationRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher?: { _id: string; name: string } | string;
  halqa?: { _id: string; name: string } | string;
  specialTrack?: { _id: string; title: string } | string;
  date: string;
  attendanceStatus: "حاضر" | "غائب";
  scores: EvaluationScores;
  total: number;
  note?: string;
};

export type EvaluationFilters = {
  student?: string;
  halqa?: string;
  specialTrack?: string;
  from?: string;
  to?: string;
};

type ListResponse = { success: boolean; count: number; data: EvaluationRecord[] };

function buildQuery(f?: EvaluationFilters) {
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

/** Pass `undefined` to skip fetching (e.g. before a context is selected); pass an
 * empty object `{}` to deliberately fetch every evaluation with no filter (used
 * by the schoolwide aggregate chart in Reports). */
export function useEvaluations(filters?: EvaluationFilters) {
  return useQuery({
    queryKey: ["evaluations", filters],
    queryFn: () => get<ListResponse>(`/evaluations${buildQuery(filters)}`).then((r) => r.data),
    enabled: filters !== undefined,
  });
}

export type BulkEvaluateResponse = {
  success: boolean;
  message: string;
  notified: number;
  unnotified: { id: string; name: string }[];
};

export type BulkEvaluateRecord = {
  student: string;
  attendanceStatus: "حاضر" | "غائب";
  hifz: number;
  tajweed: number;
  talawah: number;
  note?: string;
};

export function useBulkEvaluate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { teacher: string; halqa?: string; specialTrack?: string; date: string; records: BulkEvaluateRecord[] }) =>
      post<BulkEvaluateResponse>("/evaluations/bulk", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
