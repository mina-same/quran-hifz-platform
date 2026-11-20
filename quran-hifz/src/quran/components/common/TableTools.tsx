import type { ReactNode, ThHTMLAttributes } from "react";
import { toAr } from "../../../lib/format";
import type { TableControls } from "../../lib/useTableControls";

/** Clickable column header: asc → desc → off, with an arrow for the active one. */
export function SortTh({ t, k, children, ...rest }: {
  t: Pick<TableControls, "sort" | "toggleSort">;
  k: string;
  children: ReactNode;
} & ThHTMLAttributes<HTMLTableCellElement>) {
  const active = t.sort?.key === k;
  const icon = !active ? "ti-arrows-sort" : t.sort!.dir === "asc" ? "ti-sort-ascending" : "ti-sort-descending";
  return (
    <th
      {...rest}
      className={`th-sort${active ? " is-active" : ""}${rest.className ? ` ${rest.className}` : ""}`}
      aria-sort={!active ? "none" : t.sort!.dir === "asc" ? "ascending" : "descending"}
    >
      <button type="button" className="th-sort-btn" onClick={() => t.toggleSort(k)}>
        {children}
        <i className={`ti ${icon}`} aria-hidden />
      </button>
    </th>
  );
}

/** Search box + optional filter controls + «N من M» count + clear button. */
export function TableToolbar({ t, placeholder, noun, sortOptions, children }: {
  t: Pick<TableControls, "query" | "setQuery" | "total" | "all" | "active" | "clearAll" | "sort" | "setSort">;
  placeholder: string;
  /** Count label, e.g. "طالب" → «١٢ من ٤٠ طالب». */
  noun?: string;
  /** Sortable columns, for the «ترتيب» dropdown shown only on phones
   *  (where table headers are hidden). Same keys as the SortTh `k`s. */
  sortOptions?: { key: string; label: string }[];
  /** Filter controls (use <TableFilter/>). */
  children?: ReactNode;
}) {
  const sortValue = t.sort ? `${t.sort.key}:${t.sort.dir}` : "";
  return (
    <div className="tbl-toolbar">
      <div className="tbl-search">
        <i className="ti ti-search" aria-hidden />
        <input
          className="form-input"
          type="search"
          placeholder={placeholder}
          value={t.query}
          onChange={(e) => t.setQuery(e.target.value)}
          aria-label={placeholder}
        />
      </div>
      {children}
      {sortOptions && sortOptions.length > 0 && (
        <label className="tbl-sort-mobile">
          <select
            className="form-input tbl-filter"
            value={sortValue}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":");
              t.setSort(key ? { key, dir: dir as "asc" | "desc" } : null);
            }}
            aria-label="ترتيب"
          >
            <option value="">ترتيب حسب…</option>
            {sortOptions.flatMap((o) => [
              <option key={`${o.key}:asc`} value={`${o.key}:asc`}>{o.label} ↑</option>,
              <option key={`${o.key}:desc`} value={`${o.key}:desc`}>{o.label} ↓</option>,
            ])}
          </select>
        </label>
      )}
      <span className="tbl-count">
        {toAr(t.total)} من {toAr(t.all)}{noun ? ` ${noun}` : ""}
      </span>
      {t.active && (
        <button type="button" className="topbar-btn btn-ghost tbl-clear" onClick={t.clearAll}>
          <i className="ti ti-x" /> مسح
        </button>
      )}
    </div>
  );
}

/** A filter dropdown bound to one filter key of useTableControls. */
export function TableFilter({ t, k, label, options }: {
  t: Pick<TableControls, "filterValues" | "setFilter">;
  k: string;
  /** First option, e.g. «كل المساجد». */
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      className="form-input tbl-filter"
      value={t.filterValues[k] ?? ""}
      onChange={(e) => t.setFilter(k, e.target.value)}
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
