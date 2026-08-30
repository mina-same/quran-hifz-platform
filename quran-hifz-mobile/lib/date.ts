/**
 * Every date in the app is a **Gregorian** (ميلادي) date.
 *
 * `ar-SA` cannot be used for that: per CLDR its default calendar is
 * `islamic-umalqura`, so `toLocaleDateString('ar-SA')` silently renders Hijri —
 * which is how "٢٥ رمضان ١٤٤٧" ended up all over the app for what is stored as
 * an ISO Gregorian date. `ar-EG` is Arabic with the Gregorian calendar and
 * Arabic-Indic digits, which is what the UI wants.
 *
 * Always format through this constant (or the helpers below); never hardcode a
 * locale string at the call site.
 */
export const AR_LOCALE = 'ar-EG';

/** "٢٩/٨/٢٠٢٦" — the default numeric form used in tables and list rows. */
export function fmtDate(value: string | number | Date | null | undefined, fallback = '—') {
  const d = toDate(value);
  return d ? d.toLocaleDateString(AR_LOCALE) : fallback;
}

/** "٢٩ أغسطس ٢٠٢٦" — for headings and summaries. */
export function fmtDateLong(value: string | number | Date | null | undefined, fallback = '—') {
  const d = toDate(value);
  return d
    ? d.toLocaleDateString(AR_LOCALE, { year: 'numeric', month: 'long', day: 'numeric' })
    : fallback;
}

/** "٢٩ أغسطس ٢٠٢٦" with an abbreviated month — for compact cards. */
export function fmtDateShort(value: string | number | Date | null | undefined, fallback = '—') {
  const d = toDate(value);
  return d
    ? d.toLocaleDateString(AR_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' })
    : fallback;
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  // A bare "YYYY-MM-DD" parses as UTC midnight, which renders as the previous
  // day anywhere west of Greenwich — pin it to local midnight instead.
  const d =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ─── day-slider helpers ──────────────────────────────────────────────────
 * Shared by every screen that scrolls a plan's scheduled days (teacher
 * attendance, track detail). These deliberately work on bare `YYYY-MM-DD`
 * strings rather than `Date` objects: the slider compares and sorts dates as
 * Set keys, and string comparison is the only representation where that is
 * both cheap and timezone-proof.
 */

/** Today as a **local** calendar date. `toISOString()` cannot be used here —
 * it lags a day behind local wall-clock time for the first `offset` hours of
 * each day in any UTC+ timezone. */
export function todayIso(ref: Date = new Date()): string {
  const m = String(ref.getMonth() + 1).padStart(2, '0');
  const d = String(ref.getDate()).padStart(2, '0');
  return `${ref.getFullYear()}-${m}-${d}`;
}

/** The server stores schedule dates as full ISO timestamps; normalise to a
 * bare YYYY-MM-DD so date maths and Set keys stay consistent. */
export function toDateOnly(s: string): string {
  return String(s).slice(0, 10);
}

/** Pure UTC arithmetic — building the date at local midnight and reading it
 * back via toISOString() is not a round trip in any UTC+ timezone, which froze
 * the whole slider on one repeated date on the web. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split('T')[0];
}

// Indexed by Date.getDay(): 0 = الأحد … 6 = السبت.
const ARABIC_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export function weekdayOf(iso: string): string {
  return ARABIC_WEEKDAYS[new Date(iso + 'T00:00:00').getDay()];
}

/** "الأحد ٢٩ أغسطس" — the long label used in day-slider notices. */
export function fmtDayLabel(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(AR_LOCALE, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export type DayChip = { iso: string; weekday: string; dayNum: number; isToday: boolean };

/** Every calendar day from `minIso` to `maxIso` inclusive — including days the
 * plan does not cover, so the slider reads as a continuous calendar rather
 * than a jumpy list of scheduled dates. Capped at 3 years as a runaway guard. */
export function buildDayChips(minIso: string, maxIso: string, today: string): DayChip[] {
  const out: DayChip[] = [];
  let cur = minIso;
  let guard = 0;
  while (cur <= maxIso && guard < 1095) {
    out.push({
      iso: cur,
      weekday: weekdayOf(cur),
      dayNum: new Date(cur + 'T00:00:00').getDate(),
      isToday: cur === today,
    });
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

/** Every calendar day from `from` to `to` inclusive, as bare YYYY-MM-DD.
 *
 * Used to turn a holiday *range* (Eid week, exams, travel) into the flat list
 * of dates the plan scheduler actually consumes — `holidays` is stored as one
 * date per day, so a range is purely an input convenience and needs no schema
 * change. Reversed input is tolerated (the caller may pick "to" first), and
 * the span is capped at one year as a runaway guard. */
export function expandDateRange(from: string, to?: string): string[] {
  if (!from) return [];
  if (!to || to === from) return [from];
  const [lo, hi] = from <= to ? [from, to] : [to, from];
  const out: string[] = [];
  let cur = lo;
  let guard = 0;
  while (cur <= hi && guard < 366) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}
