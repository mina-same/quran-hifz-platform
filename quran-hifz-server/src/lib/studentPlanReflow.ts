import { IQuranPlan } from '../models/QuranPlan.model';
import { IStudentOccurrence, IStudentPlanProgress } from '../models/StudentPlanProgress.model';
import {
  PlanScheduleInput, RangePoint, computeScheduleBreakdown, fromFlatIndex, juzOfFlatIndex, toFlatIndex, pageOfFlatIndex,
} from './quranRange';

function scheduleInputOf(plan: IQuranPlan): PlanScheduleInput {
  return {
    days: plan.days, startDate: plan.startDate,
    endType: plan.endType, activeDaysCount: plan.activeDaysCount, endDate: plan.endDate,
    rangeStart: plan.rangeStart, rangeEnd: plan.rangeEnd,
  };
}

/** Builds a fresh per-student occurrence array — `base*` and current fields
 * start identical, `status: 'pending'`.
 *
 * With no `customRange`: clones the plan's current schedule (persisted
 * `plan.schedule` if frozen, else the live computation) — called lazily the
 * first time a student-specific event (absence, partial completion, manual
 * edit) happens for a `(plan, student)` pair.
 *
 * With `customRange`: the teacher deliberately gave this student their own
 * memorization range (possibly a different direction than the base plan) —
 * never clone `plan.schedule` in that case, always live-compute via
 * `computeScheduleBreakdown` over the custom range, keeping every other
 * scheduling input (days/startDate/endType/occurrence count) identical to
 * the base plan. */
export function initStudentOccurrences(plan: IQuranPlan, customRange?: { rangeStart: RangePoint; rangeEnd: RangePoint }): IStudentOccurrence[] {
  const persisted = !customRange && plan.schedule && plan.schedule.length > 0;
  const scheduleInput = customRange ? { ...scheduleInputOf(plan), ...customRange } : scheduleInputOf(plan);
  const entries = persisted
    ? (plan.toObject().schedule as typeof plan.schedule).map((s) => ({ ...s, date: new Date(s.date) }))
    : computeScheduleBreakdown(scheduleInput).map((s) => ({ ...s, date: new Date(s.date) }));

  return entries.map((s) => ({
    occurrenceIndex: s.occurrenceIndex,
    date: s.date,
    baseSurahStart: s.surahStart, baseAyahStart: s.ayahStart,
    baseSurahEnd: s.surahEnd, baseAyahEnd: s.ayahEnd,
    basePageStart: s.pageStart, basePageEnd: s.pageEnd, baseJuz: s.juz,
    surahStart: s.surahStart, ayahStart: s.ayahStart,
    surahEnd: s.surahEnd, ayahEnd: s.ayahEnd,
    pageStart: s.pageStart, pageEnd: s.pageEnd, juz: s.juz,
    status: 'pending',
    manualOverride: false,
  }));
}

export type ReflowEvent = { kind: 'absent' } | { kind: 'partial'; completedThroughSurah: number; completedThroughAyah: number };

function occurrenceFlatRange(o: { surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number }) {
  return { startFlat: toFlatIndex({ surahNumber: o.surahStart, ayah: o.ayahStart }), endFlat: toFlatIndex({ surahNumber: o.surahEnd, ayah: o.ayahEnd }) };
}

/** Whether this student's own schedule progresses forward (increasing pages)
 * or backward (decreasing pages) as occurrenceIndex increases — inferred from
 * the student's own stored occurrences (not the shared plan), since a
 * custom-range individual plan can run a different direction than the base
 * plan. A single occurrence tells us nothing (its own pageStart/pageEnd are
 * always low/high regardless of direction); need at least two to compare. */
function isForwardDoc(doc: IStudentPlanProgress): boolean {
  if (doc.occurrences.length < 2) return true;
  const sorted = [...doc.occurrences].sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);
  return sorted[1].basePageStart >= sorted[0].basePageStart;
}

