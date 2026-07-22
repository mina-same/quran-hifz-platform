import { SURAHS } from "../data/surahs";
import { JUZ_STARTS } from "../data/juz";
import quranPageRangesJson from "../data/quranPageRanges.json";

const PAGE_STARTS = quranPageRangesJson.map((p) => ({ number: p.page, surahNumber: p.start.surah, ayah: p.start.ayah }));

export type RangePoint = { surahNumber: number; ayah: number };

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

const TOTAL_AYAHS = SURAHS.reduce((sum, s) => sum + s.ayahCount, 0);

/** The [start,end] flat-index range (inclusive) spanned by the given 1-based juz'. */
export function juzFlatRange(juz: number): { start: number; end: number } {
  return {
    start: JUZ_STARTS_FLAT[juz - 1],
    end: juz < 30 ? JUZ_STARTS_FLAT[juz] - 1 : TOTAL_AYAHS - 1,
  };
}

const PAGE_STARTS_FLAT: number[] = PAGE_STARTS.map((p) => toFlatIndex({ surahNumber: p.surahNumber, ayah: p.ayah }));

function pageOfFlatIndex(flatIndex: number): number {
  let page = 1;
  for (let i = 0; i < PAGE_STARTS_FLAT.length; i++) {
    if (flatIndex >= PAGE_STARTS_FLAT[i]) page = i + 1;
    else break;
  }
  return page;
}

/** Span size (in ayahs) between two points — order-independent, since `start`
 * may sit after `end` in mushaf order (a reverse-direction range). */
export function countRangeAyahs(start: RangePoint, end: RangePoint): number {
  return Math.abs(toFlatIndex(end) - toFlatIndex(start)) + 1;
}

export type PageRange = { pageStart: number; pageEnd: number; pageCount: number };

/** The mushaf page range (and page count) spanned by an ayah range, inclusive —
 * a pure display/span utility, so it always normalizes to `pageStart <= pageEnd`
 * even when `start` sits after `end` in mushaf order (a reverse-direction range). */
export function pageRangeOfAyahRange(start: RangePoint, end: RangePoint): PageRange {
  const a = pageOfFlatIndex(toFlatIndex(start));
  const b = pageOfFlatIndex(toFlatIndex(end));
  const pageStart = Math.min(a, b);
  const pageEnd = Math.max(a, b);
  return { pageStart, pageEnd, pageCount: pageEnd - pageStart + 1 };
}

function firstFlatOfPage(page: number): number {
  return PAGE_STARTS_FLAT[page - 1];
}
function lastFlatOfPage(page: number): number {
  return page < PAGE_STARTS_FLAT.length ? PAGE_STARTS_FLAT[page] - 1 : TOTAL_AYAHS - 1;
}

/** Fractional page position for a schedule day's "من"/"إلى" display. An ayah that
 * lands exactly on its page's first ayah (as a range start) or last ayah (as a
 * range end) is a "clean" page boundary — shown as the plain page number. Any
 * other ayah is mid-page — shown as `page + (position within page / page length)`
 * rounded to one decimal, e.g. a day ending 70% through page 2 shows as `2.7`, so
 * a partial-page day reads differently from a day that completes the page. */
export function fractionalPage(point: RangePoint, edge: "start" | "end"): { value: number; isPartial: boolean } {
  const flat = toFlatIndex(point);
  const page = pageOfFlatIndex(flat);
  const first = firstFlatOfPage(page);
  const last = lastFlatOfPage(page);
  const pageLen = last - first + 1;
  const posInPage = flat - first + 1;
  const isCleanBoundary = edge === "start" ? posInPage === 1 : posInPage === pageLen;
  if (isCleanBoundary) return { value: page, isPartial: false };
  return { value: page + Math.round((posInPage / pageLen) * 10) / 10, isPartial: true };
}

// ── Live schedule breakdown (client-side mirror of the server's quranRange.ts) ──
// Kept in sync manually with quran-hifz-server/src/lib/quranRange.ts, same
// byte-for-byte-logic convention as the SURAHS/JUZ_STARTS data copies. Used to
// preview a plan's day-by-day division in TeacherPlanForm before it's saved
// (the server computes the identical breakdown for saved plans).

/** Sat..Fri order, matches the 7 toggle chips shown in the plan-builder UI. */
export const WEEK_DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

/** Arabic weekday label for JS Date#getDay() (0=Sunday..6=Saturday). */
const DAY_BY_JS_INDEX = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

export function surahName(surahNumber: number): string {
  return SURAH_BY_NUMBER.get(surahNumber)?.name ?? "";
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
  endType: "activeDays" | "date";
  activeDaysCount?: number;
  endDate?: Date;
  rangeStart: RangePoint;
  rangeEnd: RangePoint;
};

/** Total occurrence count for the plan's schedule. */
export function countOccurrences(plan: PlanScheduleInput): number {
  if (plan.endType === "activeDays") return plan.activeDaysCount ?? 0;
  if (!plan.endDate) return 0;
  return countMatchingDays(plan.startDate, plan.endDate, plan.days);
}

export type TodayAssignment = {
  surahStart: number;
  ayahStart: number;
  surahEnd: number;
  ayahEnd: number;
  pageStart: number;
  pageEnd: number;
};

/** The ayah slice for a given 0-based occurrence index — page-aligned, so
 * intermediate days start/end on a clean page boundary; only the first day
 * (anchored at rangeStart) and last day (anchored at rangeEnd) may be partial
 * pages. Handles reverse-direction plans (rangeStart after rangeEnd in mushaf
 * order): the sequence of days runs backward, but each day still reads forward. */
function sliceForOccurrence(plan: PlanScheduleInput, occurrenceIndex: number, occurrenceCount: number): TodayAssignment | null {
  const startFlat = toFlatIndex(plan.rangeStart);
  const endFlat = toFlatIndex(plan.rangeEnd);
  const forward = endFlat >= startFlat;
  const anchorPage = pageOfFlatIndex(startFlat);
  const finalPage = pageOfFlatIndex(endFlat);
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

export type ScheduleEntry = TodayAssignment & {
  occurrenceIndex: number; // 1-based
  date: string; // ISO date
  juz: number;
};

/** Safety cap on how many calendar days computeScheduleBreakdown will walk. */
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
