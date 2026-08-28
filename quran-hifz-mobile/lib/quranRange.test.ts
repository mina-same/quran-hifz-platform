/// <reference types="jest" />
import {
  toFlatIndex,
  fromFlatIndex,
  juzOfFlatIndex,
  juzFlatRange,
  countRangeAyahs,
  pageRangeOfAyahRange,
  fractionalPage,
  isReversedRange,
  isReversedSchedule,
  dayFinishPoint,
  dayShortfallAyahs,
  orientSlice,
  surahName,
  countOccurrences,
  computeScheduleBreakdown,
  WEEK_DAYS,
  type RangePoint,
} from './quranRange';

describe('toFlatIndex / fromFlatIndex', () => {
  it('round-trips a point through the flat index', () => {
    const point: RangePoint = { surahNumber: 2, ayah: 142 };
    const flat = toFlatIndex(point);
    expect(fromFlatIndex(flat)).toEqual(point);
  });

  it('places Al-Fatiha at the very start', () => {
    expect(toFlatIndex({ surahNumber: 1, ayah: 1 })).toBe(0);
  });

  it('is monotonically increasing across a surah boundary', () => {
    const lastOfFatiha = toFlatIndex({ surahNumber: 1, ayah: 7 });
    const firstOfBaqarah = toFlatIndex({ surahNumber: 2, ayah: 1 });
    expect(firstOfBaqarah).toBe(lastOfFatiha + 1);
  });
});

describe('juzOfFlatIndex / juzFlatRange', () => {
  it('places every juz start point in its own juz number', () => {
    const juzStarts: [number, RangePoint][] = [
      [1, { surahNumber: 1, ayah: 1 }],
      [2, { surahNumber: 2, ayah: 142 }],
      [3, { surahNumber: 2, ayah: 253 }],
      [30, { surahNumber: 78, ayah: 1 }],
    ];
    for (const [juz, point] of juzStarts) {
      expect(juzOfFlatIndex(toFlatIndex(point))).toBe(juz);
    }
  });

  it('the ayah just before a juz start still belongs to the previous juz', () => {
    const juz2Start = toFlatIndex({ surahNumber: 2, ayah: 142 });
    expect(juzOfFlatIndex(juz2Start - 1)).toBe(1);
  });

  it('juzFlatRange bounds are contiguous with the next juz', () => {
    const j1 = juzFlatRange(1);
    const j2 = juzFlatRange(2);
    expect(j1.end + 1).toBe(j2.start);
  });

  it('the last juz (30) ends at the very last ayah of the mushaf', () => {
    const j30 = juzFlatRange(30);
    const lastPoint = fromFlatIndex(j30.end);
    expect(lastPoint).toEqual({ surahNumber: 114, ayah: 6 });
  });
});

describe('countRangeAyahs', () => {
  it('is order-independent (same count whichever endpoint is "start")', () => {
    const a: RangePoint = { surahNumber: 1, ayah: 1 };
    const b: RangePoint = { surahNumber: 2, ayah: 5 };
    expect(countRangeAyahs(a, b)).toBe(countRangeAyahs(b, a));
  });

  it('a single ayah spans exactly 1', () => {
    const p: RangePoint = { surahNumber: 18, ayah: 10 };
    expect(countRangeAyahs(p, p)).toBe(1);
  });
});

describe('pageRangeOfAyahRange', () => {
  it('always normalizes pageStart <= pageEnd even for a reversed range', () => {
    const forward = pageRangeOfAyahRange({ surahNumber: 1, ayah: 1 }, { surahNumber: 5, ayah: 1 });
    const reversed = pageRangeOfAyahRange({ surahNumber: 5, ayah: 1 }, { surahNumber: 1, ayah: 1 });
    expect(reversed).toEqual(forward);
    expect(reversed.pageStart).toBeLessThanOrEqual(reversed.pageEnd);
  });

  it('page 1 covers all of Al-Fatiha', () => {
    const range = pageRangeOfAyahRange({ surahNumber: 1, ayah: 1 }, { surahNumber: 1, ayah: 7 });
    expect(range).toEqual({ pageStart: 1, pageEnd: 1, pageCount: 1 });
  });
});

describe('fractionalPage', () => {
  it('reports a clean boundary at the first ayah of a page (as a start)', () => {
    const result = fractionalPage({ surahNumber: 1, ayah: 1 }, 'start');
    expect(result).toEqual({ value: 1, isPartial: false });
  });

  it('reports a partial page for a mid-page ayah', () => {
    // Page 3 spans Al-Baqarah 6-16; ayah 10 sits mid-page, not a boundary either direction.
    const result = fractionalPage({ surahNumber: 2, ayah: 10 }, 'end');
    expect(result.isPartial).toBe(true);
    expect(result.value).toBeGreaterThan(3);
  });
});

