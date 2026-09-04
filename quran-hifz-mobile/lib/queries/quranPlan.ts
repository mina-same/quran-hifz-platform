import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';
import { isReversedRange, type RangePoint, type ScheduleEntry } from '@/lib/quranRange';

export type PlanType = 'حفظ' | 'مراجعة';

/** One line of a plan's daily grading rubric — what is graded, out of how many. */
export type GradeCriterion = { key: string; label: string; max: number; auto: boolean };
export type PointRule = { label: string; amount: number; kind: 'خصم' | 'زيادة' };
export type PlanTeacher = { _id: string; name: string };
export type PlanHalqa = { _id: string; name: string };
export type PlanStudent = { _id: string; name: string };
export type PlanSpecialTrack = { _id: string; title: string };
export type TodayAssignment = { surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number; pageStart: number; pageEnd: number };
export type PlanProgress = { completed: number; total: number; percent: number };
export type JuzProgress = { completed: number; total: number };
export type PageRange = { pageStart: number; pageEnd: number; pageCount: number };

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

  targetType: 'halqa' | 'students' | 'specialTrack';
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
  /** Per-plan daily grading split; defaults server-side. */
  gradeRubric: GradeCriterion[];

  endType: 'activeDays' | 'date';
  activeDaysCount?: number;
  endDate?: string;

  status: 'نشطة' | 'متوقفة' | 'منتهية';

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
  scheduleIsPersisted: boolean;
};

/** The segment carrying a given type — or the plan's only segment when the
 * type is omitted and there is just one. Returns undefined when ambiguous. */
export function planSegment(plan: QuranPlan | undefined, type?: PlanType): PlanSegment | undefined {
  if (!plan) return undefined;
  if (type) return plan.segments?.find((s) => s.type === type);
  return plan.segments?.length === 1 ? plan.segments[0] : undefined;
}

/** Whether a segment's range runs backward through the mushaf (from the end
 * toward Al-Fatiha). Direction is per segment: مراجعة may run forward while
 * حفظ runs backward, so this must never be read off the plan as a whole. */
export function segmentReversed(plan: QuranPlan | undefined, type?: PlanType): boolean {
  const seg = planSegment(plan, type);
  return seg ? isReversedRange(seg.rangeStart, seg.rangeEnd) : false;
}

type ListResponse = { success: boolean; count: number; data: QuranPlan[] };
type SingleResponse = { success: boolean; data: QuranPlan };

export function useQuranPlans(
  filters?: { teacher?: string; halqa?: string; student?: string; specialTrack?: string },
  opts?: { enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (filters?.teacher) params.set('teacher', filters.teacher);
  if (filters?.halqa) params.set('halqa', filters.halqa);
  if (filters?.student) params.set('student', filters.student);
  if (filters?.specialTrack) params.set('specialTrack', filters.specialTrack);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: ['quran-plans', filters?.teacher ?? '', filters?.halqa ?? '', filters?.student ?? '', filters?.specialTrack ?? ''],
    queryFn: () => get<ListResponse>(`/quran-plans${qs}`).then((r) => r.data),
    enabled: opts?.enabled,
  });
}

export function useQuranPlan(id?: string) {
  return useQuery({
    queryKey: ['quran-plans', id],
    queryFn: () => get<SingleResponse>(`/quran-plans/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
}

export function useCreateQuranPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>('/quran-plans', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quran-plans'] }),
  });
}

export function useUpdateQuranPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      put<SingleResponse>(`/quran-plans/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quran-plans'] }),
  });
}

/** Freezes the plan's live-computed schedule into the DB — after this, `schedule`
 * comes from the persisted record instead of being recomputed on every fetch. */
export function useGenerateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<SingleResponse>(`/quran-plans/${id}/schedule/generate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quran-plans'] }),
  });
}

export function useUpdateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, occurrenceIndex, ...body }: {
      id: string; occurrenceIndex: number;
      surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number;
      pageStart?: number; pageEnd?: number; juz?: number;
    }) => put<SingleResponse>(`/quran-plans/${id}/schedule/${occurrenceIndex}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quran-plans'] }),
  });
}

export function useDeleteQuranPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/quran-plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quran-plans'] }),
  });
}

// ── Per-student individual plan overlay ──

export type StudentOccurrenceStatus = 'pending' | 'done' | 'partial' | 'absent';

