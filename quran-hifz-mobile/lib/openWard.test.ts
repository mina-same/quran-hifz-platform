/// <reference types="jest" />
import { savedOpenWardTypes } from './openWard';

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
