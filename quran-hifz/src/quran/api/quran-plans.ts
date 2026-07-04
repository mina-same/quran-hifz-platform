import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "../../lib/api";

/** sessionStorage key used to hand off "create a plan for this track" from the
 * Special Tracks page to TeacherPlans, which reads it on mount and opens the
 * create modal pre-filled with targetType "specialTrack". */
export const PLAN_PREFILL_TRACK_KEY = "qh_prefill_plan_track";

export type PlanType = "حفظ" | "مراجعة" | "ترتيل" | "تلاوة";

export type PointRule = { label: string; amount: number; kind: "خصم" | "زيادة" };
export type RangePoint = { surahNumber: number; ayah: number };
export type PlanTeacher     = { _id: string; name: string };
export type PlanHalqa       = { _id: string; name: string };
export type PlanStudent     = { _id: string; name: string };
export type PlanSpecialTrack = { _id: string; title: string };
export type TodayAssignment = { surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number; pageStart: number; pageEnd: number };
export type PlanProgress = { completed: number; total: number; percent: number };
export type JuzProgress = { completed: number; total: number };
export type PageRange = { pageStart: number; pageEnd: number; pageCount: number };
export type ScheduleEntry = TodayAssignment & { occurrenceIndex: number; date: string; juz: number };

export type QuranPlan = {
  _id: string;
  name: string;
  type: PlanType;
  description?: string;
  teacher: PlanTeacher | string;

  targetType: "halqa" | "students" | "specialTrack";
  halqa?: PlanHalqa | string;
  students?: (PlanStudent | string)[];
  specialTrack?: PlanSpecialTrack | string;

  days: string[];
  startDate: string;

  rangeStart: RangePoint;
  rangeEnd: RangePoint;

  pointsEnabled: boolean;
  pointRules: PointRule[];

  endType: "activeDays" | "date";
  activeDaysCount?: number;
  endDate?: string;

  status: "نشطة" | "متوقفة" | "منتهية";
  todayAssignment: TodayAssignment | null;
  progress: PlanProgress | null;
  juzProgress: JuzProgress | null;
  pageRange: PageRange;
  schedule: ScheduleEntry[];
};

type ListResponse   = { success: boolean; count: number; data: QuranPlan[] };
type SingleResponse = { success: boolean; data: QuranPlan };

export function useQuranPlans(filters?: { teacher?: string; halqa?: string; student?: string; specialTrack?: string }) {
  const params = new URLSearchParams();
  if (filters?.teacher)     params.set("teacher", filters.teacher);
  if (filters?.halqa)       params.set("halqa", filters.halqa);
  if (filters?.student)     params.set("student", filters.student);
  if (filters?.specialTrack) params.set("specialTrack", filters.specialTrack);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["quran-plans", filters?.teacher ?? "", filters?.halqa ?? "", filters?.student ?? "", filters?.specialTrack ?? ""],
    queryFn: () => get<ListResponse>(`/quran-plans${qs}`).then((r) => r.data),
  });
}

export function useQuranPlan(id?: string) {
  return useQuery({
    queryKey: ["quran-plans", id],
    queryFn: () => get<SingleResponse>(`/quran-plans/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
}

export function useCreateQuranPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>("/quran-plans", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quran-plans"] }),
  });
}

export function useUpdateQuranPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      put<SingleResponse>(`/quran-plans/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quran-plans"] }),
  });
}

export function useDeleteQuranPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/quran-plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quran-plans"] }),
  });
}
