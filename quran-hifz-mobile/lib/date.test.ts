import { expandDateRange, addDays, todayIso, toDateOnly } from './date';

describe('expandDateRange', () => {
  it('returns a single day when no end is given', () => {
    expect(expandDateRange('2026-08-30')).toEqual(['2026-08-30']);
    expect(expandDateRange('2026-08-30', '')).toEqual(['2026-08-30']);
  });

  it('returns a single day when both ends are the same', () => {
    expect(expandDateRange('2026-08-30', '2026-08-30')).toEqual(['2026-08-30']);
  });

  it('is inclusive of both ends', () => {
    expect(expandDateRange('2026-08-30', '2026-09-02')).toEqual([
      '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02',
    ]);
  });

  it('tolerates a reversed range (end picked before start)', () => {
    expect(expandDateRange('2026-09-02', '2026-08-30')).toEqual([
      '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02',
    ]);
  });

  it('crosses a leap day', () => {
    expect(expandDateRange('2028-02-28', '2028-03-01')).toEqual([
      '2028-02-28', '2028-02-29', '2028-03-01',
    ]);
  });

  it('returns nothing for an empty start', () => {
    expect(expandDateRange('', '2026-09-02')).toEqual([]);
  });

  it('caps a runaway span at 366 days', () => {
    expect(expandDateRange('2026-01-01', '2099-01-01')).toHaveLength(366);
  });
});

describe('addDays', () => {
  it('rolls over month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  // Building the date at local midnight and reading it back via toISOString()
  // is not a round trip in any UTC+ zone — that froze the day slider on one
  // repeated date. Pure UTC arithmetic is what keeps this stable.
  it('is stable regardless of the machine timezone', () => {
    expect(addDays('2026-03-01', 0)).toBe('2026-03-01');
    expect(addDays('2026-08-30', 7)).toBe('2026-09-06');
  });
});

describe('toDateOnly', () => {
  it('trims a full ISO timestamp to a bare calendar day', () => {
    expect(toDateOnly('2026-08-30T21:00:00.000Z')).toBe('2026-08-30');
    expect(toDateOnly('2026-08-30')).toBe('2026-08-30');
  });
});

describe('todayIso', () => {
  it('reads the LOCAL calendar day, not the UTC one', () => {
    // 00:30 local on the 30th is still the 29th in UTC anywhere east of
    // Greenwich — toISOString() would report the wrong day here.
    const local = new Date(2026, 7, 30, 0, 30);
    expect(todayIso(local)).toBe('2026-08-30');
  });
});
