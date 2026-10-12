import type { DailyReport } from "../api/daily-reports";

/** Noon local time, so a YYYY-MM-DD key never slips a day across time zones. */
function atNoon(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

/** Today as YYYY-MM-DD in the user's local time. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftDay(date: string, days: number): string {
  const d = atNoon(date);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** «16/4/1448» — Umm al-Qura Hijri date, as written in the reports. */
export function hijriDate(date: string): string {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric" })
    .formatToParts(atNoon(date));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year").replace(/\D/g, "")}`;
}

/** «الأحد» */
export function weekdayAr(date: string): string {
  return new Intl.DateTimeFormat("ar-SA", { weekday: "long" }).format(atNoon(date));
}

/** «٥ أكتوبر ٢٠٢٦» — Gregorian, shown next to the Hijri date in the app. */
export function gregorianAr(date: string): string {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(atNoon(date));
}

export const REPORT_CLOSING = "وفقنا الله وإياكم لخيري الدنيا والآخرة.";

/** The WhatsApp-ready plain text of a report (same layout as the paper one). */
export function reportText(r: DailyReport): string {
  const lines: string[] = [];
  lines.push(`📖 التَّقْرِيرُ الْيَوْمِيُّ لِحَلْقَةِ ${r.trackTitle}${r.masjidName ? ` في ${r.masjidName}` : ""}.`);
  lines.push("");
  lines.push(`التاريخ: ${hijriDate(r.date)} اليوم: ${weekdayAr(r.date)}`);
  lines.push(`الحضور: ${r.presentCount} من ${r.totalCount}`);
  lines.push("");
  lines.push("البيان");
  const section = (title: string, rows: { name: string; area?: string; note?: string }[]) => {
    lines.push("");
    lines.push(title);
    if (!rows.length) lines.push("لا يوجد");
    for (const row of rows) lines.push([row.name, row.area, row.note].filter(Boolean).join(" — "));
  };
  section("⚠️ المتعثرون", r.struggling);
  section("❌ الغائبون", r.absent);
  section("🙋 المعتذرون", r.excused);
  if (r.notes) {
    lines.push("");
    lines.push(`📝 ملاحظات: ${r.notes}`);
  }
  lines.push("");
  lines.push("");
  lines.push(REPORT_CLOSING);
  return lines.join("\n");
}

/** All of one teacher's reports for a day as a single WhatsApp-ready text. */
export function combinedReportText(teacher: string, date: string, reports: DailyReport[], pending: string[] = []): string {
  const present = reports.reduce((n, r) => n + r.presentCount, 0);
  const total = reports.reduce((n, r) => n + r.totalCount, 0);
  const lines: string[] = [];
  lines.push(`📖 التَّقْرِيرُ الْيَوْمِيُّ الْمُجَمَّعُ لِحَلَقَاتِ الْمُعَلِّمِ ${teacher}.`);
  lines.push("");
  lines.push(`التاريخ: ${hijriDate(date)} اليوم: ${weekdayAr(date)}`);
  lines.push(`عدد الحلقات: ${reports.length} — الحضور: ${present} من ${total}`);
  if (pending.length) lines.push(`لم تُرسل بعد: ${pending.join("، ")}`);
  const section = (title: string, key: "struggling" | "absent" | "excused") => {
    lines.push("");
    lines.push(title);
    const withRows = reports.filter((r) => r[key].length);
    if (!withRows.length) lines.push("لا يوجد");
    for (const r of withRows) {
      lines.push(`— حلقة ${r.trackTitle}:`);
      for (const row of r[key]) lines.push([row.name, row.area, row.note].filter(Boolean).join(" — "));
    }
  };
  section("⚠️ المتعثرون", "struggling");
  section("❌ الغائبون", "absent");
  section("🙋 المعتذرون", "excused");
  const notes = reports.filter((r) => r.notes);
  if (notes.length) {
    lines.push("");
    lines.push("📝 ملاحظات:");
    for (const r of notes) lines.push(`${r.trackTitle}: ${r.notes}`);
  }
  lines.push("");
  lines.push("");
  lines.push(REPORT_CLOSING);
  return lines.join("\n");
}

/**
 * Downloads `el` as an A4 PDF. Rendered via html-to-image (SVG foreignObject),
 * so the Arabic shaping, RTL layout and webfonts are exactly what's on screen
 * — and it copes with Tailwind v4's oklch colours, unlike html2canvas.
 */
export async function downloadReportPdf(el: HTMLElement, fileName: string): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    // Buttons (copy / WhatsApp / PDF) don't belong in the document.
    filter: (node) => !(node instanceof HTMLElement && node.dataset.pdfExclude === "true"),
  });
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const w = pageW - margin * 2;
  const h = (img.height * w) / img.width;

  // Tall reports flow onto further pages by shifting the same image up.
  let y = margin;
  let remaining = h;
  pdf.addImage(dataUrl, "PNG", margin, y, w, h);
  remaining -= pageH - margin * 2;
  while (remaining > 0) {
    pdf.addPage();
    y -= pageH - margin * 2;
    pdf.addImage(dataUrl, "PNG", margin, y, w, h);
    remaining -= pageH - margin * 2;
  }
  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}
