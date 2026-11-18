import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Phone equivalent of the web's PDF download: render an RTL HTML document to a
 * PDF in the app cache, then hand it to the OS share sheet (Files, WhatsApp,
 * Mail, Print…). `body` is the inner HTML; callers own their page markup/CSS.
 */
export async function sharePdf(title: string, body: string, css = '') {
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: -apple-system, 'Segoe UI', Tahoma, sans-serif; color: #111; direction: rtl; }
  ${css}
</style></head><body>${body}</body></html>`;
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 }); // A4 in points
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}

/** Escape user text before interpolating it into PDF HTML. */
export function esc(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
