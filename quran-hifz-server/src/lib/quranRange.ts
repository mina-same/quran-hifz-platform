import { SURAHS } from '../data/surahs';
import { JUZ_STARTS } from '../data/juz';
import quranPageRangesJson from '../data/quranPageRanges.json';

/** Standard 604-page Madani mushaf boundary table (surah:ayah each page starts at).
 * Source: quranPageRanges.json (surah/ayah start+end per page, cross-checked against
 * quran-center/quran-meta Hafs PageList — all 604 page starts match exactly). */
const PAGE_STARTS = quranPageRangesJson.map((p) => ({ number: p.page, surahNumber: p.start.surah, ayah: p.start.ayah }));

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

/** Total ayahs in the Quran (6236 for Hafs). */
const TOTAL_AYAHS = SURAHS.reduce((sum, s) => sum + s.ayahCount, 0);

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

/** Span size (in ayahs) between two points — order-independent, since `start`
 * may sit after `end` in mushaf order (a reverse-direction range). */
export function countRangeAyahs(start: RangePoint, end: RangePoint): number {
  return Math.abs(toFlatIndex(end) - toFlatIndex(start)) + 1;
}

/** arr[i] = flat index where juz' (i+1) starts. */
const JUZ_STARTS_FLAT: number[] = JUZ_STARTS.map((j) => toFlatIndex({ surahNumber: j.surahNumber, ayah: j.ayah }));

/** Which of the 30 ajza' a flat ayah index falls in. */
export function juzOfFlatIndex(flatIndex: number): number {
  let juz = 1;
  for (let i = 0; i < JUZ_STARTS_FLAT.length; i++) {
    if (flatIndex >= JUZ_STARTS_FLAT[i]) juz = i + 1;
    else break;
  }
  return juz;
}

/** arr[i] = flat index where mushaf page (i+1) starts (604-page Madani mushaf). */
const PAGE_STARTS_FLAT: number[] = PAGE_STARTS.map((p) => toFlatIndex({ surahNumber: p.surahNumber, ayah: p.ayah }));

/** Which of the 604 mushaf pages a flat ayah index falls in. */
export function pageOfFlatIndex(flatIndex: number): number {
  let page = 1;
  for (let i = 0; i < PAGE_STARTS_FLAT.length; i++) {
    if (flatIndex >= PAGE_STARTS_FLAT[i]) page = i + 1;
    else break;
  }
  return page;
}

/** First ayah (flat index) of the given 1-based mushaf page. */
export function firstFlatOfPage(page: number): number {
  return PAGE_STARTS_FLAT[page - 1];
}

/** Last ayah (flat index) of the given 1-based mushaf page — the ayah right
 * before the next page starts, or the Quran's final ayah for page 604. */
export function lastFlatOfPage(page: number): number {
  return page < PAGE_STARTS_FLAT.length ? PAGE_STARTS_FLAT[page] - 1 : TOTAL_AYAHS - 1;
}

export type PageRange = { pageStart: number; pageEnd: number; pageCount: number };

/** The mushaf page range (and page count) spanned by an ayah range, inclusive —
 * a pure display/span utility, so it always normalizes to `pageStart <= pageEnd`
 * even when `start` sits after `end` in mushaf order (a reverse-direction range;
 * direction itself only matters to the scheduling walk in `sliceForOccurrence`). */
export function pageRangeOfAyahRange(start: RangePoint, end: RangePoint): PageRange {
  const a = pageOfFlatIndex(toFlatIndex(start));
  const b = pageOfFlatIndex(toFlatIndex(end));
  const pageStart = Math.min(a, b);
  const pageEnd = Math.max(a, b);
  return { pageStart, pageEnd, pageCount: pageEnd - pageStart + 1 };
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
  pageStart: number;
  pageEnd: number;
};

