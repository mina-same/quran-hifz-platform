import { SURAHS } from '../data/surahs';

export type RangePoint = { surahNumber: number; ayah: number };

/** Sat..Fri order, matches the 7 toggle chips shown in the plan-builder UI. */
export const WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'] as const;

/** Arabic weekday label for JS Date#getDay() (0=Sunday..6=Saturday). */
const DAY_BY_JS_INDEX = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

/** Cumulative ayah count before surah N (0-based). */
const CUMULATIVE_BEFORE: number[] = (() => {
  const acc: number[] = [];
  let running = 0;
  for (const s of SURAHS) {
    acc[s.number] = running;
    running += s.ayahCount;
  }
  return acc;
})();

export function toFlatIndex({ surahNumber, ayah }: RangePoint): number {
  return CUMULATIVE_BEFORE[surahNumber] + (ayah - 1);
}

export function fromFlatIndex(index: number): RangePoint {
  for (const s of SURAHS) {
    const before = CUMULATIVE_BEFORE[s.number];
    if (index < before + s.ayahCount) {
      return { surahNumber: s.number, ayah: index - before + 1 };
    }
  }
  const last = SURAHS[SURAHS.length - 1];
  return { surahNumber: last.number, ayah: last.ayahCount };
}

export function countRangeAyahs(start: RangePoint, end: RangePoint): number {
  return toFlatIndex(end) - toFlatIndex(start) + 1;
}

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayLabel(d: Date): string {
  return DAY_BY_JS_INDEX[d.getDay()];
}

/** Count how many dates in [from, to] (inclusive, date-only) fall on one of `days`. */
function countMatchingDays(from: Date, to: Date, days: string[]): number {
  let count = 0;
  const cursor = dateOnly(from);
  const end = dateOnly(to);
  while (cursor.getTime() <= end.getTime()) {
    if (days.includes(dayLabel(cursor))) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export type PlanScheduleInput = {
  days: string[];
  startDate: Date;
  endType: 'activeDays' | 'date';
  activeDaysCount?: number;
  endDate?: Date;
  rangeStart: RangePoint;
  rangeEnd: RangePoint;
};

/**
 * Total occurrence count for the plan's schedule. For `activeDays` this is the
 * teacher-set count directly (it *is* the occurrence count, not raw calendar days —
 * confirmed with the user: "عدد الأيام النشطة" counts only matching-weekday days).
 */
export function countOccurrences(plan: PlanScheduleInput): number {
  if (plan.endType === 'activeDays') return plan.activeDaysCount ?? 0;
  return countMatchingDays(plan.startDate, plan.endDate!, plan.days);
}

export type TodayAssignment = {
  surahStart: number;
  ayahStart: number;
  surahEnd: number;
  ayahEnd: number;
};

/**
 * The ayah slice due today, if today is one of the plan's selected days and falls
 * within the plan's active window. Divides the full range evenly across all
 * occurrences; any remainder (when total ayahs doesn't divide evenly) is absorbed
 * by the last occurrence so the slices always cover the whole range exactly once.
 */
export function computeTodayAssignment(plan: PlanScheduleInput, today: Date = new Date()): TodayAssignment | null {
  const todayDate = dateOnly(today);
  const startDate = dateOnly(plan.startDate);

  if (!plan.days.includes(dayLabel(todayDate))) return null;
  if (todayDate.getTime() < startDate.getTime()) return null;
  if (plan.endType === 'date' && todayDate.getTime() > dateOnly(plan.endDate!).getTime()) return null;

  const occurrenceCount = countOccurrences(plan);
  if (occurrenceCount <= 0) return null;

  const occurrenceIndex = countMatchingDays(startDate, todayDate, plan.days) - 1;
  if (occurrenceIndex < 0 || occurrenceIndex >= occurrenceCount) return null;

  const totalAyahs = countRangeAyahs(plan.rangeStart, plan.rangeEnd);
  const dailyPortion = Math.floor(totalAyahs / occurrenceCount);
  const isLast = occurrenceIndex === occurrenceCount - 1;

  if (dailyPortion === 0 && !isLast) return null; // more occurrences than ayahs — nothing left for a non-final day

  const rangeStartFlat = toFlatIndex(plan.rangeStart);
  const sliceStartFlat = rangeStartFlat + occurrenceIndex * dailyPortion;
  const sliceEndFlat = isLast ? toFlatIndex(plan.rangeEnd) : sliceStartFlat + dailyPortion - 1;

  const start = fromFlatIndex(sliceStartFlat);
  const end = fromFlatIndex(sliceEndFlat);
  return { surahStart: start.surahNumber, ayahStart: start.ayah, surahEnd: end.surahNumber, ayahEnd: end.ayah };
}

export function surahName(surahNumber: number): string {
  return SURAH_BY_NUMBER.get(surahNumber)?.name ?? '';
}
