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

/** Local calendar key (YYYY-MM-DD) for a date — the same shape holidays are
 * stored in, compared on local calendar fields like dateOnly/dayLabel do. */
function dateKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
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

/** Count how many dates in [from, to] (inclusive, date-only) fall on one of `days`
 * and are not holidays. */
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
  endType: 'activeDays' | 'date';
  activeDaysCount?: number;
  endDate?: Date;
  /** Calendar days (YYYY-MM-DD) excluded from the plan even when they fall on
   * one of `days` — they produce no occurrence at all. */
  holidays?: string[];
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
  return countMatchingDays(plan.startDate, plan.endDate!, plan.days, holidaySet(plan));
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

  const holidays = holidaySet(plan);

  if (!isOccurrenceDay(todayDate, plan.days, holidays)) return null;
  if (todayDate.getTime() < startDate.getTime()) return null;
  if (plan.endType === 'date' && todayDate.getTime() > dateOnly(plan.endDate!).getTime()) return null;

  const occurrenceCount = countOccurrences(plan);
  if (occurrenceCount <= 0) return null;

  const occurrenceIndex = countMatchingDays(startDate, todayDate, plan.days, holidays) - 1;
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

  const completed = Math.min(countMatchingDays(startDate, cappedToday, plan.days, holidaySet(plan)), total);
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

/* ─── Multi-segment plans ───────────────────────────────────────────────────
 *
 * A plan carries one segment per type (حفظ / مراجعة / ترتيل / تلاوة). All
 * segments share the plan's window — start date, end, holidays — and differ
 * only in which weekdays they own and which stretch of the mushaf they cover.
 *
 * The weekdays are PARTITIONED: a given date belongs to at most one segment,
 * which is what lets a day's ward, its evaluation and its reflow all stay
 * single-valued. `validateSegmentDays` below is what enforces that.
 */

export type PlanType = 'حفظ' | 'مراجعة' | 'ترتيل' | 'تلاوة';
export const PLAN_TYPES: PlanType[] = ['حفظ', 'مراجعة', 'ترتيل', 'تلاوة'];

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
      // Days are partitioned, so at most one segment can claim this date.
      const seg = plan.segments.find((s) => s.days.includes(label));
      if (seg) {
        counts.set(seg.type, (counts.get(seg.type) ?? 0) + 1);
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

/** The segment that owns a given date, or null on an off day/holiday. */
export function segmentForDate(plan: MultiPlanInput, d: Date): PlanSegmentInput | null {
  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;
  const day = dateOnly(d);
  if (holidays.has(dateKey(day))) return null;
  const label = dayLabel(day);
  return plan.segments.find((s) => s.days.includes(label)) ?? null;
}

/** Today's ward across the plan — at most one, since days are partitioned. */
export function computeMultiTodayAssignment(
  plan: MultiPlanInput,
  today: Date = new Date(),
): (TodayAssignment & { type: PlanType }) | null {
  const seg = segmentForDate(plan, today);
  if (!seg) return null;
  const count = segmentOccurrenceCounts(plan).get(seg.type) ?? 0;
  if (count <= 0) return null;
  const slice = computeTodayAssignment(segmentAsScheduleInput(plan, seg, count), today);
  return slice ? { ...slice, type: seg.type } : null;
}

/**
 * Rejects a segment set where two types claim the same weekday, or a segment
 * has no days, or a type appears twice. Returns an Arabic message, or null when
 * the set is valid. Shared by the API and both clients' forms.
 */
export function validateSegmentDays(segments: PlanSegmentInput[]): string | null {
  if (segments.length === 0) return 'يجب اختيار نوع واحد على الأقل';

  const seenTypes = new Set<PlanType>();
  const owner = new Map<string, PlanType>();
  for (const seg of segments) {
    if (seenTypes.has(seg.type)) return `النوع "${seg.type}" مكرر — كل نوع مرة واحدة فقط`;
    seenTypes.add(seg.type);

    if (seg.days.length === 0) return `اختر أيام "${seg.type}"`;

    for (const day of seg.days) {
      const taken = owner.get(day);
      if (taken) return `يوم ${day} مُسنَد لـ"${taken}" و"${seg.type}" — اليوم الواحد لنوع واحد فقط`;
      owner.set(day, seg.type);
    }
  }
  return null;
}
