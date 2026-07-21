import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "../../lib/api";

/** sessionStorage key used to hand off "open the plan form" from wherever a
 * plan is created/edited/duplicated (TeacherPlans' list, TeacherTrackDetail's
 * plan tab) to the dedicated TeacherPlanForm page — same no-router-params
 * pattern as TRACK_DETAIL_ID_KEY. The full `QuranPlan`
 * is carried in the payload for edit/duplicate (already in memory in the
 * caller) rather than re-fetched by id. */
export const PLAN_DETAIL_ID_KEY = "qh_plan_detail_id";

export const PLAN_FORM_HANDOFF_KEY = "qh_plan_form_handoff";
export type PlanFormHandoff =
  | { mode: "create"; trackId?: string }
  | { mode: "edit" | "duplicate"; plan: QuranPlan };

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
  /** Whether `schedule` came from the persisted `schedule` field (frozen via
   * `useGenerateSchedule`) rather than being recomputed live on this fetch. */
  scheduleIsPersisted: boolean;
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

/** Freezes the plan's live-computed schedule into the DB. After this,
 * `schedule` comes from the persisted record instead of being recomputed on
 * every fetch, so a hand-edited day (see `useUpdateScheduleEntry`) sticks. */
export function useGenerateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<SingleResponse>(`/quran-plans/${id}/schedule/generate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quran-plans"] }),
  });
}

/** Hand-edits one day's ayah range within an already-persisted schedule (the
 * server 404s if the schedule hasn't been generated yet for this plan). Page
 * range and juz' default to being recomputed server-side from the new ayah
 * range, but pass `pageStart`/`pageEnd`/`juz` to override them directly. */
export function useUpdateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, occurrenceIndex, ...body }: {
      id: string; occurrenceIndex: number;
      surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number;
      pageStart?: number; pageEnd?: number; juz?: number;
    }) => put<SingleResponse>(`/quran-plans/${id}/schedule/${occurrenceIndex}`, body),
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
