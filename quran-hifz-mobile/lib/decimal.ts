/** Normalizes what a teacher types into a score/degree field: Arabic-Indic
 * digits → Western, the Arabic decimal comma «٫» (or ",") → ".", anything else
 * dropped, at most one dot and two decimals. Returns the cleaned text (kept as
 * typed so "2." survives) and its number (0 while empty). */
export function parseDecimalText(raw: string): { text: string; value: number } {
  let text = raw
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٫,]/g, '.')
    .replace(/[^0-9.]/g, '');
  const dot = text.indexOf('.');
  if (dot !== -1) text = text.slice(0, dot + 1) + text.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  const value = Number(text);
  return { text, value: Number.isFinite(value) ? value : 0 };
}
