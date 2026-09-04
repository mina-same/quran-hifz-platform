import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import type { GradeCriterion } from '../evaluationRubric';

/** Legacy fixed shape — mirrored by the server only when a plan's rubric
 *  keeps the four original keys, so existing reports keep working. */
export type EvaluationScores = { attendance: number; hifz: number; tajweed: number; talawah: number };

/** Rubric snapshot taken at save time — the source of truth for grading. */
export type EvaluationCriterion = { key: string; label: string; max: number; value: number };

export type EvaluationRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher?: { _id: string; name: string } | string;
  halqa?: { _id: string; name: string } | string;
  specialTrack?: { _id: string; title: string } | string;
  date: string;
  attendanceStatus: 'حاضر' | 'غائب';
  criteria?: EvaluationCriterion[];
  scores?: EvaluationScores;
  totalMax?: number;
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
  if (!f) return '';
  const p = new URLSearchParams();
  if (f.student) p.set('student', f.student);
  if (f.halqa) p.set('halqa', f.halqa);
  if (f.specialTrack) p.set('specialTrack', f.specialTrack);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  const q = p.toString();
  return q ? `?${q}` : '';
}

/** Pass `undefined` to skip fetching (e.g. before a context is selected); pass an
 * empty object `{}` to deliberately fetch every evaluation with no filter. */
export function useEvaluations(filters?: EvaluationFilters) {
  return useQuery({
    queryKey: ['evaluations', filters],
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
  attendanceStatus: 'حاضر' | 'غائب';
  /** Keyed by rubric criterion key; bounds enforced server-side per plan. */
  scores: Record<string, number>;
  note?: string;
};

export type RubricResponse = {
  success: boolean;
  data: {
    rubric: GradeCriterion[];
    planId?: string;
    ambiguous: boolean;
    totalMax: number;
    plans: { _id: string; name: string; gradeRubric: GradeCriterion[] }[];
  };
};

/** The rubric the evaluation screen should render for a halqa/track session. */
export function useRubric(ctx: { halqa?: string; specialTrack?: string; plan?: string } | undefined) {
  const p = new URLSearchParams();
  if (ctx?.halqa) p.set('halqa', ctx.halqa);
  if (ctx?.specialTrack) p.set('specialTrack', ctx.specialTrack);
  if (ctx?.plan) p.set('plan', ctx.plan);
  const q = p.toString();
  return useQuery({
    queryKey: ['evaluation-rubric', ctx],
    queryFn: () => get<RubricResponse>(`/evaluations/rubric${q ? `?${q}` : ''}`).then((r) => r.data),
    enabled: ctx !== undefined,
  });
}

export function useBulkEvaluate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { teacher: string; halqa?: string; specialTrack?: string; plan?: string; date: string; records: BulkEvaluateRecord[] }) =>
      post<BulkEvaluateResponse>('/evaluations/bulk', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
