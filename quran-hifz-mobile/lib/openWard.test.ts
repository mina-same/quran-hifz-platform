/// <reference types="jest" />
import { savedOpenWardTypes, inferWardDirection, rangeDirection } from './openWard';
import { nextWardStart } from './quranRange';

describe('savedOpenWardTypes', () => {
  const e = (student: string | { _id: string; name: string }, type: 'حفظ' | 'مراجعة', date: string) =>
    ({ student, type, date });

  it('returns every type already saved for that student on that day', () => {
    const entries = [
      e('s1', 'حفظ', '2026-09-26'),
      e({ _id: 's1', name: 'x' }, 'مراجعة', '2026-09-26'),
      e('s1', 'حفظ', '2026-09-25'),
      e('s2', 'حفظ', '2026-09-26'),
    ];
    expect(savedOpenWardTypes(entries, 's1', '2026-09-26')).toEqual(['حفظ', 'مراجعة']);
  });

  it('is empty when nothing was saved — an absent save then deletes nothing', () => {
    expect(savedOpenWardTypes([e('s2', 'حفظ', '2026-09-26')], 's1', '2026-09-26')).toEqual([]);
  });
});

import { openPlanIdsForReport } from './openWard';

describe('openPlanIdsForReport', () => {
  it('includes open plans reached via the track, not just the student filter, deduped', () => {
    const byStudent = [{ _id: 'a', openWard: true }, { _id: 'f', openWard: false }];
    const byTrack = [{ _id: 'a', openWard: true }, { _id: 'b', openWard: true }, { _id: 'g', openWard: false }];
    expect(openPlanIdsForReport(byStudent, byTrack)).toEqual(['a', 'b']);
  });
});

describe('ward direction', () => {
  const rec = (fs: number, fa: number, ts: number, ta: number, direction?: 'forward' | 'reverse') =>
    ({ status: 'recorded', from: { surahNumber: fs, ayah: fa }, to: { surahNumber: ts, ayah: ta }, direction });

  it('reads a direction only from a range spanning surahs', () => {
    expect(rangeDirection({ surahNumber: 114, ayah: 1 }, { surahNumber: 112, ayah: 4 })).toBe('reverse');
    expect(rangeDirection({ surahNumber: 2, ayah: 1 }, { surahNumber: 3, ayah: 4 })).toBe('forward');
    expect(rangeDirection({ surahNumber: 67, ayah: 1 }, { surahNumber: 67, ayah: 15 })).toBeUndefined();
  });

  it('keeps a reverse student reverse across single-surah days', () => {
    // newest first: الملك 16-30, الملك 1-15, القلم 1-52 (finished القلم, moved back to الملك)
    const history = [rec(67, 16, 67, 30), rec(67, 1, 67, 15), rec(68, 1, 68, 52)];
    expect(inferWardDirection(history)).toBe('reverse');
    expect(nextWardStart(history[0].from, history[0].to, true)).toEqual({ surahNumber: 66, ayah: 1 });
  });

  it('detects a forward move between days', () => {
    expect(inferWardDirection([rec(3, 1, 3, 20), rec(2, 270, 2, 286)])).toBe('forward');
  });

  it('prefers a direction saved with the newest record', () => {
    expect(inferWardDirection([rec(67, 16, 67, 30, 'reverse'), rec(66, 1, 66, 12)])).toBe('reverse');
  });

  it('is unknown while every day stayed inside one surah', () => {
    expect(inferWardDirection([rec(67, 16, 67, 30), rec(67, 1, 67, 15)])).toBeUndefined();
    expect(inferWardDirection([{ status: 'none' }])).toBeUndefined();
  });

  it('finishing a surah moves on in the given direction', () => {
    const from = { surahNumber: 67, ayah: 16 };
    const to = { surahNumber: 67, ayah: 30 };
    expect(nextWardStart(from, to)).toEqual({ surahNumber: 68, ayah: 1 });
    expect(nextWardStart(from, to, true)).toEqual({ surahNumber: 66, ayah: 1 });
    expect(nextWardStart(from, { surahNumber: 67, ayah: 20 }, true)).toEqual({ surahNumber: 67, ayah: 21 });
  });
});
