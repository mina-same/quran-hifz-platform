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

export function countRangeAyahs(start: RangePoint, end: RangePoint): number {
  return toFlatIndex(end) - toFlatIndex(start) + 1;
}

export type PageRange = { pageStart: number; pageEnd: number; pageCount: number };

/** The mushaf page range (and page count) spanned by an ayah range, inclusive. */
export function pageRangeOfAyahRange(start: RangePoint, end: RangePoint): PageRange {
  const pageStart = pageOfFlatIndex(toFlatIndex(start));
  const pageEnd = pageOfFlatIndex(toFlatIndex(end));
  return { pageStart, pageEnd, pageCount: pageEnd - pageStart + 1 };
}