/**
 * The ayah slice for a given 0-based occurrence index, dividing the full range's
 * mushaf *pages* evenly across all occurrences — never mid-page — so intermediate
 * days always start and end on a page boundary. Only the very first day (which
 * starts at the plan's actual rangeStart) and the very last day (which ends at the
 * plan's actual rangeEnd) may be partial pages; any remainder page count is
 * absorbed by the last occurrence. Returns null if there's nothing left for a
 * non-final day (more occurrences than pages).
 *
 * `rangeStart` is allowed to sit *after* `rangeEnd` in mushaf order — a genuine
 * reverse walk (e.g. starting memorization at An-Nas and working backward toward
 * Al-Fatiha): day 1 anchors at rangeStart regardless of which physical direction
 * that is, and the walk proceeds toward rangeEnd, ending there on the last day.
 * A single occurrence's own `surahStart/ayahStart..surahEnd/ayahEnd` is always
 * reported in natural low→high reading order (a day's passage is still recited
 * forward — only the *sequence of days* runs backward through the mushaf).
 */
function sliceForOccurrence(plan: PlanScheduleInput, occurrenceIndex: number, occurrenceCount: number): TodayAssignment | null {
  const startFlat = toFlatIndex(plan.rangeStart);
  const endFlat = toFlatIndex(plan.rangeEnd);
  const forward = endFlat >= startFlat;
  const anchorPage = pageOfFlatIndex(startFlat); // page containing rangeStart — occurrence 0 anchors here
  const finalPage = pageOfFlatIndex(endFlat);    // page containing rangeEnd — the last occurrence anchors here
  const totalPages = Math.abs(finalPage - anchorPage) + 1;
  const dailyPages = Math.floor(totalPages / occurrenceCount);
  const isLast = occurrenceIndex === occurrenceCount - 1;

  if (dailyPages === 0 && !isLast) return null;

  const step = forward ? 1 : -1;
  const blockNearStartPage = anchorPage + occurrenceIndex * dailyPages * step;
  const blockNearEndPage = isLast ? finalPage : blockNearStartPage + (dailyPages - 1) * step;
  const loPage = Math.min(blockNearStartPage, blockNearEndPage);
  const hiPage = Math.max(blockNearStartPage, blockNearEndPage);

  let start = fromFlatIndex(firstFlatOfPage(loPage));
  let end = fromFlatIndex(lastFlatOfPage(hiPage));
  if (occurrenceIndex === 0) { if (forward) start = plan.rangeStart; else end = plan.rangeStart; }
  if (isLast) { if (forward) end = plan.rangeEnd; else start = plan.rangeEnd; }

  return {
    surahStart: start.surahNumber, ayahStart: start.ayah,
    surahEnd: end.surahNumber, ayahEnd: end.ayah,
    pageStart: loPage, pageEnd: hiPage,
  };
}

/**
 * The ayah slice due today, if today is one of the plan's selected days and falls
 * within the plan's active window.
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

  return sliceForOccurrence(plan, occurrenceIndex, occurrenceCount);
}

export type ScheduleEntry = TodayAssignment & {
  occurrenceIndex: number; // 1-based
  date: string; // ISO date (date-only, midnight local)
  juz: number; // juz' the slice's first ayah falls in
};

/** Safety cap on how many calendar days computeSchedule will walk looking for
 * occurrences, so a misconfigured plan (e.g. empty `days`, which validation
 * should prevent anyway) can't loop indefinitely. ~10 years of daily dates. */
const SCHEDULE_WALK_LIMIT_DAYS = 3650;

/** Full day-by-day breakdown of the plan: which ayah slice (and which juz') is
 * due on each occurrence date, from start to finish. */
export function computeScheduleBreakdown(plan: PlanScheduleInput): ScheduleEntry[] {
  const occurrenceCount = countOccurrences(plan);
  if (occurrenceCount <= 0) return [];

  const entries: ScheduleEntry[] = [];
  const cursor = dateOnly(plan.startDate);
  let occurrenceIndex = 0;
  let walked = 0;

  while (occurrenceIndex < occurrenceCount && walked < SCHEDULE_WALK_LIMIT_DAYS) {
    if (plan.days.includes(dayLabel(cursor))) {
      const slice = sliceForOccurrence(plan, occurrenceIndex, occurrenceCount);
      if (slice) {
        entries.push({
          ...slice,
          occurrenceIndex: occurrenceIndex + 1,
          date: cursor.toISOString(),
          juz: juzOfFlatIndex(toFlatIndex({ surahNumber: slice.surahStart, ayah: slice.ayahStart })),
        });
      }
      occurrenceIndex++;
    }
    cursor.setDate(cursor.getDate() + 1);
    walked++;
  }
  return entries;
}

