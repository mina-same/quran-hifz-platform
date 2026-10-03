/** Arabic letters/digits/presentation forms — anything that can't be in an
 *  email, slug or password. Catches a keyboard left on the Arabic layout. */
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function hasArabic(value: string | undefined | null): boolean {
  return !!value && ARABIC_RE.test(value);
}

export const LATIN_ONLY_MESSAGE = "يُكتب هذا الحقل بالأحرف الإنجليزية فقط — غيّر لغة لوحة المفاتيح";