/** Redistributes a shortfall (an absent or partially-completed day) across a
 * student's own remaining pending occurrences, in whole ayahs (not whole
 * pages — a single-page day can now be partially completed and still have its
 * exact leftover ayahs carried forward) — same even-division rule as the base
 * plan's `sliceForOccurrence` (including reverse-direction schedules), but
 * anchored so the last pool occurrence's true endpoint never moves (the
 * plan's finish line doesn't drift just because one student fell behind).
 * `pageStart`/`pageEnd`/`juz` are derived from the resulting ayah boundaries
 * purely for display/continuity, never the unit of division itself.
 * Occurrences already marked `manualOverride` are pinned and excluded from
 * the pool. If the pool is empty (the shortfall lands on/after the student's
 * last occurrence), the leftover page-span is recorded as `overflowPages`
 * instead of inventing a new day — adding a day is a plan-level decision for
 * the teacher to make explicitly. */
export function reflowStudentPlan(doc: IStudentPlanProgress, triggerIndex: number, event: ReflowEvent): void {
  const triggered = doc.occurrences.find((o) => o.occurrenceIndex === triggerIndex);
  if (!triggered) return;

  const forward = isForwardDoc(doc);
  const step = forward ? 1 : -1;
  const { startFlat: triggerStartFlat, endFlat: triggerEndFlat } = occurrenceFlatRange(triggered);

  let shortfallAyahs: number;
  let completedFlat = 0;
  if (event.kind === 'absent') {
    triggered.status = 'absent';
    shortfallAyahs = triggerEndFlat - triggerStartFlat + 1;
  } else {
    triggered.status = 'partial';
    triggered.completedThroughSurah = event.completedThroughSurah;
    triggered.completedThroughAyah = event.completedThroughAyah;
    completedFlat = toFlatIndex({ surahNumber: event.completedThroughSurah, ayah: event.completedThroughAyah });
    // A day's own passage is always read low→high internally; which side is
    // "undone and continues into future days" depends on the plan's overall
    // direction — the far side from rangeStart, i.e. the side nearer rangeEnd.
    shortfallAyahs = forward ? triggerEndFlat - completedFlat : completedFlat - triggerStartFlat;
    if (shortfallAyahs <= 0) {
      triggered.status = 'done';
      doc.lastReflowedAt = new Date();
      return;
    }
  }

  const pool = doc.occurrences
    .filter((o) => o.occurrenceIndex > triggerIndex && o.status === 'pending' && !o.manualOverride)
    .sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);

  if (pool.length === 0) {
    const overflowLoFlat = event.kind === 'absent'
      ? Math.min(triggerStartFlat, triggerEndFlat)
      : Math.min(forward ? completedFlat + 1 : triggerStartFlat, forward ? triggerEndFlat : completedFlat - 1);
    const overflowHiFlat = event.kind === 'absent'
      ? Math.max(triggerStartFlat, triggerEndFlat)
      : Math.max(forward ? completedFlat + 1 : triggerStartFlat, forward ? triggerEndFlat : completedFlat - 1);
    doc.overflowPages += pageOfFlatIndex(overflowHiFlat) - pageOfFlatIndex(overflowLoFlat) + 1;
    doc.lastReflowedAt = new Date();
    return;
  }

  const poolOriginalAyahs = pool.reduce((sum, o) => {
    const { startFlat, endFlat } = occurrenceFlatRange(o);
    return sum + (endFlat - startFlat + 1);
  }, 0);
  const totalAyahs = shortfallAyahs + poolOriginalAyahs;
  const dailyAyahs = Math.floor(totalAyahs / pool.length);
  const lastEntry = pool[pool.length - 1];
  // The pool's last entry is always the plan's true final occurrence — its
  // true endpoint must stay pinned to the plan's actual rangeEnd (which can
  // land mid-page), never recomputed from the pool's own division the way
  // intermediate days are, exactly mirroring sliceForOccurrence's own
  // `isLast ? plan.rangeEnd : ...` special case. Which field holds that
  // anchor depends on direction (see sliceForOccurrence).
  const lastEntryAnchor = forward
    ? { surahNumber: lastEntry.baseSurahEnd, ayah: lastEntry.baseAyahEnd }
    : { surahNumber: lastEntry.baseSurahStart, ayah: lastEntry.baseAyahStart };
  const { startFlat: lastPoolStartFlat, endFlat: lastPoolEndFlat } = occurrenceFlatRange(lastEntry);

  // cursor starts at the first ayah of the shortfall content (right after
  // whatever the student actually finished, or the whole day for an absence)
  // — this is where the pool's redistributed content begins, walking toward
  // rangeEnd (increasing ayahs if forward, decreasing if backward).
  let cursor: number;
  if (event.kind === 'absent') {
    cursor = forward ? triggerStartFlat : triggerEndFlat;
  } else {
    cursor = forward ? completedFlat + 1 : completedFlat - 1;
  }

  pool.forEach((o, i) => {
    const isLast = i === pool.length - 1;
    const blockNearStartFlat = cursor;
    const blockNearEndFlat = isLast
      ? (forward ? lastPoolEndFlat : lastPoolStartFlat)
      : blockNearStartFlat + (dailyAyahs - 1) * step;
    const loFlat = Math.min(blockNearStartFlat, blockNearEndFlat);
    const hiFlat = Math.max(blockNearStartFlat, blockNearEndFlat);

    let start = fromFlatIndex(loFlat);
    let end = fromFlatIndex(hiFlat);
    if (isLast) { if (forward) end = lastEntryAnchor; else start = lastEntryAnchor; }

    o.surahStart = start.surahNumber; o.ayahStart = start.ayah;
    o.surahEnd = end.surahNumber; o.ayahEnd = end.ayah;
    o.pageStart = pageOfFlatIndex(toFlatIndex(start));
    o.pageEnd = pageOfFlatIndex(toFlatIndex(end));
    o.juz = juzOfFlatIndex(toFlatIndex(start));
    o.carryOverNote = `يشمل تعويضاً من اليوم رقم ${triggerIndex}`;

    cursor = blockNearEndFlat + step;
  });

  doc.overflowPages = 0;
  doc.lastReflowedAt = new Date();
}

