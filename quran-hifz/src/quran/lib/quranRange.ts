import { SURAHS } from "../data/surahs";
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

function toFlatIndex({ surahNumber, ayah }: RangePoint): number {
  return CUMULATIVE_BEFORE[surahNumber] + (ayah - 1);
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
