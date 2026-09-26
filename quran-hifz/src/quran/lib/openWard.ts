/** Pure open-ward helpers shared by the grading screens — kept free of
 * react-query/api imports so they stay unit-testable. Mirrored in the mobile app's
 * quran-hifz-mobile/lib/openWard.ts. */

type EntryLike = { student: string | { _id: string }; type: 'حفظ' | 'مراجعة'; date: string };

/** Types that already have a saved entry for this student on this calendar
 * day. Marking the student absent must delete these: an absent student has
 * no ward record (the evaluation already holds the absence). */
export function savedOpenWardTypes<T extends EntryLike>(entries: T[], studentId: string, date: string): T['type'][] {
  const types = entries
    .filter((e) => (typeof e.student === 'string' ? e.student : e.student._id) === studentId && e.date === date)
    .map((e) => e.type);
  return Array.from(new Set(types));
}
