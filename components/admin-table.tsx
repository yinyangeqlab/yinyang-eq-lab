"use client";

import { useDeferredValue, useId, useMemo, useState, type ReactNode } from "react";

type CellValue = string | number | null | undefined;
export type AdminColumn<T> = {
  key: string;
  label: string;
  value?: (row: T) => CellValue;
  search?: (row: T) => CellValue;
  render?: (row: T) => ReactNode;
  date?: boolean;
  className?: string;
};

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const normalize = (value: CellValue) => String(value ?? "").normalize("NFKC").toLowerCase();
const matches = (value: string, query: string) => query.trim().split(/\s+/).every(word => value.includes(word));
const dateText = (value: number) => new Date(value).toLocaleString();
const pageSize = 25;

export function adminDate<T>(label: string, value: (row: T) => number | null | undefined): AdminColumn<T> {
  return { key: "date", label, value, date: true };
}

export function AdminTable<T>({
  label, rows, columns, rowKey, initialSort, empty = "No records.",
}: {
  label: string;
  rows: readonly T[];
  columns: readonly AdminColumn<T>[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; descending?: boolean };
  empty?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(initialSort ?? { key: "index", descending: false });
  const [page, setPage] = useState(0);
  const search = useDeferredValue(normalize(query));
  const keywords = useDeferredValue(filters);
  const hasFilters = Boolean(query.trim()) || Object.values(filters).some(value => value.trim());

  const matching = useMemo(() => {
    const searchable = [{ key: "index", label: "Row", value: undefined }, ...columns];
    const column = searchable.find(col => col.key === sort.key);
    const entries = rows.map((row, index) => ({ row, number: index + 1 }));
    const active = searchable.filter(col => keywords[col.key]?.trim());
    function content(entry: typeof entries[number], col: AdminColumn<T>) {
      if (col.key === "index") return String(entry.number);
      const value = col.value?.(entry.row);
      const date = col.date && typeof value === "number" && Number.isFinite(new Date(value).getTime()) ? `${dateText(value)} ${new Date(value).toISOString()}` : "";
      return normalize([value, col.search?.(entry.row), date].filter(part => part != null).join(" "));
    }
    return entries.filter(entry =>
      (!search || matches(searchable.filter(col => col.value || col.key === "index").map(col => content(entry, col)).join(" "), search)) &&
      active.every(col => matches(content(entry, col), normalize(keywords[col.key])))
    ).sort((a, b) => {
      const av = sort.key === "index" ? a.number : column?.value?.(a.row);
      const bv = sort.key === "index" ? b.number : column?.value?.(b.row);
      if (av == null || bv == null) return av == null && bv == null ? a.number - b.number : av == null ? 1 : -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : collator.compare(String(av), String(bv));
      return (sort.descending ? -cmp : cmp) || a.number - b.number;
    });
  }, [columns, keywords, rows, search, sort]);

  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  const visible = matching.slice(start, start + pageSize);
  const headerColumns = [{ key: "index", label: "#", value: () => 0, date: false, className: "admin-index" }, ...columns];

  return <div className="admin-grid">
    <div className="admin-grid-tools">
      <label>Search table<input type="search" aria-label={`Search ${label}`} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Type keywords…" /></label>
      <button type="button" disabled={!hasFilters} onClick={() => { setQuery(""); setFilters({}); setPage(0); }}>Clear filters</button>
      <p id={id} role="status">{matching.length.toLocaleString()} of {rows.length.toLocaleString()} rows{matching.length > pageSize ? ` · ${start + 1}–${start + visible.length}` : ""}</p>
    </div>
    <div className="owner-table-wrap admin-grid-scroll" tabIndex={0} role="region" aria-label={label} aria-describedby={id}>
      <table aria-label={label}>
        <thead>
          <tr>{headerColumns.map(col => <th scope="col" key={col.key} className={col.className} aria-sort={col.value && sort.key === col.key ? sort.descending ? "descending" : "ascending" : undefined}>
            {col.value ? <button type="button" className="admin-grid-sort" aria-label={`Sort by ${col.key === "index" ? "row number" : col.label}`} onClick={() => { setSort({ key: col.key, descending: sort.key === col.key ? !sort.descending : Boolean(col.date) }); setPage(0); }}>{col.label}<span aria-hidden="true">{sort.key === col.key ? sort.descending ? "▼" : "▲" : "↕"}</span></button> : col.label}
            {col.value && <input type="search" className={col.date ? "admin-column-filter admin-date-filter" : "admin-column-filter"} aria-label={`Filter ${col.key === "index" ? "row number" : col.label}`} placeholder={col.key === "index" ? "#" : col.date ? "YYYY-MM-DD" : "Filter…"} value={filters[col.key] ?? ""} onChange={event => { const value = event.target.value; setFilters(previous => ({ ...previous, [col.key]: value })); setPage(0); }} />}
          </th>)}</tr>
        </thead>
        <tbody>
          {visible.map(({ row, number }) => <tr key={rowKey(row)}>
            <td className="admin-index">{number}</td>
            {columns.map(col => {
              const value = col.value?.(row);
              return <td key={col.key} className={col.className}>{col.render ? col.render(row) : col.date && typeof value === "number" && Number.isFinite(new Date(value).getTime()) ? <time dateTime={new Date(value).toISOString()} title={new Date(value).toISOString()}>{dateText(value)}</time> : value ?? "—"}</td>;
            })}
          </tr>)}
          {!visible.length && <tr><td colSpan={headerColumns.length}>{hasFilters ? "No rows match these filters." : empty}</td></tr>}
        </tbody>
      </table>
    </div>
    {pageCount > 1 && <div className="admin-grid-pages" aria-label={`${label} pages`}>
      <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
      <span>Page {currentPage + 1} of {pageCount}</span>
      <button type="button" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</button>
    </div>}
  </div>;
}

export type SubmissionIdentity = {
  listenerNickname?: string | null;
  accountId?: string | null;
  browserId?: string | null;
  linkedDeviceId?: string | null;
};

export function identityColumns<T extends SubmissionIdentity>(displayName?: (row: T) => string | null | undefined): AdminColumn<T>[] {
  const username = (row: T) => row.listenerNickname || displayName?.(row) || (row.accountId ? "No nickname" : "No account link");
  return [
    { key: "username", label: "Username", value: username, search: row => row.accountId,
      render: row => <>{username(row)}{row.accountId && <small className="admin-id"><code>{row.accountId}</code></small>}</> },
    { key: "browser", label: "Browser ID", value: row => row.browserId || row.linkedDeviceId || "Not recorded",
      search: row => row.browserId ? "" : row.linkedDeviceId ? "linked device" : "not recorded",
      render: row => row.browserId ? <code className="admin-id">{row.browserId}</code> : row.linkedDeviceId ? <><code className="admin-id">{row.linkedDeviceId}</code><small>Linked account device</small></> : "Not recorded" },
  ];
}