export type StudentOccurrence = ScheduleEntry & {
  /** Which segment this day belongs to — `occurrenceIndex` restarts at 1 in
   * each, so a day is addressed by (type, occurrenceIndex). */
  type: PlanType;
  baseSurahStart: number; baseAyahStart: number;
  baseSurahEnd: number; baseAyahEnd: number;
  basePageStart: number; basePageEnd: number; baseJuz: number;
  status: StudentOccurrenceStatus;
  completedThroughSurah?: number;
  completedThroughAyah?: number;
  manualOverride: boolean;
  carryOverNote?: string;
  /** This day has no ward left: the student ran far enough ahead that the
   * plan's content ran out before its days did. */
  noWard?: boolean;
};

export type StudentPlanProgressResponse = {
  effectiveSchedule: StudentOccurrence[];
  progressIsPersisted: boolean;
  overflowPages: number;
};

type ProgressSingleResponse = { success: boolean; data: StudentPlanProgressResponse };

function progressKey(planId?: string, studentId?: string) {
  return ['student-plan-progress', planId ?? '', studentId ?? ''];
}

export function useStudentPlanProgress(planId?: string, studentId?: string) {
  return useQuery({
    queryKey: progressKey(planId, studentId),
    queryFn: () => get<ProgressSingleResponse>(`/quran-plans/${planId}/students/${studentId}/progress`).then((r) => r.data),
    enabled: Boolean(planId && studentId),
  });
}

/** Fetches every listed student's own effective schedule in one call (useQueries,
 * not a loop of useStudentPlanProgress, to respect the rules of hooks for a
 * dynamic-length list) — mirrors the web's per-student expandable roster rows. */
export function useStudentPlanProgressList(planId: string | undefined, studentIds: string[]) {
  const results = useQueries({
    queries: studentIds.map((studentId) => ({
      queryKey: progressKey(planId, studentId),
      queryFn: () => get<ProgressSingleResponse>(`/quran-plans/${planId}/students/${studentId}/progress`).then((r) => r.data),
      enabled: Boolean(planId && studentId),
    })),
  });
  const byStudentId: Record<string, StudentPlanProgressResponse | undefined> = {};
  studentIds.forEach((id, i) => { byStudentId[id] = results[i]?.data; });
  return byStudentId;
}

export function useRecordStudentOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, ...body }: {
      planId: string; studentId: string;
      /** Required when the plan has more than one type — occurrenceIndex alone
       * no longer identifies a day. */
      type?: PlanType;
      occurrenceIndex: number; status: 'done' | 'partial' | 'absent';
      completedThroughSurah?: number; completedThroughAyah?: number;
    }) => post<ProgressSingleResponse>(`/quran-plans/${planId}/students/${studentId}/progress/record`, body),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: progressKey(vars.planId, vars.studentId) }),
  });
}

export function useUpdateStudentScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, occurrenceIndex, ...body }: {
      planId: string; studentId: string; occurrenceIndex: number;
      type?: PlanType;
      surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number;
      pageStart?: number; pageEnd?: number; juz?: number;
    }) => put<ProgressSingleResponse>(`/quran-plans/${planId}/students/${studentId}/schedule/${occurrenceIndex}`, body),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: progressKey(vars.planId, vars.studentId) }),
  });
}

/** Deliberately creates a student's individual plan overlay right now — idempotent
 * with no range. Passing rangeStart/rangeEnd gives the student a custom range
 * (may be reverse-direction), (re)computing and overwriting their schedule. */
export function useInitStudentPlanProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, type, rangeStart, rangeEnd }: {
      planId: string; studentId: string;
      /** Which type the custom range applies to — required when the plan has
       * more than one, since each covers its own stretch of the mushaf. */
      type?: PlanType;
      rangeStart?: RangePoint; rangeEnd?: RangePoint;
    }) =>
      post<ProgressSingleResponse>(
        `/quran-plans/${planId}/students/${studentId}/progress/init`,
        rangeStart && rangeEnd ? { type, rangeStart, rangeEnd } : {},
      ),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: progressKey(vars.planId, vars.studentId) }),
  });
}

/** On-demand re-run of the redistribution algorithm — for fixing drift after
 * several missed days, or after a manual edit changed totals. */
export function useReflowStudentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId }: { planId: string; studentId: string }) =>
      post<ProgressSingleResponse>(`/quran-plans/${planId}/students/${studentId}/progress/reflow`, {}),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: progressKey(vars.planId, vars.studentId) }),
  });
}
