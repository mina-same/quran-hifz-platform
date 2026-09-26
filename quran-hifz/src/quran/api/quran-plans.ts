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
  | { mode: "create"; trackId?: string }
  | { mode: "edit" | "duplicate"; plan: QuranPlan };

export type PlanType = "حفظ" | "مراجعة" | "ختمة";

/** One line of a plan's daily grading rubric — what is graded, out of how many. */
export type GradeCriterion = { key: string; label: string; max: number; auto: boolean };

export type PointRule = { label: string; amount: number; kind: "خصم" | "زيادة" };
export type RangePoint = { surahNumber: number; ayah: number };
export type PlanTeacher = { _id: string; name: string };
export type PlanStudent = { _id: string; name: string };
export type PlanTrack   = { _id: string; title: string };
export type TodayAssignment = { surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number; pageStart: number; pageEnd: number };
export type PlanProgress = { completed: number; total: number; percent: number };
export type JuzProgress = { completed: number; total: number };
export type PageRange = { pageStart: number; pageEnd: number; pageCount: number };
/** `open` marks an open-ward plan's date-only entry — its slice fields are
 * absent. Screens branch on `isOpenPlan(plan)` before reading a schedule. */
export type ScheduleEntry = TodayAssignment & { occurrenceIndex: number; date: string; juz: number; open?: true };
/** Today's ward on an open-ward plan: due, but with no fixed slice. */
export type OpenAssignment = { type: PlanType; open: true };
export type PlanAssignment = (TodayAssignment & { type: PlanType; open?: undefined }) | OpenAssignment;

/** One type's track inside a plan: its own weekdays, its own stretch of the
 * mushaf, and its own schedule. `occurrenceIndex` inside `schedule` is 1-based
 * WITHIN this segment, so a day is addressed by (type, occurrenceIndex). */
export type PlanSegment = {
  type: PlanType;
  days: string[];
  /** null on an open-ward plan. */
  rangeStart: RangePoint | null;
  rangeEnd: RangePoint | null;
  todayAssignment: PlanAssignment | null;
  progress: PlanProgress | null;
  juzProgress: JuzProgress | null;
  pageRange: PageRange | null;
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
  /** No fixed range: the teacher records what was memorized each day
   * (api/open-ward.ts). Immutable after creation. */
  openWard: boolean;
  /** Every type in the plan, in segment order. */
  types: PlanType[];
  /** Rollup — the type due today, else the first segment's. Kept so screens
   * that only render a badge need no change. */
  type: PlanType;
  teacher: PlanTeacher | string;

  targetType: "track" | "students";
  track?: PlanTrack | string;
  students?: (PlanStudent | string)[];

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
   * A date can now belong to more than one segment (حفظ + مراجعة sharing a
   * weekday), so use the plural `todayAssignments` — it holds every type due
   * today. `todayAssignment` is a deprecated first-match fallback (the first
   * entry of `todayAssignments`, or null), kept only for callers that still
   * assume a single value. `schedule` is every segment's days merged and
   * date-sorted, each entry carrying its own `type`. */
  todayAssignment: PlanAssignment | null;
  todayAssignments: PlanAssignment[];
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
  return seg?.rangeStart && seg.rangeEnd ? isReversedRange(seg.rangeStart, seg.rangeEnd) : false;
}

export function isOpenPlan(plan?: QuranPlan | null): boolean {
  return Boolean(plan?.openWard);
}

/** Narrows a today-assignment to a real slice (false for an open-ward day). */
export function isSlice(a: PlanAssignment | null | undefined): a is TodayAssignment & { type: PlanType; open?: undefined } {
  return Boolean(a) && !(a as PlanAssignment).open;
}

/** Human-readable label for a plan's schedule window — used wherever a
 * Track's own (now-vestigial) startDate/endDate used to be shown, since the
 * real schedule now lives on the linked plan. Fixed-date plans show the full
 * range; `activeDays` plans have no fixed end date, so they show the start
 * plus the active-day count instead. Takes the caller's own date formatter so
 * each screen keeps its existing date-format convention. */
export function planScheduleRangeLabel(plan: QuranPlan, fmtDate: (d: string) => string): string {
  if (plan.endType === "date" && plan.endDate) {
    return `${fmtDate(plan.startDate)} — ${fmtDate(plan.endDate)}`;
  }
  return `من ${fmtDate(plan.startDate)} · ${plan.activeDaysCount ?? 0} يوم نشط`;
}

type ListResponse   = { success: boolean; count: number; data: QuranPlan[] };
type SingleResponse = { success: boolean; data: QuranPlan };

export function useQuranPlans(filters?: { teacher?: string; track?: string; student?: string }) {
  const params = new URLSearchParams();
  if (filters?.teacher) params.set("teacher", filters.teacher);
  if (filters?.track)   params.set("track", filters.track);
  if (filters?.student) params.set("student", filters.student);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["quran-plans", filters?.teacher ?? "", filters?.track ?? "", filters?.student ?? ""],
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
    // A new plan can change which plan resolveRubric() picks for its track
    // (single-active-plan vs ambiguous) — see useUpdateQuranPlan below.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quran-plans"] });
      qc.invalidateQueries({ queryKey: ["evaluation-rubric"] });
    },
  });
}

export function useUpdateQuranPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      put<SingleResponse>(`/quran-plans/${id}`, body),
    // useRubric() (api/evaluations.ts) is keyed under "evaluation-rubric", a
    // separate query from "quran-plans" — editing a plan's gradeRubric (or
    // its track/status, which changes what resolveRubric() resolves to) must
    // invalidate both, or the grading screen keeps showing the stale rubric
    // until a full page reload.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quran-plans"] });
      qc.invalidateQueries({ queryKey: ["evaluation-rubric"] });
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quran-plans"] });
      qc.invalidateQueries({ queryKey: ["evaluation-rubric"] });
    },
  });
}