/** Re-runs redistribution from scratch for any unresolved (absent/partial)
 * occurrence, in order — used by the on-demand "إعادة حساب التوزيع" action to
 * fix accumulated drift (e.g. several missed days recorded before the teacher
 * last looked, or totals changed after a manual edit). */
export function reflowAll(doc: IStudentPlanProgress): void {
  doc.overflowPages = 0;
  const forward = isForwardDoc(doc);
  const unresolved = doc.occurrences
    .filter((o) => (o.status === 'absent' || o.status === 'partial') && !o.manualOverride)
    .sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);

  for (const o of unresolved) {
    // Fallback (should rarely trigger — recordOccurrence always sets
    // completedThrough* for 'partial') represents "nothing done", which sits
    // just outside the occurrence's range on the rangeStart-facing side.
    const noneDoneFallbackFlat = forward
      ? toFlatIndex({ surahNumber: o.baseSurahStart, ayah: o.baseAyahStart }) - 1
      : toFlatIndex({ surahNumber: o.baseSurahEnd, ayah: o.baseAyahEnd }) + 1;
    const noneDoneFallback = fromFlatIndex(noneDoneFallbackFlat);
    const completedPoint = o.completedThroughSurah != null && o.completedThroughAyah != null
      ? { surahNumber: o.completedThroughSurah, ayah: o.completedThroughAyah }
      : noneDoneFallback;
    const event: ReflowEvent =
      o.status === 'absent' ? { kind: 'absent' } : { kind: 'partial', completedThroughSurah: completedPoint.surahNumber, completedThroughAyah: completedPoint.ayah };
    reflowStudentPlan(doc, o.occurrenceIndex, event);
  }
}
