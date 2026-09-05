import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../../lib/api";
import type { GradeCriterion } from "../lib/evaluationRubric";

/** Legacy fixed shape — the server still mirrors it whenever a plan's rubric
 *  uses the four original keys, so existing reports keep working. */
export type EvaluationScores = { attendance: number; hifz: number; tajweed: number; talawah: number };

/** Rubric snapshot taken when the evaluation was saved. Source of truth for
 *  grading: editing a plan's rubric later never rewrites old records. */
export type EvaluationCriterion = { key: string; label: string; max: number; value: number };

export type EvaluationRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher?: { _id: string; name: string } | string;
  track?: { _id: string; title: string } | string;
  date: string;
  attendanceStatus: "حاضر" | "غائب";
  criteria?: EvaluationCriterion[];
  /** Absent when the plan's rubric uses custom criteria. */
  scores?: EvaluationScores;
  total: number;
  totalMax?: number;
  note?: string;
};

export type EvaluationFilters = {
  student?: string;
  track?: string;
  from?: string;
  to?: string;
};

type ListResponse = { success: boolean; count: number; data: EvaluationRecord[] };

function buildQuery(f?: EvaluationFilters) {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.student) p.set("student", f.student);
  if (f.track) p.set("track", f.track);
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
  /** Keyed by rubric criterion key. Bounds are enforced server-side against
   *  the plan's own rubric, which the client cannot be trusted to know. */
  scores: Record<string, number>;
  note?: string;
};

export type RubricResponse = {
  success: boolean;
  data: {
    rubric: GradeCriterion[];
    planId?: string;
    /** Several active plans matched the context — the teacher should pick. */
    ambiguous: boolean;
    totalMax: number;
    plans: { _id: string; name: string; gradeRubric: GradeCriterion[] }[];
  };
};

/** The rubric the evaluation screen should render for a track session. */
export function useRubric(ctx: { track?: string; plan?: string } | undefined) {
  const p = new URLSearchParams();
  if (ctx?.track) p.set("track", ctx.track);
  if (ctx?.plan) p.set("plan", ctx.plan);
  const q = p.toString();
  return useQuery({
    queryKey: ["evaluation-rubric", ctx],
    queryFn: () => get<RubricResponse>(`/evaluations/rubric${q ? `?${q}` : ""}`).then((r) => r.data),
    enabled: ctx !== undefined,
  });
}

export function useBulkEvaluate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { teacher: string; track?: string; plan?: string; date: string; records: BulkEvaluateRecord[] }) =>
      post<BulkEvaluateResponse>("/evaluations/bulk", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
