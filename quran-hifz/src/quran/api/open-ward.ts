import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, del } from "../../lib/api";
import type { PlanType, RangePoint } from "./quran-plans";

/** What a student actually memorized on one day of an open-ward plan
 * (`QuranPlan.openWard`). `status: "none"` is the teacher's explicit
 * «لم يُسمِّع اليوم»; no entry at all means the day wasn't recorded. */
export type OpenWardStatus = "recorded" | "none";
export type OpenWardType = Exclude<PlanType, "ختمة">;
export type OpenWardEntry = {
  _id: string;
  plan: string;
  student: { _id: string; name: string } | string;
  type: OpenWardType;
  /** Calendar day YYYY-MM-DD. */
  date: string;
  status: OpenWardStatus;
  from?: RangePoint;
  to?: RangePoint;
  pageStart?: number;
  pageEnd?: number;
  pages?: number;
  ayahs?: number;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = { success: boolean; count: number; data: OpenWardEntry[] };
type UpsertResponse = { success: boolean; data: OpenWardEntry; overlapWarning: boolean };
type Filters = { student?: string; from?: string; to?: string };

export function entryStudentId(e: OpenWardEntry): string {
  return typeof e.student === "string" ? e.student : e.student._id;
}

/** Sorted newest first (server-side). */
export function useOpenWardEntries(planId?: string, filters?: Filters) {
  const params = new URLSearchParams();
  if (filters?.student) params.set("student", filters.student);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["open-ward", planId ?? "", filters?.student ?? "", filters?.from ?? "", filters?.to ?? ""],
    queryFn: () => get<ListResponse>(`/quran-plans/${planId}/open-ward${qs}`).then((r) => r.data),
    enabled: Boolean(planId),
  });
}

export function useUpsertOpenWard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, ...body }: {
      planId: string; studentId: string; type: OpenWardType; date: string;
      status: OpenWardStatus; from?: RangePoint; to?: RangePoint;
    }) => put<UpsertResponse>(`/quran-plans/${planId}/students/${studentId}/open-ward`, body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["open-ward", v.planId] }),
  });
}

export function useDeleteOpenWard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, type, date }: { planId: string; studentId: string; type: OpenWardType; date: string }) =>
      del(`/quran-plans/${planId}/students/${studentId}/open-ward?type=${encodeURIComponent(type)}&date=${date}`),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["open-ward", v.planId] }),
  });
}
