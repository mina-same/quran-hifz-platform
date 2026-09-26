import type { QuranPlan } from '@/lib/queries/quranPlan';
import { unionDays } from '@/lib/quranRange';

/**
 * A track's own `daysPerWeek`/`startDate`/`endDate` are now vestigial — the
 * REAL schedule is defined on the linked `QuranPlan`. Everywhere that needs
 * "the" plan for a track picks it with this rule (originally in
 * admin/tracks.tsx's `TrackCard` and `TrackDetail.tsx`): prefer the plan
 * actually targeting the whole track over one that merely still carries a
 * stale `track` ref after its `targetType` was switched to `'students'`.
 */
export function resolveLinkedPlan<T extends { targetType: string }>(plans: T[]): T | undefined {
  return plans.find((p) => p.targetType === 'track') ?? plans[0];
}

/** Every weekday the linked plan is active on — union of its segments' own
 * days (the real per-type schedule), falling back to the plan's legacy
 * merged `days` rollup when segments is empty/absent. */
export function planScheduleDays(plan: QuranPlan | undefined): string[] {
  if (!plan) return [];
  if (plan.segments?.length) return unionDays(plan.segments.map((seg) => ({ type: seg.type, days: seg.days })));
  return plan.days ?? [];
}

/** Raw date-range facts for display — callers format with whichever date
 * helper that screen already uses, to match its existing convention. */
export type PlanScheduleRange =
  | { endType: 'date'; startDate: string; endDate: string }
  | { endType: 'activeDays'; startDate: string; activeDaysCount: number };

export function planScheduleRange(plan: QuranPlan | undefined): PlanScheduleRange | null {
  if (!plan) return null;
  if (plan.endType === 'date' && plan.endDate) {
    return { endType: 'date', startDate: plan.startDate, endDate: plan.endDate };
  }
  return { endType: 'activeDays', startDate: plan.startDate, activeDaysCount: plan.activeDaysCount ?? 0 };
}

/** Shown wherever a track's schedule would render but no plan is linked yet. */
export const NO_PLAN_SCHEDULE_TEXT = 'لم تُحدَّد خطة بعد';
