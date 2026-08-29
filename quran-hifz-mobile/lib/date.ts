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
