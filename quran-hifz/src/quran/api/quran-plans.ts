import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isReversedRange } from "../lib/quranRange";
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
  // Plans are halqa-based. `halqaId` pre-selects the halqa target so the track
  // detail's "create plan" buttons open the form ready on that halqa. (`trackId`
  // is legacy and no longer emitted by the UI.)
  | { mode: "create"; trackId?: string; halqaId?: string }
  | { mode: "edit" | "duplicate"; plan: QuranPlan };

export type PlanType = "حفظ" | "مراجعة";

/** One line of a plan's daily grading rubric — what is graded, out of how many. */
export type GradeCriterion = { key: string; label: string; max: number; auto: boolean };

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

/** One type's track inside a plan: its own weekdays, its own stretch of the
 * mushaf, and its own schedule. `occurrenceIndex` inside `schedule` is 1-based
 * WITHIN this segment, so a day is addressed by (type, occurrenceIndex). */
export type PlanSegment = {
  type: PlanType;
  days: string[];
  rangeStart: RangePoint;
  rangeEnd: RangePoint;
  todayAssignment: (TodayAssignment & { type: PlanType }) | null;
  progress: PlanProgress | null;
  juzProgress: JuzProgress | null;
  pageRange: PageRange;
  schedule: (ScheduleEntry & { type: PlanType })[];
  scheduleIsPersisted: boolean;
};

export type QuranPlan = {
  _id: string;
  name: string;
  description?: string;

  /** One track per type — the real scheduling data. Always present: the server
   * migrates a legacy single-type plan into a one-element array on read. */
  segments: PlanSegment[];
  /** Every type in the plan, in segment order. */
  types: PlanType[];
  /** Rollup — the type due today, else the first segment's. Kept so screens
   * that only render a badge need no change. */
  type: PlanType;
  teacher: PlanTeacher | string;

  targetType: "halqa" | "students" | "specialTrack";
  halqa?: PlanHalqa | string;
  students?: (PlanStudent | string)[];
  specialTrack?: PlanSpecialTrack | string;

  /** Rollup — every segment's days merged. Scheduling reads `segments`. */
  days: string[];
  /** Calendar days (YYYY-MM-DD) the plan pauses on — see quranRange. */
  holidays: string[];
  startDate: string;

  pointsEnabled: boolean;
  pointRules: PointRule[];

  /** Per-plan daily grading split. Defaults to DEFAULT_GRADE_RUBRIC server-side. */
  gradeRubric: GradeCriterion[];

  endType: "activeDays" | "date";
  activeDaysCount?: number;
  endDate?: string;

  status: "نشطة" | "متوقفة" | "منتهية";

  /* ── rollups across every segment ──────────────────────────────────────
   * Days are partitioned, so at most one type is due on any date and
   * `todayAssignment` is single-valued. `schedule` is every segment's days
   * merged and date-sorted, each entry carrying its own `type`. */
  todayAssignment: (TodayAssignment & { type: PlanType }) | null;
  todayAssignments: (TodayAssignment & { type: PlanType })[];
  progress: PlanProgress | null;
  juzProgress: JuzProgress | null;
  pageRange: PageRange | null;
  schedule: (ScheduleEntry & { type: PlanType })[];
  /** Whether every segment's schedule came from the persisted field (frozen
   * via `useGenerateSchedule`) rather than being recomputed live. */
  scheduleIsPersisted: boolean;
};

/** The segment carrying a given type — or the plan's only segment when the
 * type is omitted and there is just one. Returns undefined when ambiguous. */
export function planSegment(plan: QuranPlan | undefined, type?: PlanType): PlanSegment | undefined {
  if (!plan) return undefined;
  if (type) return plan.segments?.find((s) => s.type === type);
  return plan.segments?.length === 1 ? plan.segments[0] : undefined;
}

/** Whether a segment's range runs backward through the mushaf. Direction is
 * per segment: مراجعة may run forward while حفظ runs backward, so this must
 * never be read off the plan as a whole. */
export function segmentReversed(plan: QuranPlan | undefined, type?: PlanType): boolean {
  const seg = planSegment(plan, type);
  return seg ? isReversedRange(seg.rangeStart, seg.rangeEnd) : false;
}

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