describe('isReversedRange / isReversedSchedule', () => {
  it('a forward range (start before end in mushaf order) is not reversed', () => {
    expect(isReversedRange({ surahNumber: 1, ayah: 1 }, { surahNumber: 2, ayah: 1 })).toBe(false);
  });

  it('a reverse range (start after end in mushaf order) is reversed', () => {
    expect(isReversedRange({ surahNumber: 114, ayah: 6 }, { surahNumber: 1, ayah: 1 })).toBe(true);
  });

  it('returns null with fewer than 2 occurrences (nothing to compare)', () => {
    expect(isReversedSchedule([])).toBeNull();
    expect(isReversedSchedule([{ occurrenceIndex: 1, pageStart: 5 }])).toBeNull();
  });

  it('infers direction from two occurrences: descending pages means reversed', () => {
    const entries = [
      { occurrenceIndex: 1, pageStart: 10 },
      { occurrenceIndex: 2, pageStart: 8 },
    ];
    expect(isReversedSchedule(entries)).toBe(true);
  });

  it('infers direction from two occurrences: ascending pages means forward', () => {
    const entries = [
      { occurrenceIndex: 1, pageStart: 8 },
      { occurrenceIndex: 2, pageStart: 10 },
    ];
    expect(isReversedSchedule(entries)).toBe(false);
  });

  it('prefers basePageStart over pageStart when both are present', () => {
    const entries = [
      { occurrenceIndex: 1, basePageStart: 10, pageStart: 1 },
      { occurrenceIndex: 2, basePageStart: 8, pageStart: 20 },
    ];
    expect(isReversedSchedule(entries)).toBe(true);
  });
});

describe('dayFinishPoint / dayShortfallAyahs', () => {
  const slice = { surahStart: 2, ayahStart: 1, surahEnd: 2, ayahEnd: 20 };

  it('a forward day finishes at the slice high end', () => {
    expect(dayFinishPoint(slice, false)).toEqual({ surahNumber: 2, ayah: 20 });
  });

  it('a reversed day finishes at the slice low end', () => {
    expect(dayFinishPoint(slice, true)).toEqual({ surahNumber: 2, ayah: 1 });
  });

  it('reaching the finish point exactly leaves zero shortfall (forward)', () => {
    expect(dayShortfallAyahs(slice, false, { surahNumber: 2, ayah: 20 })).toBe(0);
  });

  it('stopping partway through leaves a positive shortfall (forward)', () => {
    expect(dayShortfallAyahs(slice, false, { surahNumber: 2, ayah: 15 })).toBe(5);
  });

  it('stopping partway through leaves a positive shortfall (reversed)', () => {
    // reversed: finish point is ayah 1; reaching ayah 10 (not yet at 1) still owes 9.
    expect(dayShortfallAyahs(slice, true, { surahNumber: 2, ayah: 10 })).toBe(9);
  });

  it('never returns a negative shortfall (overshoot clamps to 0)', () => {
    expect(dayShortfallAyahs(slice, false, { surahNumber: 3, ayah: 1 })).toBe(0);
  });
});

describe('orientSlice', () => {
  const slice = { surahStart: 1, ayahStart: 1, surahEnd: 2, ayahEnd: 50, pageStart: 1, pageEnd: 8 };

  it('passes a forward slice through unchanged', () => {
    expect(orientSlice(slice, false)).toEqual(slice);
  });

  it('swaps endpoints for a reversed slice, so "من" reads as the point nearer the plan start', () => {
    const oriented = orientSlice(slice, true);
    expect(oriented).toEqual({
      surahStart: 2, ayahStart: 50,
      surahEnd: 1, ayahEnd: 1,
      pageStart: 8, pageEnd: 1,
    });
  });
});

describe('surahName', () => {
  it('resolves known surah numbers', () => {
    expect(surahName(1)).toBe('الفاتحة');
    expect(surahName(114)).toBe('الناس');
  });

  it('returns an empty string for an out-of-range number', () => {
    expect(surahName(200)).toBe('');
  });
});

describe('countOccurrences', () => {
  const base = {
    startDate: new Date(2026, 0, 1),
    rangeStart: { surahNumber: 1, ayah: 1 },
    rangeEnd: { surahNumber: 2, ayah: 286 },
  };

  it('returns the explicit count for an activeDays-ended plan', () => {
    expect(countOccurrences({ ...base, days: [...WEEK_DAYS], endType: 'activeDays', activeDaysCount: 10 })).toBe(10);
  });

  it('returns 0 for a date-ended plan with no endDate given', () => {
    expect(countOccurrences({ ...base, days: [...WEEK_DAYS], endType: 'date' })).toBe(0);
  });

  it('counts only the matching weekdays for a date-ended plan', () => {
    // 2026-01-03 is a Saturday; a 7-day window with only Saturday/Sunday selected should count 2.
    const count = countOccurrences({
      ...base,
      days: ['السبت', 'الأحد'],
      endType: 'date',
      startDate: new Date(2026, 0, 3),
      endDate: new Date(2026, 0, 9),
    });
    expect(count).toBe(2);
  });
});

