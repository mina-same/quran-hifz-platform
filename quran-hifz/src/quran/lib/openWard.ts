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

/** Open-ward plans whose records belong in a student's report. The report's
 * `?student=` plan filter only matches plans that list the student
 * explicitly, so a track-targeted plan — the common case — must be picked up
 * from the track's own plans as well. Deduped, first-seen order. */
export function openPlanIdsForReport(
  studentPlans: { _id: string; openWard?: boolean }[],
  trackPlans: { _id: string; openWard?: boolean }[],
): string[] {
  const ids = [...studentPlans, ...trackPlans].filter((p) => p.openWard).map((p) => p._id);
  return Array.from(new Set(ids));
}

/** Which way a student memorizes through the Mushaf on an open-ward plan:
 * from its start, or «من آخر المصحف» (surah by surah backwards). */
export type WardDirection = 'forward' | 'reverse';
type WardPoint = { surahNumber: number; ayah: number };
type WardRecord = { status: string; from?: WardPoint; to?: WardPoint; direction?: WardDirection };

/** The direction a range shows by itself — only a day spanning surahs has one. */
export function rangeDirection(from: WardPoint, to: WardPoint): WardDirection | undefined {
  if (from.surahNumber > to.surahNumber) return 'reverse';
  if (from.surahNumber < to.surahNumber) return 'forward';
  return undefined;
}

/** A student's direction from their records, newest first. The newest record
 * that tells wins: a direction saved with it, a range spanning surahs, or a
 * move to another surah since the day before. Undefined while every day so far
 * stayed inside one surah — a finished surah then can't tell what comes next. */
export function inferWardDirection(history: WardRecord[]): WardDirection | undefined {
  const recs = history.filter((r) => r.status === 'recorded' && r.from && r.to);
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    if (r.direction) return r.direction;
    const own = rangeDirection(r.from!, r.to!);
    if (own) return own;
    const older = recs[i + 1];
    if (older && r.from!.surahNumber !== older.to!.surahNumber) {
      return r.from!.surahNumber < older.to!.surahNumber ? 'reverse' : 'forward';
    }
  }
  return undefined;
}
