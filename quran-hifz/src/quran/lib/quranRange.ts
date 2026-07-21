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
