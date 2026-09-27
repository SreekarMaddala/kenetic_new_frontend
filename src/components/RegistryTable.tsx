import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  MoreHorizontal,
  Copy,
  Inbox,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import "../styles/registry.css";

export interface RegistryColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  value?: (row: T) => string | number;
  numeric?: boolean;
}

export function RegistryTable<T>({
  title,
  description,
  rows,
  columns,
  rowKey,
  searchText,
  status,
  statuses,
  loading,
  error,
  onRetry,
}: {
  title: string;
  description: string;
  rows: T[];
  columns: RegistryColumn<T>[];
  rowKey: (row: T) => string;
  searchText: (row: T) => string;
  status: (row: T) => string;
  statuses: string[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState({
    key: columns.find((c) => c.value)?.key ?? "",
    descending: false,
  });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [compact, setCompact] = useState(false);
  const query = search.trim().toLowerCase();
  const matching = rows.filter(
    (row) =>
      (filter === "All" || status(row) === filter) && searchText(row).toLowerCase().includes(query),
  );
  const accessor = columns.find((c) => c.key === sort.key)?.value;
  const sorted = accessor
    ? [...matching].sort((a, b) => {
        const av = accessor(a),
          bv = accessor(b);
        const result =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), undefined, {
                numeric: true,
                sensitivity: "base",
              });
        return sort.descending ? -result : result;
      })
    : matching;
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(page, pages);
  const visible = sorted.slice((current - 1) * size, current * size);
  const reset = () => {
    setSearch("");
    setFilter("All");
    setPage(1);
  };
  return (
    <section
      className={`registry-panel ${compact ? "registry-compact" : ""}`}
      aria-label={title}
      aria-busy={loading}
    >
      <div className="registry-heading">
        <div>
          <h2>
            {title}
            <span className="registry-count">{rows.length}</span>
          </h2>
          <p>{description}</p>
        </div>
        <label className="registry-density">
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
          Compact rows
        </label>
      </div>
      <div className="registry-toolbar">
        <div className="registry-tabs" aria-label="Filter by status">
          {["All", ...statuses].map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {value}
              <span>
                {value === "All" ? rows.length : rows.filter((row) => status(row) === value).length}
              </span>
            </button>
          ))}
        </div>
        <div className="registry-search">
          <Search size={16} aria-hidden="true" />
          <input
            aria-label={`Search ${title.toLowerCase()}`}
            placeholder="Search name, ID or details..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {error ? (
        <div role="alert" className="registry-empty">
          <h3>Unable to load {title.toLowerCase()}</h3>
          <p>{error}</p>
          {onRetry && <button onClick={onRetry}>Try again</button>}
        </div>
      ) : (
        <>
          <div className="registry-scroll" tabIndex={0} role="region" aria-label={`${title} table`}>
            <table className="registry-table">
              <caption className="sr-only">{title}. Sort using column headings.</caption>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={column.numeric ? "registry-number" : ""}
                      aria-sort={
                        column.value
                          ? sort.key === column.key
                            ? sort.descending
                              ? "descending"
                              : "ascending"
                            : "none"
                          : undefined
                      }
                    >
                      {column.value ? (
                        <button
                          onClick={() => {
                            setSort({
                              key: column.key,
                              descending: sort.key === column.key ? !sort.descending : false,
                            });
                            setPage(1);
                          }}
                        >
                          {column.label}
                          {sort.key === column.key ? (
                            sort.descending ? (
                              <ArrowDown size={13} />
                            ) : (
                              <ArrowUp size={13} />
                            )
                          ) : (
                            <ArrowUpDown size={13} />
                          )}
                        </button>
                      ) : (
                        column.label || <span className="sr-only">Actions</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }, (_, i) => (
                      <tr key={i}>
                        {columns.map((column) => (
                          <td key={column.key}>
                            <div className="registry-skeleton" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : visible.map((row) => (
                      <tr key={rowKey(row)}>
                        {columns.map((column) => (
                          <td key={column.key} className={column.numeric ? "registry-number" : ""}>
                            {column.render(row)}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {!loading && !visible.length && (
            <div className="registry-empty">
              <Inbox size={28} strokeWidth={1.5} />
              <h3>{rows.length ? "No matching records" : `No ${title.toLowerCase()} yet`}</h3>
              <p>
                {rows.length
                  ? "Try another search or clear the status filter."
                  : "New records will appear here once they are created."}
              </p>
              {(search || filter !== "All") && <button onClick={reset}>Clear filters</button>}
            </div>
          )}
          <footer className="registry-pagination">
            <p role="status">
              {loading
                ? "Loading records..."
                : `${sorted.length ? (current - 1) * size + 1 : 0}-${Math.min(current * size, sorted.length)} of ${sorted.length} records`}
            </p>
            <div>
              <label>
                Rows per page
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <span>
                Page {current} of {pages}
              </span>
              <button
                aria-label="Previous page"
                disabled={current === 1 || loading}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                aria-label="Next page"
                disabled={current === pages || loading}
                onClick={() => setPage(current + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}

export function RecordIdentity({
  name,
  detail,
  icon,
}: {
  name: string;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="record-identity">
      <span className="record-avatar" aria-hidden="true">
        {icon ??
          name
            .trim()
            .split(/\s+/)
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
      </span>
      <div>
        <span className="record-name" title={name}>
          {name}
        </span>
        {detail && (
          <span className="record-detail" title={detail}>
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}
export function RecordStatus({ status }: { status: string }) {
  return (
    <span
      className={`record-status ${status === "Active" ? "is-active" : status === "Suspended" || status === "Disabled" ? "is-inactive" : ""}`}
    >
      <span aria-hidden="true" />
      {status || "Unknown"}
    </span>
  );
}
export function RecordActions({
  name,
  id,
  children,
}: {
  name: string;
  id: string;
  children?: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="record-actions" aria-label={`Actions for ${name}`}>
          <MoreHorizontal size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="registry-menu">
        <DropdownMenuItem
          onSelect={async () => {
            try {
              await navigator.clipboard.writeText(id);
              toast.success("ID copied");
            } catch {
              toast.error("Unable to copy ID. Please try again.");
            }
          }}
        >
          <Copy size={14} />
          Copy ID
        </DropdownMenuItem>
        {children && (
          <>
            <DropdownMenuSeparator />
            {children}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
