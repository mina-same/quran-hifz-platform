import { IQuranPlan } from '../models/QuranPlan.model';
import { IStudentOccurrence, IStudentPlanProgress } from '../models/StudentPlanProgress.model';
import {
  PlanScheduleInput, RangePoint, computeScheduleBreakdown, fromFlatIndex, juzOfFlatIndex, toFlatIndex, pageOfFlatIndex,
} from './quranRange';

function scheduleInputOf(plan: IQuranPlan): PlanScheduleInput {
  return {
    days: plan.days, startDate: plan.startDate, holidays: plan.holidays,
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

export type ReflowEvent =
  | { kind: 'absent' }
  /** The point the student actually finished at, which can fall short of the
   * day's assigned ward *or* run past it (a keen student who recited more than
   * was set for them). */
  | { kind: 'reached'; completedThroughSurah: number; completedThroughAyah: number };

function occurrenceFlatRange(o: { surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number }) {
  return { startFlat: toFlatIndex({ surahNumber: o.surahStart, ayah: o.ayahStart }), endFlat: toFlatIndex({ surahNumber: o.surahEnd, ayah: o.ayahEnd }) };
}

function setOccurrenceRange(o: IStudentOccurrence, start: RangePoint, end: RangePoint): void {
  o.surahStart = start.surahNumber; o.ayahStart = start.ayah;
  o.surahEnd = end.surahNumber; o.ayahEnd = end.ayah;
  o.pageStart = pageOfFlatIndex(toFlatIndex(start));
  o.pageEnd = pageOfFlatIndex(toFlatIndex(end));
  o.juz = juzOfFlatIndex(toFlatIndex(start));
}

/** Whether this student's own schedule progresses forward (increasing pages)
 * or backward (decreasing pages) as occurrenceIndex increases — inferred from
 * the student's own stored occurrences (not the shared plan), since a
 * custom-range individual plan can run a different direction than the base
 * plan. A single occurrence tells us nothing (its own pageStart/pageEnd are
 * always low/high regardless of direction); need at least two to compare. */
export function isForwardDoc(doc: IStudentPlanProgress): boolean {
  if (doc.occurrences.length < 2) return true;
  const sorted = [...doc.occurrences].sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);
  return sorted[1].basePageStart >= sorted[0].basePageStart;
}

/** The very last point this student's own plan ever reaches, in their own
 * direction — the ceiling for "سمّع أكثر من المقرر": a student may run ahead
 * into future days' ward, but never past the end of their own plan. */
export function docFinishPoint(doc: IStudentPlanProgress, forward = isForwardDoc(doc)): RangePoint {
  const last = doc.occurrences.reduce((a, b) => (b.occurrenceIndex > a.occurrenceIndex ? b : a));
  return forward
    ? { surahNumber: last.baseSurahEnd, ayah: last.baseAyahEnd }
    : { surahNumber: last.baseSurahStart, ayah: last.baseAyahStart };
}

/** Re-divides everything the student still owes — from wherever they actually
 * stopped through to the plan's own pinned finish line — evenly across their
 * remaining pending occurrences, in whole ayahs (not whole pages, so a
 * single-page day's exact leftover ayahs can be carried).
 *
 * One formula covers all three outcomes, in either schedule direction:
 * an absence or a short day pushes the remainder onto the following days
 * (they get heavier), while a day where the student recited *past* their
 * assigned ward pulls that surplus out of the following days (they get
 * lighter) — the plan's finish line never drifts either way, mirroring
 * `sliceForOccurrence`'s own `isLast ? plan.rangeEnd : ...` special case.
 * Deriving the remaining span absolutely (cursor → finish line) rather than
 * adding a shortfall onto the pool's current totals also keeps a repeated
 * `reflowAll` from redistributing the same ayahs twice.
 *
 * `pageStart`/`pageEnd`/`juz` are derived from the resulting ayah boundaries
 * purely for display/continuity, never the unit of division itself.
 * Occurrences already marked `manualOverride` are pinned and excluded from
 * the pool. If the pool is empty (the shortfall lands on/after the student's
 * last occurrence), the leftover page-span is recorded as `overflowPages`
 * instead of inventing a new day — adding a day is a plan-level decision for
 * the teacher to make explicitly. In the mirror case — the student got so far
 * ahead that the remaining content runs out before the days do — the surplus
 * days are flagged `noWard` rather than handed invented work; they stay
 * `pending`, so a later absence pulls them straight back into the pool. */
export function reflowStudentPlan(doc: IStudentPlanProgress, triggerIndex: number, event: ReflowEvent): void {
  const triggered = doc.occurrences.find((o) => o.occurrenceIndex === triggerIndex);
  if (!triggered) return;

  const forward = isForwardDoc(doc);
  const step = forward ? 1 : -1;
  const { startFlat: triggerStartFlat, endFlat: triggerEndFlat } = occurrenceFlatRange(triggered);
  // The side of the day's slice its ward *ends* at in the plan's own direction
  // (slices are always stored low→high), i.e. the side that stays undone and
  // rolls into future days.
  const dayFinishFlat = forward ? triggerEndFlat : triggerStartFlat;

  // Where the content still owed to the student's future days begins.
  let cursor: number;
  let note: string;
  if (event.kind === 'absent') {
    triggered.status = 'absent';
    // A day the student had no ward on in the first place (they had already
    // run past the plan's finish line) has nothing to carry forward.
    if (triggered.noWard) {
      doc.lastReflowedAt = new Date();
      return;
    }
    cursor = forward ? triggerStartFlat : triggerEndFlat;
    note = `يشمل تعويضاً من اليوم رقم ${triggerIndex}`;
  } else {
    const completedFlat = toFlatIndex({ surahNumber: event.completedThroughSurah, ayah: event.completedThroughAyah });
    // Signed in the plan's own direction: negative = fell short of today's
    // ward, positive = recited past it, zero = exactly the assigned ward.
    const delta = (completedFlat - dayFinishFlat) * step;
    triggered.status = delta < 0 ? 'partial' : 'done';
    triggered.completedThroughSurah = event.completedThroughSurah;
    triggered.completedThroughAyah = event.completedThroughAyah;

    if (delta === 0) {
      // Exactly the assigned ward — nothing to move either way, and the
      // following days must not be touched (or re-noted) at all.
      doc.lastReflowedAt = new Date();
      return;
    }

    // Today's own slice becomes exactly what the student really recited —
    // shrunk to the undone point for a shortfall, stretched for an
    // over-achievement. Either way the remainder/surplus is settled against
    // the pool below rather than left misreported on today's "الورد المقرر".
    // `base*` still holds the original assignment, so the schedule table's
    // "الأصلي" vs "الحالي" columns keep showing both.
    const reached = { surahNumber: event.completedThroughSurah, ayah: event.completedThroughAyah };
    setOccurrenceRange(
      triggered,
      forward ? { surahNumber: triggered.surahStart, ayah: triggered.ayahStart } : reached,
      forward ? reached : { surahNumber: triggered.surahEnd, ayah: triggered.ayahEnd },
    );
    triggered.noWard = false;
    cursor = completedFlat + step;
    note = delta > 0
      ? `تم تخفيفه بعد تسميع إضافي في اليوم رقم ${triggerIndex}`
      : `يشمل تعويضاً من اليوم رقم ${triggerIndex}`;
  }

  const pool = doc.occurrences
    .filter((o) => o.occurrenceIndex > triggerIndex && o.status === 'pending' && !o.manualOverride)
    .sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);

  if (pool.length === 0) {
    // Nothing left to redistribute onto. Only a shortfall can land here: a
    // surplus is bounded by the plan's own finish line, which is the last
    // occurrence's end.
    const undoneAyahs = (dayFinishFlat - cursor) * step + 1;
    if (undoneAyahs > 0) {
      const loFlat = Math.min(cursor, dayFinishFlat);
      const hiFlat = Math.max(cursor, dayFinishFlat);
      doc.overflowPages += pageOfFlatIndex(hiFlat) - pageOfFlatIndex(loFlat) + 1;
    }
    doc.lastReflowedAt = new Date();
    return;
  }

  // The pool's last entry carries the plan's true finish line — pinned to its
  // original endpoint (which can land mid-page), never recomputed from the
  // pool's own division the way intermediate days are. Which field holds that
  // anchor depends on direction (see sliceForOccurrence).
  const lastEntry = pool[pool.length - 1];
  const finishAnchor = forward
    ? { surahNumber: lastEntry.baseSurahEnd, ayah: lastEntry.baseAyahEnd }
    : { surahNumber: lastEntry.baseSurahStart, ayah: lastEntry.baseAyahStart };
  const finishFlat = toFlatIndex(finishAnchor);
  const remainingAyahs = (finishFlat - cursor) * step + 1;

  if (remainingAyahs <= 0) {
    // The student already recited through (or past) the plan's finish line —
    // every remaining day has nothing left to assign.
    pool.forEach((o) => markNoWard(o, finishAnchor));
    doc.overflowPages = 0;
    doc.lastReflowedAt = new Date();
    return;
  }

  // A surplus big enough to starve the tail: give the content to as many days
  // as it can actually fill (never fewer than one ayah each) and flag the rest.
  const contentDays = Math.min(pool.length, remainingAyahs);
  const dailyAyahs = Math.floor(remainingAyahs / contentDays);

  pool.forEach((o, i) => {
    if (i >= contentDays) { markNoWard(o, finishAnchor); return; }

    const isLast = i === contentDays - 1;
    const blockNearStartFlat = cursor;
    const blockNearEndFlat = isLast ? finishFlat : blockNearStartFlat + (dailyAyahs - 1) * step;
    const loFlat = Math.min(blockNearStartFlat, blockNearEndFlat);
    const hiFlat = Math.max(blockNearStartFlat, blockNearEndFlat);

    let start = fromFlatIndex(loFlat);
    let end = fromFlatIndex(hiFlat);
    if (isLast) { if (forward) end = finishAnchor; else start = finishAnchor; }

    setOccurrenceRange(o, start, end);
    o.noWard = false;
    o.carryOverNote = note;

    cursor = blockNearEndFlat + step;
  });

  doc.overflowPages = 0;
  doc.lastReflowedAt = new Date();
}

/** A remaining day with nothing left to memorize — the student ran far enough
 * ahead that the plan's content is exhausted before its days are. Kept
 * `pending` (a later absence pulls it back into the pool) with its span
 * collapsed onto the plan's finish point, so nothing re-counts content an
 * earlier day already covers; consumers key off `noWard`, not the span. */
function markNoWard(o: IStudentOccurrence, finishAnchor: RangePoint): void {
  setOccurrenceRange(o, finishAnchor, finishAnchor);
  o.noWard = true;
  o.carryOverNote = 'لا يوجد ورد — تم إنهاء ورد الخطة مبكراً';
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
      o.status === 'absent' ? { kind: 'absent' } : { kind: 'reached', completedThroughSurah: completedPoint.surahNumber, completedThroughAyah: completedPoint.ayah };
    reflowStudentPlan(doc, o.occurrenceIndex, event);
  }
}
