// Manual mirror of quran-hifz/src/quran/lib/evaluationRubric.ts (no shared
// package between the two npm projects — same convention as surahs.ts/juz.ts).
/**
 * The daily grading split is per plan now (`QuranPlan.gradeRubric`), not a
 * platform constant. What lives here is the DEFAULT — the split that used to be
 * hard-coded — plus helpers for working with whatever rubric a plan defines.
 *
 * `MAX_SCORES` / `TOTAL_MAX` are kept for the reports and CSV exports that read
 * the legacy fixed `scores` shape, which the server still mirrors whenever a
 * plan sticks to the four original keys.
 */
export type GradeCriterion = {
  key: string;
  label: string;
  max: number;
  /** Awarded in full on presence rather than typed by the teacher (حضور). */
  auto: boolean;
};

export const DEFAULT_GRADE_RUBRIC: GradeCriterion[] = [
  { key: 'attendance', label: 'حضور', max: 3, auto: true },
  { key: 'hifz', label: 'حفظ', max: 4, auto: false },
  { key: 'tajweed', label: 'تجويد', max: 2, auto: false },
  { key: 'talawah', label: 'تلاوة', max: 1, auto: false },
];

export const MAX_SCORES = { attendance: 3, hifz: 4, tajweed: 2, talawah: 1 } as const;
export const TOTAL_MAX = 10;

export function totalMaxOf(rubric: GradeCriterion[]): number {
  return rubric.reduce((a, c) => a + c.max, 0);
}

/** Criteria the teacher actually types a number for (everything but `auto`). */
export function manualCriteria(rubric: GradeCriterion[]): GradeCriterion[] {
  return rubric.filter((c) => !c.auto);
}

/** Slug for a teacher-authored criterion. Arabic labels are kept verbatim —
 *  the key only has to be stable and unique within one plan's rubric. */
export function criterionKey(label: string, taken: string[]): string {
  const base = label.trim().replace(/\s+/g, '_') || 'بند';
  let key = base;
  let n = 2;
  while (taken.includes(key)) key = `${base}_${n++}`;
  return key;
}

/**
 * The four legacy score keys for an evaluation, whatever rubric produced it.
 *
 * The server mirrors `scores` only when a plan keeps the four original keys, so
 * a custom rubric leaves it undefined. Reports built around the fixed columns
 * call this and fall back to the record's own `criteria` snapshot, matching by
 * key — a criterion the rubric dropped simply reads 0 rather than crashing.
 */
export function legacyScoresOf(e: {
  scores?: { attendance: number; hifz: number; tajweed: number; talawah: number };
  criteria?: { key: string; value: number }[];
}): { attendance: number; hifz: number; tajweed: number; talawah: number } {
  if (e.scores) return e.scores;
  const by = new Map((e.criteria ?? []).map((c) => [c.key, c.value]));
  return {
    attendance: by.get('attendance') ?? 0,
    hifz: by.get('hifz') ?? 0,
    tajweed: by.get('tajweed') ?? 0,
    talawah: by.get('talawah') ?? 0,
  };
}
