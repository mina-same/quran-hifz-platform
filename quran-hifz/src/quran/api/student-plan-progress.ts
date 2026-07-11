import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "../../lib/api";
import type { ScheduleEntry, RangePoint } from "./quran-plans";

export type StudentOccurrenceStatus = "pending" | "done" | "partial" | "absent";

export type StudentOccurrence = ScheduleEntry & {
  baseSurahStart: number; baseAyahStart: number;
  baseSurahEnd: number; baseAyahEnd: number;
  basePageStart: number; basePageEnd: number; baseJuz: number;
  status: StudentOccurrenceStatus;
  completedThroughPage?: number;
  manualOverride: boolean;
  carryOverNote?: string;
};

export type StudentPlanProgressResponse = {
  effectiveSchedule: StudentOccurrence[];
  /** False when the student has no individual overlay yet — `effectiveSchedule`
   * is then just the shared plan's own schedule, unchanged. */
  progressIsPersisted: boolean;
  overflowPages: number;
};

type SingleResponse = { success: boolean; data: StudentPlanProgressResponse };

function progressKey(planId?: string, studentId?: string) {
  return ["student-plan-progress", planId ?? "", studentId ?? ""];
}

export function useStudentPlanProgress(planId?: string, studentId?: string) {
  return useQuery({
    queryKey: progressKey(planId, studentId),
    queryFn: () => get<SingleResponse>(`/quran-plans/${planId}/students/${studentId}/progress`).then((r) => r.data),
    enabled: Boolean(planId && studentId),
  });
}

/** Fetches every listed student's own effective schedule in one hook call —
 * each student's assigned portion for a given day can now differ (absence/
 * shortfall reflow, manual overrides), so a page listing multiple students
 * (e.g. TeacherTrackDetail) can no longer rely on one shared plan-level
 * schedule. `useQueries` (rather than calling `useStudentPlanProgress` in a
 * loop, which would violate the rules of hooks for a dynamic-length list)
 * keeps this to a single hook call whose query count tracks `studentIds`. */
export function useStudentPlanProgressList(planId: string | undefined, studentIds: string[]) {
  const results = useQueries({
    queries: studentIds.map((studentId) => ({
      queryKey: progressKey(planId, studentId),
      queryFn: () => get<SingleResponse>(`/quran-plans/${planId}/students/${studentId}/progress`).then((r) => r.data),
      enabled: Boolean(planId && studentId),
    })),
  });
  const byStudentId: Record<string, StudentPlanProgressResponse | undefined> = {};
  studentIds.forEach((id, i) => { byStudentId[id] = results[i]?.data; });
  return byStudentId;
}

/** Records what a student actually did on one scheduled occurrence
 * (finished / partially finished / absent). When there's a shortfall, the
 * server redistributes the remainder across the student's own remaining
 * days — lazily creating their individual schedule overlay on first use. */
export function useRecordStudentOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, ...body }: {
      planId: string; studentId: string;
      occurrenceIndex: number; status: "done" | "partial" | "absent"; completedThroughPage?: number;
    }) => post<SingleResponse>(`/quran-plans/${planId}/students/${studentId}/progress/record`, body),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: progressKey(vars.planId, vars.studentId) }),
  });
}

/** Hand-edits one occurrence of a single student's schedule — pins it so a
 * later absence/shortfall reflow never overwrites it. */
export function useUpdateStudentScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, occurrenceIndex, ...body }: {
      planId: string; studentId: string; occurrenceIndex: number;
      surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number;
      pageStart?: number; pageEnd?: number; juz?: number;
    }) => put<SingleResponse>(`/quran-plans/${planId}/students/${studentId}/schedule/${occurrenceIndex}`, body),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: progressKey(vars.planId, vars.studentId) }),
  });
}

/** Deliberately creates a student's individual plan overlay right now (rather
 * than waiting for it to happen as a side effect of the first absence/edit) —
 * idempotent with no range, safe to call even if one already exists.
 *
 * Passing `rangeStart`/`rangeEnd` gives this student their own custom
 * memorization range (rangeStart may sit after rangeEnd — a reverse-direction
 * range is fine, e.g. starting at An-Nas and working backward toward
 * Al-Fatiha) — this always (re)computes and overwrites the student's
 * schedule from that range, discarding any prior progress. */
export function useInitStudentPlanProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, rangeStart, rangeEnd }: {
      planId: string; studentId: string; rangeStart?: RangePoint; rangeEnd?: RangePoint;
    }) =>
      post<SingleResponse>(
        `/quran-plans/${planId}/students/${studentId}/progress/init`,
        rangeStart && rangeEnd ? { rangeStart, rangeEnd } : {},
      ),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: progressKey(vars.planId, vars.studentId) }),
  });
}

/** On-demand re-run of the redistribution algorithm — for fixing drift after
 * several missed days accumulated, or after a manual edit changed totals. */
export function useReflowStudentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId }: { planId: string; studentId: string }) =>
      post<SingleResponse>(`/quran-plans/${planId}/students/${studentId}/progress/reflow`, {}),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: progressKey(vars.planId, vars.studentId) }),
  });
}
