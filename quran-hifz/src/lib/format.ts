const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toAr(n: number | string): string {
  return String(n).replace(/\d/g, (d) => AR_DIGITS[parseInt(d)]);
}

export function pct(n: number): string {
  return `${toAr(Math.round(n))}٪`;
}

/**
 * Every date in the app is a **Gregorian** (ميلادي) date.
 *
 * `ar-SA` cannot be used for that: per CLDR its default calendar is
 * `islamic-umalqura`, so `toLocaleDateString("ar-SA")` silently renders Hijri —
 * which is how Hijri dates ended up all over the UI for what is stored as an ISO
 * Gregorian date. `ar-EG` is Arabic with the Gregorian calendar.
 *
 * Always format through this constant; never hardcode a locale at the call site.
 */
export const AR_LOCALE = "ar-EG";
