import { hasArabic } from "../../lib/latin";

/** Live warning under an email/slug/password field when Arabic is typed.
 *  Matters most for passwords, where the dots hide the keyboard language. */
export function LatinHint({ value }: { value: string | undefined }) {
  if (!hasArabic(value)) return null;
  return (
    <span className="latin-hint" role="alert">
      <i className="ti ti-keyboard" /> يبدو أن لوحة المفاتيح عربية — اكتب بالأحرف الإنجليزية (A-Z)
    </span>
  );
}