export function surahName(surahNumber: number): string {
  return SURAH_BY_NUMBER.get(surahNumber)?.name ?? '';
}

export type PlanProgress = { completed: number; total: number; percent: number };

/**
 * How far along the plan's schedule is, regardless of whether today happens to be
 * one of its active days (unlike computeTodayAssignment, which only returns
 * something on a matching day). `completed` counts matching-weekday occurrences
 * from startDate through today (capped at endDate/activeDaysCount), so it keeps
 * climbing even on off days and settles at 100% once the plan is done.
 */
export function computePlanProgress(plan: PlanScheduleInput, today: Date = new Date()): PlanProgress | null {
  const total = countOccurrences(plan);
  if (total <= 0) return null;

  const startDate = dateOnly(plan.startDate);
  const todayDate = dateOnly(today);
  if (todayDate.getTime() < startDate.getTime()) return { completed: 0, total, percent: 0 };

  const cappedToday =
    plan.endType === 'date' && plan.endDate && todayDate.getTime() > dateOnly(plan.endDate).getTime()
      ? dateOnly(plan.endDate)
      : todayDate;

  const completed = Math.min(countMatchingDays(startDate, cappedToday, plan.days), total);
  const percent = Math.round((completed / total) * 100);
  return { completed, total, percent };
}

export type JuzProgress = { completed: number; total: number };

/**
 * How many of the ajza' spanned by the plan's range are fully finished, derived
 * from the same day-based `completed/total` ratio as computePlanProgress. This is
 * an ayah-count approximation (the actual per-day slices are page-aligned via
 * sliceForOccurrence, not perfectly even by ayah), close enough for a progress
 * indicator. `total` is the count of distinct ajza' the
 * plan's rangeStart..rangeEnd touches; `completed` counts only ajza' whose
 * entire span (clamped to the plan's range) has been covered so far — a juz'
 * that's only partially covered doesn't count yet.
 */
export function computeJuzProgress(plan: PlanScheduleInput, dayProgress: PlanProgress | null): JuzProgress | null {
  if (!dayProgress) return null;

  const rangeStartFlat = toFlatIndex(plan.rangeStart);
  const rangeEndFlat = toFlatIndex(plan.rangeEnd);
  const forward = rangeEndFlat >= rangeStartFlat;
  const loFlat = Math.min(rangeStartFlat, rangeEndFlat);
  const hiFlat = Math.max(rangeStartFlat, rangeEndFlat);
  const total = juzOfFlatIndex(hiFlat) - juzOfFlatIndex(loFlat) + 1;

  if (dayProgress.completed <= 0) return { completed: 0, total };

  // Progress accumulates from rangeStart toward rangeEnd — in a reverse-direction
  // plan that means shrinking from the high end downward, not always upward.
  const totalAyahs = hiFlat - loFlat + 1;
  const coveredAyahs = Math.round(totalAyahs * (dayProgress.completed / dayProgress.total));
  const coveredBoundaryFlat = forward
    ? Math.min(rangeStartFlat + coveredAyahs - 1, rangeEndFlat)
    : Math.max(rangeStartFlat - coveredAyahs + 1, rangeEndFlat);
  const loCovered = Math.min(rangeStartFlat, coveredBoundaryFlat);
  const hiCovered = Math.max(rangeStartFlat, coveredBoundaryFlat);

  // Walk juz' starting from rangeStart's side toward rangeEnd's side (matching
  // the direction completion actually accumulates in), stopping at the first
  // not-yet-fully-covered juz'.
  const juzOfRangeStart = juzOfFlatIndex(rangeStartFlat);
  const juzOfRangeEnd = juzOfFlatIndex(rangeEndFlat);
  const juzStep = forward ? 1 : -1;
  let completed = 0;
  let j = juzOfRangeStart;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const juzStartFlat = JUZ_STARTS_FLAT[j - 1];
    const juzEndFlat = j < 30 ? JUZ_STARTS_FLAT[j] - 1 : Number.MAX_SAFE_INTEGER;
    const effStart = Math.max(juzStartFlat, loFlat);
    const effEnd = Math.min(juzEndFlat, hiFlat);
    if (loCovered <= effStart && hiCovered >= effEnd) completed++;
    else break;
    if (j === juzOfRangeEnd) break;
    j += juzStep;
  }
  return { completed, total };
}
