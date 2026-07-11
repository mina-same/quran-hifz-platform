import { IQuranPlan } from '../models/QuranPlan.model';
import { IStudentOccurrence, IStudentPlanProgress } from '../models/StudentPlanProgress.model';
import {
  PlanScheduleInput, RangePoint, computeScheduleBreakdown, fromFlatIndex, firstFlatOfPage, lastFlatOfPage, juzOfFlatIndex, toFlatIndex,
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

export type ReflowEvent = { kind: 'absent' } | { kind: 'partial'; completedThroughPage: number };

function rangePointFromPage(startPage: boolean, page: number) {
  const flat = startPage ? firstFlatOfPage(page) : lastFlatOfPage(page);
  return fromFlatIndex(flat);
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
 * student's own remaining pending occurrences, in whole mushaf pages — same
 * even-division rule as the base plan's `sliceForOccurrence` (including
 * reverse-direction schedules), but anchored so the last pool occurrence's
 * true endpoint never moves (the plan's finish line doesn't drift just
 * because one student fell behind). Occurrences already marked
 * `manualOverride` are pinned and excluded from the pool. If the pool is
 * empty (the shortfall lands on/after the student's last occurrence), the
 * leftover is recorded as `overflowPages` instead of inventing a new day —
 * adding a day is a plan-level decision for the teacher to make explicitly. */
export function reflowStudentPlan(doc: IStudentPlanProgress, triggerIndex: number, event: ReflowEvent): void {
  const triggered = doc.occurrences.find((o) => o.occurrenceIndex === triggerIndex);
  if (!triggered) return;

  const forward = isForwardDoc(doc);
  const step = forward ? 1 : -1;

  let shortfallPages: number;
  if (event.kind === 'absent') {
    triggered.status = 'absent';
    shortfallPages = triggered.pageEnd - triggered.pageStart + 1;
  } else {
    triggered.status = 'partial';
    triggered.completedThroughPage = event.completedThroughPage;
    // A day's own passage is always read low→high internally; which side is
    // "undone and continues into future days" depends on the plan's overall
    // direction — the far side from rangeStart, i.e. the side nearer rangeEnd.
    shortfallPages = forward
      ? triggered.pageEnd - event.completedThroughPage
      : event.completedThroughPage - triggered.pageStart;
    if (shortfallPages <= 0) {
      triggered.status = 'done';
      doc.lastReflowedAt = new Date();
      return;
    }
  }

  const pool = doc.occurrences
    .filter((o) => o.occurrenceIndex > triggerIndex && o.status === 'pending' && !o.manualOverride)
    .sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);

  if (pool.length === 0) {
    doc.overflowPages += shortfallPages;
    doc.lastReflowedAt = new Date();
    return;
  }

  const poolOriginalPages = pool.reduce((sum, o) => sum + (o.pageEnd - o.pageStart + 1), 0);
  const totalPages = shortfallPages + poolOriginalPages;
  const dailyPages = Math.floor(totalPages / pool.length);
  const lastEntry = pool[pool.length - 1];
  // The pool's last entry is always the plan's true final occurrence — its
  // true endpoint must stay pinned to the plan's actual rangeEnd (which can
  // land mid-page), never recomputed from the full page boundary the way
  // intermediate days are, exactly mirroring sliceForOccurrence's own
  // `isLast ? plan.rangeEnd : ...` special case. Which field holds that
  // anchor depends on direction (see sliceForOccurrence).
  const lastEntryAnchor = forward
    ? { surahNumber: lastEntry.baseSurahEnd, ayah: lastEntry.baseAyahEnd }
    : { surahNumber: lastEntry.baseSurahStart, ayah: lastEntry.baseAyahStart };
  const lastPoolPageEnd = lastEntry.pageEnd;
  const lastPoolPageStart = lastEntry.pageStart;

  // cursor starts at the first page of the shortfall content (the page right
  // after whatever the student actually finished, or the whole day for an
  // absence) — this is where the pool's redistributed content begins, walking
  // toward rangeEnd (increasing pages if forward, decreasing if backward).
  let cursor: number;
  if (event.kind === 'absent') {
    cursor = forward ? triggered.pageStart : triggered.pageEnd;
  } else {
    cursor = forward ? event.completedThroughPage + 1 : event.completedThroughPage - 1;
  }

  pool.forEach((o, i) => {
    const isLast = i === pool.length - 1;
    const blockNearStartPage = cursor;
    const blockNearEndPage = isLast
      ? (forward ? lastPoolPageEnd : lastPoolPageStart)
      : blockNearStartPage + (dailyPages - 1) * step;
    const loPage = Math.min(blockNearStartPage, blockNearEndPage);
    const hiPage = Math.max(blockNearStartPage, blockNearEndPage);

    let start = rangePointFromPage(true, loPage);
    let end = rangePointFromPage(false, hiPage);
    if (isLast) { if (forward) end = lastEntryAnchor; else start = lastEntryAnchor; }

    o.pageStart = loPage;
    o.pageEnd = hiPage;
    o.surahStart = start.surahNumber; o.ayahStart = start.ayah;
    o.surahEnd = end.surahNumber; o.ayahEnd = end.ayah;
    o.juz = juzOfFlatIndex(toFlatIndex(start));
    o.carryOverNote = `يشمل تعويضاً من اليوم رقم ${triggerIndex}`;

    cursor = blockNearEndPage + step;
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
    // completedThroughPage for 'partial') represents "nothing done", which
    // sits just outside the occurrence's range on the rangeStart-facing side.
    const noneDoneFallback = forward ? o.basePageStart - 1 : o.basePageEnd + 1;
    const event: ReflowEvent =
      o.status === 'absent' ? { kind: 'absent' } : { kind: 'partial', completedThroughPage: o.completedThroughPage ?? noneDoneFallback };
    reflowStudentPlan(doc, o.occurrenceIndex, event);
  }
}
