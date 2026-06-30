const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toAr(n: number | string): string {
  return String(n).replace(/\d/g, (d) => AR_DIGITS[parseInt(d)]);
}

export function pct(n: number): string {
  return `${toAr(Math.round(n))}٪`;
}
