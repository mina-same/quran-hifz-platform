import { useEffect, useMemo, useState } from "react";

export type SortDir = "asc" | "desc";
type SortValue = string | number | null | undefined;

/**
 * One hook for every list table: text search, filters, column sort and
 * pagination, applied in that order. Pages render `pageRows` and pass
 * `total`/`page`/`pageSize` to <Pagination/>.
 *
 *   const t = useTableControls(students, {
 *     search: (s) => [s.name, s.email],
 *     sorters: { name: (s) => s.name, pct: (s) => s.attendancePct },
 *     filters: { track: (s, v) => s.trackId === v },
 *   });
 */
export function useTableControls<T>(
  rows: T[],
  opts: {
    /** Strings searched (case-insensitive, Arabic-aware substring match). */
    search?: (row: T) => (string | number | null | undefined)[];
    /** Column key → value to sort by. */
    sorters?: Record<string, (row: T) => SortValue>;
    /** Filter key → predicate; a filter applies only when its value is non-empty. */
    filters?: Record<string, (row: T, value: string) => boolean>;
    pageSize?: number;
    initialSort?: { key: string; dir: SortDir };
  } = {},
) {
  const { search, sorters, filters, pageSize = 15, initialSort } = opts;
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return rows.filter((r) => {
      if (q && search && !search(r).some((v) => v != null && normalize(String(v)).includes(q))) return false;
      if (filters) {
        for (const [key, pred] of Object.entries(filters)) {
          const v = filterValues[key];
          if (v && !pred(r, v)) return false;
        }
      }
      return true;
    });
    // search/filters are inline lambdas in callers; rows/query/filterValues drive recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, filterValues]);

  const sorted = useMemo(() => {
    const get = sort && sorters?.[sort.key];
    if (!get) return filtered;
    const dir = sort!.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compare(get(a), get(b)) * dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Back to page 1 whenever the result set changes shape.
  useEffect(() => { setPage(1); }, [query, filterValues, sort]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);

  const pageRows = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize],
  );

  return {
    query, setQuery,
    filterValues,
    setFilter: (key: string, value: string) => setFilterValues((f) => ({ ...f, [key]: value })),
    clearAll: () => { setQuery(""); setFilterValues({}); },
    active: !!query.trim() || Object.values(filterValues).some(Boolean),
    sort,
    setSort,
    toggleSort: (key: string) =>
      setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null)),
    page, setPage, pageSize,
    total: sorted.length,
    all: rows.length,
    rows: sorted,
    pageRows,
  };
}

export type TableControls = ReturnType<typeof useTableControls>;

/** Lower-case and fold Arabic letter variants so «احمد» finds «أحمد». */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "") // harakat + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function compare(a: SortValue, b: SortValue): number {
  const aNil = a == null || a === "";
  const bNil = b == null || b === "";
  if (aNil || bNil) return aNil === bNil ? 0 : aNil ? 1 : -1; // empty values last
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "ar", { numeric: true });
}
