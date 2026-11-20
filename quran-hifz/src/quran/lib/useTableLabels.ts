import { useEffect } from "react";

/**
 * Copies each `table.tbl` column header onto its body cells as `data-label`,
 * so the phone-width CSS can show every row as a card («العنوان: القيمة»)
 * without each page duplicating its markup. Mounted once in the app shell;
 * a MutationObserver keeps labels right as pages re-render or paginate.
 * Cells that already carry a data-label (set by the page) are left alone.
 */
export function useTableLabels(root: () => HTMLElement | null) {
  useEffect(() => {
    const el = root();
    if (!el || typeof MutationObserver === "undefined") return;
    let frame = 0;
    const label = () => {
      frame = 0;
      el.querySelectorAll<HTMLTableElement>("table.tbl").forEach((table) => {
        const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
        table.querySelectorAll("tbody tr").forEach((tr) => {
          let col = 0;
          Array.from(tr.children).forEach((cell) => {
            const td = cell as HTMLTableCellElement;
            if (!td.hasAttribute("data-label-auto") && td.hasAttribute("data-label")) {
              col += td.colSpan || 1;
              return;
            }
            const text = td.colSpan > 1 ? "" : heads[col] ?? "";
            if (td.getAttribute("data-label") !== text) {
              td.setAttribute("data-label", text);
              td.setAttribute("data-label-auto", "");
            }
            col += td.colSpan || 1;
          });
        });
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(label); };
    schedule();
    const obs = new MutationObserver(schedule);
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    return () => { obs.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [root]);
}
