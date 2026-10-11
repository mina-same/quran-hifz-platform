import { toAr } from "../../../lib/format";

/** Page numbers to show: always first/last, a window around the current page,
 *  and `null` for the gaps («…»). */
function pageItems(page: number, pages: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out[out.length - 1] !== null) out.push(null);
  }
  return out;
}

/** Numbered pager — renders nothing when everything fits on one page. */
export function Pagination({ page, pageSize, total, onChange }: {
  page: number; pageSize: number; total: number; onChange: (page: number) => void;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className="pager" aria-label="التنقل بين الصفحات">
      <span className="pager-info">{toAr(from)}–{toAr(to)} من {toAr(total)}</span>
      <div className="pager-btns">
        <button type="button" className="topbar-btn btn-ghost" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="الصفحة السابقة">
          <i className="ti ti-chevron-right" />
        </button>
        {pageItems(page, pages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="pager-gap">…</span>
          ) : (
            <button
              type="button"
              key={p}
              className={`topbar-btn ${p === page ? "btn-primary" : "btn-ghost"}`}
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {toAr(p)}
            </button>
          ),
        )}
        <button type="button" className="topbar-btn btn-ghost" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="الصفحة التالية">
          <i className="ti ti-chevron-left" />
        </button>
      </div>
    </nav>
  );
}
