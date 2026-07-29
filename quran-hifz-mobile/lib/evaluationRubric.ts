// Manual mirror of quran-hifz/src/quran/lib/evaluationRubric.ts (no shared
// package between the two npm projects — same convention as surahs.ts/juz.ts).
// Fixed-weight rubric enforced server-side in evaluation.controller.ts:
// حضور 3 + حفظ 4 + تجويد 2 + تلاوة 1 = 10.
export const MAX_SCORES = { attendance: 3, hifz: 4, tajweed: 2, talawah: 1 } as const;
export const TOTAL_MAX = 10;
