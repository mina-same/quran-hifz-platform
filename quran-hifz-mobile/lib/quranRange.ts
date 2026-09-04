import { SURAHS } from "./data/surahs";
import { JUZ_STARTS } from "./data/juz";
import quranPageRangesJson from "./data/quranPageRanges.json";

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

export function pageOfFlatIndex(flatIndex: number): number {
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

export function firstFlatOfPage(page: number): number {
  return PAGE_STARTS_FLAT[page - 1];
}
export function lastFlatOfPage(page: number): number {
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

/** A reverse-direction plan: rangeStart sits after rangeEnd in mushaf order. */
export function isReversedRange(rangeStart: RangePoint, rangeEnd: RangePoint): boolean {
  return toFlatIndex(rangeStart) > toFlatIndex(rangeEnd);
}

/** A student's own schedule can run a different direction than the shared plan
 * it hangs off (a custom-range individual plan), so direction for anything
 * per-student must be inferred from that student's own occurrences — mirrors
 * the server's `isForwardDoc` in studentPlanReflow.ts. A single occurrence
 * tells us nothing (its own endpoints are always stored low→high), so returns
 * null when there's nothing to compare and the caller should fall back to the
 * base plan's own direction. */
export function isReversedSchedule(
  entries?: { occurrenceIndex: number; basePageStart?: number; pageStart: number }[],
): boolean | null {
  if (!entries || entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);
  const first = sorted[0].basePageStart ?? sorted[0].pageStart;
  const second = sorted[1].basePageStart ?? sorted[1].pageStart;
  return second < first;
}

type DaySlice = { surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number };

/** The point a day's ward *ends* at in the plan's own direction: the slice's
 * high end for a forward plan, its low end for a reverse one — a reverse plan's
 * day is worked from the end of the mushaf backward, so "finished it all" means
 * the student reached the slice's *first* ayah, not its last. Slices are always
 * stored low→high regardless of direction, hence the swap. */
export function dayFinishPoint(slice: DaySlice, reversed: boolean): RangePoint {
  return reversed
    ? { surahNumber: slice.surahStart, ayah: slice.ayahStart }
    : { surahNumber: slice.surahEnd, ayah: slice.ayahEnd };
}

/** Where the point the student actually reached sits relative to the day's own
 * finish point, signed in the plan's own direction: negative = fell short of
 * the assigned ward, positive = recited past it, 0 = exactly the ward. The
 * server settles either sign against the student's remaining days — a
 * shortfall makes them heavier, a surplus makes them lighter. */
export function dayDeltaAyahs(slice: DaySlice, reversed: boolean, reached: RangePoint): number {
  const reachedFlat = toFlatIndex(reached);
  const finishFlat = toFlatIndex(dayFinishPoint(slice, reversed));
  return reversed ? finishFlat - reachedFlat : reachedFlat - finishFlat;
}

/** How much of the day's ward is still undone given the point the student
 * actually reached, measured in the plan's own direction (0 = the whole ward is
 * done, or more). This is the shortfall the server will redistribute across the
 * student's remaining days. */
export function dayShortfallAyahs(slice: DaySlice, reversed: boolean, reached: RangePoint): number {
  return Math.max(0, -dayDeltaAyahs(slice, reversed, reached));
}

type FinishBoundEntry = DaySlice & {
  occurrenceIndex: number;
  baseSurahStart?: number; baseAyahStart?: number;
  baseSurahEnd?: number; baseAyahEnd?: number;
};

/** The very last point a schedule ever reaches, in its own direction — the
 * finish point of its final occurrence, read off the original (`base*`)
 * endpoints so it stays put no matter how the days in between were reflowed.
 * This is the ceiling for "سمّع أكثر من المقرر": a student may run ahead into
 * the following days' ward, but never past the end of their own plan. */
export function planFinishPoint(entries: FinishBoundEntry[], reversed: boolean): RangePoint | null {
  if (entries.length === 0) return null;
  const last = entries.reduce((a, b) => (b.occurrenceIndex > a.occurrenceIndex ? b : a));
  return reversed
    ? { surahNumber: last.baseSurahStart ?? last.surahStart, ayah: last.baseAyahStart ?? last.ayahStart }
    : { surahNumber: last.baseSurahEnd ?? last.surahEnd, ayah: last.baseAyahEnd ?? last.ayahEnd };
}

type OrientableSlice = {
  surahStart: number; ayahStart: number; surahEnd: number; ayahEnd: number;
  pageStart: number; pageEnd: number;
};

/** Reorders a slice's endpoints for *display* in the plan's own direction:
 * returned unchanged for a forward plan, endpoint-swapped for a reverse plan
 * (so "من" reads as the point nearer the plan's start). Storage/computation
 * always stay low→high — this only flips presentation. */
export function orientSlice<T extends OrientableSlice>(slice: T, reversed: boolean): OrientableSlice {
  if (!reversed) {
    return {
      surahStart: slice.surahStart, ayahStart: slice.ayahStart,
      surahEnd: slice.surahEnd, ayahEnd: slice.ayahEnd,
      pageStart: slice.pageStart, pageEnd: slice.pageEnd,
    };
  }
  return {
    surahStart: slice.surahEnd, ayahStart: slice.ayahEnd,
    surahEnd: slice.surahStart, ayahEnd: slice.ayahStart,
    pageStart: slice.pageEnd, pageEnd: slice.pageStart,
  };
}

// ── Live schedule breakdown (client-side mirror of the server's quranRange.ts) ──
// Kept in sync manually with quran-hifz-server/src/lib/quranRange.ts and the web
// copy at quran-hifz/src/quran/lib/quranRange.ts, same byte-for-byte-logic
// convention as the SURAHS/JUZ_STARTS data copies.

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

/** Local calendar key (YYYY-MM-DD) for a date — the same shape holidays are
 * stored in, compared on local calendar fields like dateOnly/dayLabel do. */
function dateKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

const NO_HOLIDAYS: ReadonlySet<string> = new Set<string>();

/** The plan's holidays as a lookup set — built once per top-level call and
 * threaded through the walkers instead of being rebuilt inside their loops. */
function holidaySet(plan: PlanScheduleInput): ReadonlySet<string> {
  return plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;
}

/** Whether `d` earns an occurrence: one of the plan's selected weekdays, and
 * not a holiday. A holiday never consumes an occurrence — the day's content
 * simply lands on the next working day instead. */
function isOccurrenceDay(d: Date, days: string[], holidays: ReadonlySet<string>): boolean {
  return days.includes(dayLabel(d)) && !holidays.has(dateKey(d));
}

/** Count how many dates in [from, to] (inclusive, date-only) fall on one of `days`. */
function countMatchingDays(from: Date, to: Date, days: string[], holidays: ReadonlySet<string>): number {
  let count = 0;
  const cursor = dateOnly(from);
  const end = dateOnly(to);
  while (cursor.getTime() <= end.getTime()) {
    if (isOccurrenceDay(cursor, days, holidays)) count++;
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
  /** Calendar days (YYYY-MM-DD) excluded from the plan even when they fall on
   * one of `days` — they produce no occurrence at all. */
  holidays?: string[];
  rangeStart: RangePoint;
  rangeEnd: RangePoint;
};

/** Total occurrence count for the plan's schedule. */
export function countOccurrences(plan: PlanScheduleInput): number {
  if (plan.endType === "activeDays") return plan.activeDaysCount ?? 0;
  if (!plan.endDate) return 0;
  return countMatchingDays(plan.startDate, plan.endDate, plan.days, holidaySet(plan));
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
export function sliceForOccurrence(plan: PlanScheduleInput, occurrenceIndex: number, occurrenceCount: number): TodayAssignment | null {
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
  const holidays = holidaySet(plan);
  const cursor = dateOnly(plan.startDate);
  let occurrenceIndex = 0;
  let walked = 0;

  while (occurrenceIndex < occurrenceCount && walked < SCHEDULE_WALK_LIMIT_DAYS) {
    if (isOccurrenceDay(cursor, plan.days, holidays)) {
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

/* ─── Multi-segment plans ───────────────────────────────────────────────────
 *
 * A plan carries one segment per type (حفظ / مراجعة). All
 * segments share the plan's window — start date, end, holidays — and differ
 * only in which weekdays they own and which stretch of the mushaf they cover.
 *
 * Weekdays may now be shared by more than one segment (حفظ + مراجعة on the
 * same day). Ward and occurrence tracking stay per-segment, so each type
 * counts and tracks independently even when sharing a calendar day.
 */

export type PlanType = 'حفظ' | 'مراجعة';
export const PLAN_TYPES: PlanType[] = ['حفظ', 'مراجعة'];

export type PlanSegmentInput = {
  type: PlanType;
  days: string[];
  rangeStart: RangePoint;
  rangeEnd: RangePoint;
};

/** The plan-level window every segment shares. */
export type PlanWindowInput = {
  startDate: Date;
  endType: 'activeDays' | 'date';
  activeDaysCount?: number;
  endDate?: Date;
  holidays?: string[];
};

export type MultiPlanInput = PlanWindowInput & { segments: PlanSegmentInput[] };

/** Every weekday the plan is active on, across all its segments. */
export function unionDays(segments: PlanSegmentInput[]): string[] {
  return Array.from(new Set(segments.flatMap((s) => s.days)));
}

/**
 * How many occurrences each segment gets inside the shared window.
 *
 * For `endType: 'date'` this is just each segment's matching days in range.
 *
 * For `activeDays` the count is the plan's TOTAL active days across all types
 * (confirmed with the user: the duration is one shared duration, and the types
 * differ only in how the week is split between them). So the walk counts days
 * matching ANY segment until it has seen `activeDaysCount` of them, tallying
 * which segment each one belongs to along the way.
 */
export function segmentOccurrenceCounts(plan: MultiPlanInput): Map<PlanType, number> {
  const counts = new Map<PlanType, number>();
  for (const seg of plan.segments) counts.set(seg.type, 0);

  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;

  if (plan.endType === 'date') {
    for (const seg of plan.segments) {
      counts.set(seg.type, countMatchingDays(plan.startDate, plan.endDate!, seg.days, holidays));
    }
    return counts;
  }

  const target = plan.activeDaysCount ?? 0;
  const cursor = dateOnly(plan.startDate);
  let seen = 0;
  let walked = 0;
  while (seen < target && walked < SCHEDULE_WALK_LIMIT_DAYS) {
    if (!holidays.has(dateKey(cursor))) {
      const label = dayLabel(cursor);
      // A day can now fund more than one segment (حفظ + مراجعة sharing a
      // weekday) — every matching segment gets an occurrence, but the day
      // still consumes only one unit of the shared calendar-day budget.
      const matching = plan.segments.filter((s) => s.days.includes(label));
      if (matching.length > 0) {
        for (const seg of matching) counts.set(seg.type, (counts.get(seg.type) ?? 0) + 1);
        seen++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    walked++;
  }
  return counts;
}

/** One segment expressed as the single-track input the existing math takes.
 * The occurrence count is pinned, so the walk stops exactly where the shared
 * window says it should. */
function segmentAsScheduleInput(
  plan: PlanWindowInput,
  seg: PlanSegmentInput,
  occurrenceCount: number,
): PlanScheduleInput {
  return {
    days: seg.days,
    startDate: plan.startDate,
    holidays: plan.holidays,
    endType: 'activeDays',
    activeDaysCount: occurrenceCount,
    rangeStart: seg.rangeStart,
    rangeEnd: seg.rangeEnd,
  };
}

export type SegmentScheduleEntry = ScheduleEntry & { type: PlanType };

/**
 * Day-by-day breakdown for every segment, merged and sorted by date.
 *
 * `occurrenceIndex` stays 1-based **within its own segment** — that is what
 * reflow walks when a student falls short, and it must not be shared across
 * types. Pair it with `type` to address a day uniquely.
 */
export function computeMultiScheduleBreakdown(plan: MultiPlanInput): SegmentScheduleEntry[] {
  const counts = segmentOccurrenceCounts(plan);
  const out: SegmentScheduleEntry[] = [];
  for (const seg of plan.segments) {
    const count = counts.get(seg.type) ?? 0;
    if (count <= 0) continue;
    for (const entry of computeScheduleBreakdown(segmentAsScheduleInput(plan, seg, count))) {
      out.push({ ...entry, type: seg.type });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Every segment that owns a given date — a date can now belong to more than
 * one segment (حفظ + مراجعة sharing a weekday), so this returns an array,
 * not a single winner. Empty on an off day/holiday. */
export function segmentsForDate(plan: MultiPlanInput, d: Date): PlanSegmentInput[] {
  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;
  const day = dateOnly(d);
  if (holidays.has(dateKey(day))) return [];
  const label = dayLabel(day);
  return plan.segments.filter((s) => s.days.includes(label));
}

/**
 * Rejects a segment set where a segment has no days, or a type appears
 * twice. Returns an Arabic message, or null when the set is valid. Shared
 * by the API and both clients' forms. Two different types MAY claim the
 * same weekday — that is exactly what lets a plan run حفظ and مراجعة on the
 * same day; each still tracks its own ward/occurrence independently.
 */
export function validateSegmentDays(segments: PlanSegmentInput[]): string | null {
  if (segments.length === 0) return 'يجب اختيار نوع واحد على الأقل';

  const seenTypes = new Set<PlanType>();
  for (const seg of segments) {
    if (seenTypes.has(seg.type)) return `النوع "${seg.type}" مكرر — كل نوع مرة واحدة فقط`;
    seenTypes.add(seg.type);

    if (seg.days.length === 0) return `اختر أيام "${seg.type}"`;
  }
  return null;
}
