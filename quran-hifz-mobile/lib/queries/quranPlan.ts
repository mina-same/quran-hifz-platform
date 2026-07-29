import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';
import type { RangePoint, ScheduleEntry } from '@/lib/quranRange';

export type PlanType = 'حفظ' | 'مراجعة' | 'ترتيل' | 'تلاوة';
export type PointRule = { label: string; amount: number; kind: 'خصم' | 'زيادة' };
export type PlanTeacher = { _id: string; name: string };
export type PlanHalqa = { _id: string; name: string };
export type PlanStudent = { _id: string; name: string };
export type PlanSpecialTrack = { _id: string; title: string };
export type TodayAssignment = { surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number; pageStart: number; pageEnd: number };
export type PlanProgress = { completed: number; total: number; percent: number };
export type JuzProgress = { completed: number; total: number };
export type PageRange = { pageStart: number; pageEnd: number; pageCount: number };

export type QuranPlan = {
  _id: string;
  name: string;
  type: PlanType;
  description?: string;
  teacher: PlanTeacher | string;

  targetType: 'halqa' | 'students' | 'specialTrack';
  halqa?: PlanHalqa | string;
  students?: (PlanStudent | string)[];
  specialTrack?: PlanSpecialTrack | string;

  days: string[];
  startDate: string;

  rangeStart: RangePoint;
  rangeEnd: RangePoint;

  pointsEnabled: boolean;
  pointRules: PointRule[];

  endType: 'activeDays' | 'date';
  activeDaysCount?: number;
  endDate?: string;

  status: 'نشطة' | 'متوقفة' | 'منتهية';
  todayAssignment: TodayAssignment | null;
  progress: PlanProgress | null;
  juzProgress: JuzProgress | null;
  pageRange: PageRange;
  schedule: ScheduleEntry[];
  scheduleIsPersisted: boolean;
};

type ListResponse = { success: boolean; count: number; data: QuranPlan[] };
type SingleResponse = { success: boolean; data: QuranPlan };

export function useQuranPlans(filters?: { teacher?: string; halqa?: string; student?: string; specialTrack?: string }) {
  const params = new URLSearchParams();
  if (filters?.teacher) params.set('teacher', filters.teacher);
  if (filters?.halqa) params.set('halqa', filters.halqa);
  if (filters?.student) params.set('student', filters.student);
  if (filters?.specialTrack) params.set('specialTrack', filters.specialTrack);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: ['quran-plans', filters?.teacher ?? '', filters?.halqa ?? '', filters?.student ?? '', filters?.specialTrack ?? ''],
    queryFn: () => get<ListResponse>(`/quran-plans${qs}`).then((r) => r.data),
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
  baseSurahStart: number; baseAyahStart: number;
  baseSurahEnd: number; baseAyahEnd: number;
  basePageStart: number; basePageEnd: number; baseJuz: number;
  status: StudentOccurrenceStatus;
  completedThroughSurah?: number;
  completedThroughAyah?: number;
  manualOverride: boolean;
  carryOverNote?: string;
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
    mutationFn: ({ planId, studentId, rangeStart, rangeEnd }: {
      planId: string; studentId: string; rangeStart?: RangePoint; rangeEnd?: RangePoint;
    }) =>
      post<ProgressSingleResponse>(
        `/quran-plans/${planId}/students/${studentId}/progress/init`,
        rangeStart && rangeEnd ? { rangeStart, rangeEnd } : {},
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