describe('computeScheduleBreakdown', () => {
  it('produces one entry per occurrence, in ascending date order, ending exactly at rangeEnd', () => {
    const entries = computeScheduleBreakdown({
      days: [...WEEK_DAYS],
      startDate: new Date(2026, 0, 1),
      endType: 'activeDays',
      activeDaysCount: 5,
      rangeStart: { surahNumber: 1, ayah: 1 },
      rangeEnd: { surahNumber: 2, ayah: 286 },
    });

    expect(entries).toHaveLength(5);
    expect(entries.map((e) => e.occurrenceIndex)).toEqual([1, 2, 3, 4, 5]);

    for (let i = 1; i < entries.length; i++) {
      expect(new Date(entries[i].date).getTime()).toBeGreaterThan(new Date(entries[i - 1].date).getTime());
    }

    const first = entries[0];
    const last = entries[entries.length - 1];
    expect(first.surahStart).toBe(1);
    expect(first.ayahStart).toBe(1);
    expect(last.surahEnd).toBe(2);
    expect(last.ayahEnd).toBe(286);
  });

  it('handles a reverse-direction plan (rangeStart after rangeEnd) without dropping days', () => {
    // surah 114 back through surah 90 spans several mushaf pages, wide enough for 3 daily slices.
    const entries = computeScheduleBreakdown({
      days: [...WEEK_DAYS],
      startDate: new Date(2026, 0, 1),
      endType: 'activeDays',
      activeDaysCount: 3,
      rangeStart: { surahNumber: 114, ayah: 6 },
      rangeEnd: { surahNumber: 90, ayah: 1 },
    });

    expect(entries).toHaveLength(3);
    // Slice fields are always stored low->high in mushaf order regardless of direction;
    // for a reverse plan the anchor (rangeStart) lands in the *end* of the first occurrence,
    // and rangeEnd lands in the *start* of the last occurrence (orientSlice flips these for display only).
    expect(entries[0].surahEnd).toBe(114);
    expect(entries[0].ayahEnd).toBe(6);
    expect(entries[entries.length - 1].surahStart).toBe(90);
    expect(entries[entries.length - 1].ayahStart).toBe(1);
  });

  it('returns an empty schedule when there are 0 occurrences', () => {
    const entries = computeScheduleBreakdown({
      days: [...WEEK_DAYS],
      startDate: new Date(2026, 0, 1),
      endType: 'activeDays',
      activeDaysCount: 0,
      rangeStart: { surahNumber: 1, ayah: 1 },
      rangeEnd: { surahNumber: 1, ayah: 7 },
    });
    expect(entries).toEqual([]);
  });
});

describe('holidays', () => {
  const base = {
    days: [...WEEK_DAYS],
    startDate: new Date(2026, 0, 1), // Thursday
    rangeStart: { surahNumber: 1, ayah: 1 },
    rangeEnd: { surahNumber: 2, ayah: 286 },
  };

  // Entry dates are ISO strings of *local* midnight, so they must be read back
  // through local calendar fields — slicing the UTC string shifts a day for any
  // timezone ahead of UTC. This is the same shift the YYYY-MM-DD holiday keys avoid.
  const dates = (entries: { date: string }[]) =>
    entries.map((e) => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

  it('skips a holiday entirely — it consumes no occurrence and the day shifts forward', () => {
    const withoutHolidays = computeScheduleBreakdown({ ...base, endType: 'activeDays', activeDaysCount: 5 });
    const withHolidays = computeScheduleBreakdown({
      ...base, endType: 'activeDays', activeDaysCount: 5, holidays: ['2026-01-02', '2026-01-03'],
    });

    // Same number of occurrences, same content per occurrence — only the dates move.
    expect(withHolidays).toHaveLength(5);
    expect(dates(withoutHolidays)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05']);
    expect(dates(withHolidays)).toEqual(['2026-01-01', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07']);
    withHolidays.forEach((entry, i) => {
      expect(entry.surahStart).toBe(withoutHolidays[i].surahStart);
      expect(entry.ayahStart).toBe(withoutHolidays[i].ayahStart);
      expect(entry.surahEnd).toBe(withoutHolidays[i].surahEnd);
      expect(entry.ayahEnd).toBe(withoutHolidays[i].ayahEnd);
    });
  });

  it('drops occurrences from a date-ended plan, keeping the end date and packing the days denser', () => {
    const window = { ...base, endType: 'date' as const, endDate: new Date(2026, 0, 7) };

    expect(countOccurrences(window)).toBe(7);
    expect(countOccurrences({ ...window, holidays: ['2026-01-02', '2026-01-05'] })).toBe(5);

    const entries = computeScheduleBreakdown({ ...window, holidays: ['2026-01-02', '2026-01-05'] });
    expect(dates(entries)).toEqual(['2026-01-01', '2026-01-03', '2026-01-04', '2026-01-06', '2026-01-07']);
    // The full range still finishes exactly at rangeEnd, just across fewer, larger days.
    expect(entries[entries.length - 1].surahEnd).toBe(2);
    expect(entries[entries.length - 1].ayahEnd).toBe(286);
  });

  it('ignores a holiday that falls on a day the plan does not run anyway', () => {
    const plan = { ...base, days: ['السبت'], endType: 'activeDays' as const, activeDaysCount: 3 };
    expect(dates(computeScheduleBreakdown(plan)))
      .toEqual(dates(computeScheduleBreakdown({ ...plan, holidays: ['2026-01-01'] })));
  });
});
