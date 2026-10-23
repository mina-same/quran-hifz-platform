/**
 * Saves already-laid-out A4 "pages" (elements sized 794×1123 CSS px) as one
 * PDF, one image per page — so nothing gets sliced through the middle the way
 * a single tall screenshot would. Same html-to-image route as the daily
 * report (handles Tailwind v4 oklch colours and the Arabic webfonts).
 */
export async function downloadPagesPdf(
  pages: HTMLElement[],
  fileName: string,
  onProgress?: (done: number) => void,
): Promise<void> {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  for (let i = 0; i < pages.length; i++) {
    // JPEG keeps a 3-page report around 1–2 MB (PNG of the gradients was 20 MB+).
    const dataUrl = await toJpeg(pages[i], {
      pixelRatio: 2,
      quality: 0.9,
      backgroundColor: "#ffffff",
      cacheBust: true,
      // On-screen previews are shrunk with a transform — capture at full size.
      style: { transform: "none", margin: "0" },
    });
    if (i > 0) pdf.addPage();
    pdf.addImage(dataUrl, "JPEG", 0, 0, w, h);
    onProgress?.(i + 1);
  }
  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}
