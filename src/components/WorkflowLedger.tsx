import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  RotateCw,
  Download,
  Plus,
  Search,
  Inbox,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Building2,
  Calendar,
} from "lucide-react";
import { PageHeader } from "./AppShell";
import { api, type DomainRecord } from "../lib/api";
import { exportToExcel } from "../lib/excel";

export type Field = {
  key: string;
  label: string;
  type?: "number" | "date" | "month" | "textarea" | "file";
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  defaultValue?: string;
};

export type LedgerAction = {
  label: string;
  visible?: (row: DomainRecord) => boolean;
  run: (row: DomainRecord) => Promise<unknown>;
};

type Props = {
  title: string;
  description?: string;
  endpoint: string;
  idKey: string;
  fields?: Field[];
  columns: { key: string; label: string }[];
  createLabel?: string;
  defaults?: DomainRecord;
  actions?: LedgerAction[];
  transform?: (rows: DomainRecord[]) => DomainRecord[];
  onCreate?: (body: DomainRecord) => Promise<unknown>;
  upload?: boolean;
};

export function readLedgerForm(
  fields: Field[],
  form: FormData,
  defaults: DomainRecord = {},
): DomainRecord {
  const body = { ...defaults };
  for (const field of fields) {
    if (field.type === "file") continue;
    const value = String(form.get(field.key) ?? "").trim();
    if (field.required && !value) throw new Error(`${field.label} is required.`);
    if (field.type === "number" && value) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < (field.min ?? 0))
        throw new Error(`Enter a valid ${field.label.toLowerCase()}.`);
      body[field.key] = n;
    } else if (value) body[field.key] = value;
  }
  return body;
}

export function recordUrl(endpoint: string, id: unknown) {
  const [path, query] = endpoint.split("?");
  return `${path}/${encodeURIComponent(String(id))}${query ? `?${query}` : ""}`;
}

export function reviewActions(endpoint: string, idKey: string, lowercase = false): LedgerAction[] {
  return ["Approved", "Rejected"].map((status) => ({
    label: status === "Approved" ? "Approve" : "Reject",
    visible: (r) => String(r.status ?? "Pending").toLowerCase() === "pending",
    run: (r) =>
      api.patch(recordUrl(endpoint, r[idKey]), {
        status: lowercase ? status.toLowerCase() : status,
      }),
  }));
}

export function WorkflowLedger({
  title,
  description,
  endpoint,
  idKey,
  fields,
  columns,
  createLabel = "Add record",
  defaults,
  actions = [],
  transform,
  onCreate,
  upload,
}: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");

  useEffect(() => {
    setOpen(false);
    setSearch("");
    setProjectFilter("ALL");
    setMonthFilter("ALL");
  }, [endpoint]);

  const query = useQuery({
    queryKey: ["ledger", endpoint],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });

  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: () => {
      qc.invalidateQueries();
      setOpen(false);
      toast.success("Saved successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = transform ? transform(query.data ?? []) : (query.data ?? []);

  // Compute available unique projects from records
  const availableProjects = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const pid = String(r.projectId ?? "");
      const pname = String(r.projectName ?? r.project ?? pid);
      if (pid && pname && pname !== "undefined" && pname !== "—") map.set(pid, pname);
      else if (pname && pname !== "undefined" && pname !== "—") map.set(pname, pname);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  // Compute available unique months (YYYY-MM) from records
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    rows.forEach((r) => {
      const d = String(r.date ?? r.paidAt ?? r.createdAt ?? "");
      if (d && /^\d{4}-\d{2}/.test(d)) {
        monthsSet.add(d.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [rows]);

  const projectFiltered = useMemo(() => {
    if (projectFilter === "ALL") return rows;
    return rows.filter(
      (r) =>
        String(r.projectId ?? "") === projectFilter ||
        String(r.projectName ?? "") === projectFilter ||
        String(r.project ?? "") === projectFilter,
    );
  }, [rows, projectFilter]);

  const monthFiltered = useMemo(() => {
    if (monthFilter === "ALL") return projectFiltered;
    return projectFiltered.filter((r) => {
      const d = String(r.date ?? r.paidAt ?? r.createdAt ?? "");
      return d.startsWith(monthFilter);
    });
  }, [projectFiltered, monthFilter]);

  const filtered = useMemo(() => {
    return monthFiltered.filter((row) =>
      columns.some((c) =>
        String(row[c.key] ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    );
  }, [monthFiltered, columns, search]);

  // Computed summary stats
  const totalAmount = useMemo(() => {
    return filtered.reduce((sum, r) => {
      const amt = Number(r.amount ?? r.cost ?? r.total ?? r.price ?? 0);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0);
  }, [filtered]);

  const pendingCount = useMemo(() => {
    return filtered.filter((r) => String(r.status ?? "").toLowerCase() === "pending").length;
  }, [filtered]);

  const approvedCount = useMemo(() => {
    return filtered.filter((r) =>
      ["approved", "active", "completed"].includes(String(r.status ?? "").toLowerCase()),
    ).length;
  }, [filtered]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mutation.isPending) return;
    const form = new FormData(e.currentTarget);
    let body: DomainRecord;
    try {
      body = readLedgerForm(fields ?? [], form, { ...defaults, requestId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid form");
      return;
    }
    mutation.mutate(async () => {
      if (upload) {
        const file = form.get("file") as File;
        if (!file?.size || file.size > 20 * 1024 * 1024)
          throw new Error("Choose a file up to 20 MB.");
        const signed = await api.post<{
          upload: { url: string; fields: Record<string, string> };
          storageKey: string;
        }>(`${endpoint}/upload`, {
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        });
        const data = new FormData();
        Object.entries(signed.upload.fields).forEach(([k, v]) => data.append(k, v));
        data.append("file", file);
        const response = await fetch(signed.upload.url, { method: "POST", body: data });
        if (!response.ok) throw new Error("File upload failed. Please retry.");
        body.storageKey = signed.storageKey;
        body.filename = file.name;
        body.size = file.size;
      }
      return onCreate ? onCreate(body) : api.post(endpoint, body);
    });
  }

  // Render status badge helper
  const renderCellContent = (key: string, val: unknown) => {
    if (key === "status") {
      const statusStr = String(val ?? "Pending");
      const normalized = statusStr.toLowerCase();
      if (normalized === "approved" || normalized === "active" || normalized === "completed") {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {statusStr}
          </span>
        );
      }
      if (normalized === "pending" || normalized === "under review" || normalized === "warning") {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {statusStr}
          </span>
        );
      }
      if (normalized === "rejected" || normalized === "disabled" || normalized === "critical") {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-rose-500" />
            {statusStr}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-secondary text-muted-foreground">
          {statusStr}
        </span>
      );
    }

    if (["amount", "cost", "total", "price", "budget"].includes(key.toLowerCase()) && typeof val === "number") {
      return <span className="font-bold text-foreground">₹{val.toLocaleString("en-IN")}</span>;
    }

    if (typeof val === "number") {
      return <span className="font-mono">{val.toLocaleString("en-IN")}</span>;
    }

    return String(val ?? "—");
  };

  return (
    <section className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        title={title}
        eyebrow="Project Operations & Ledger"
        actions={
          <div className="flex items-center gap-2">
            <button
              className="h-9 px-3 border border-border rounded-xl text-xs font-semibold hover:bg-secondary transition-colors flex items-center gap-1.5 bg-[color:var(--surface)] text-foreground shadow-sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RotateCw className={`size-3.5 ${query.isFetching ? "animate-spin text-primary" : ""}`} />
              Refresh
            </button>
            <button
              className="h-9 px-3 border border-border rounded-xl text-xs font-semibold hover:bg-secondary transition-colors flex items-center gap-1.5 bg-[color:var(--surface)] text-foreground shadow-sm"
              onClick={() =>
                exportToExcel(
                  filtered.map((r) =>
                    Object.fromEntries(columns.map((c) => [c.label, r[c.key] ?? ""])),
                  ),
                  title,
                )
              }
            >
              <Download className="size-3.5" />
              Export
            </button>
            {fields && (
              <button
                className="h-9 px-4 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-1.5 shadow-sm"
                onClick={() => {
                  setRequestId(crypto.randomUUID());
                  setOpen(true);
                }}
              >
                <Plus className="size-4" />
                {createLabel}
              </button>
            )}
          </div>
        }
      />

      {description && <p className="text-xs text-muted-foreground -mt-2">{description}</p>}

      {/* Top Metric Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Records
            </div>
            <div className="text-xl font-black text-foreground mt-0.5">{filtered.length}</div>
          </div>
          <div className="size-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <Layers className="size-4" />
          </div>
        </div>

        {totalAmount > 0 && (
          <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Accumulated Value
              </div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">
                ₹{totalAmount.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="size-4" />
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Status Overview
            </div>
            <div className="text-xs font-semibold text-foreground mt-1 flex items-center gap-2">
              <span className="text-emerald-600 font-bold">{approvedCount} Approved</span>
              <span>·</span>
              <span className="text-amber-600 font-bold">{pendingCount} Pending</span>
            </div>
          </div>
          <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Sparkles className="size-4" />
          </div>
        </div>
      </div>

      {/* Toolbar / Search, Project & Month Level Analytics Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              aria-label={`Search ${title}`}
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-xs border border-border rounded-xl bg-[color:var(--surface)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
            {Boolean(search) && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {availableProjects.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-orange-600 shrink-0" />
              <select
                aria-label="Filter by project analytics"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="h-9 px-3 text-xs border border-border rounded-xl bg-[color:var(--surface)] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
              >
                <option value="ALL">🌐 All Projects ({rows.length} total)</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    🏗️ {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableMonths.length > 0 && (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary shrink-0" />
              <select
                aria-label="Filter by month level analytics"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="h-9 px-3 text-xs border border-border rounded-xl bg-[color:var(--surface)] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
              >
                <option value="ALL">📅 All Months</option>
                {availableMonths.map((m) => {
                  const [y, mNum] = m.split("-");
                  const monthName = new Date(Number(y), Number(mNum) - 1, 1).toLocaleString(
                    "en-US",
                    { month: "short", year: "numeric" },
                  );
                  return (
                    <option key={m} value={m}>
                      📅 {monthName}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          Showing <strong className="text-foreground">{filtered.length}</strong> of {rows.length} entries
        </div>
      </div>

      {query.error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 text-xs font-semibold">
          {query.error.message}
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-secondary/40 border-b border-border text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="py-3 px-4">
                    {c.label}
                  </th>
                ))}
                {actions.length > 0 && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((r, i) => (
                <tr
                  key={String(r[idKey] ?? i)}
                  className="hover:bg-secondary/30 transition-colors"
                >
                  {columns.map((c) => (
                    <td key={c.key} className="py-3.5 px-4 whitespace-pre-wrap text-foreground">
                      {renderCellContent(c.key, r[c.key])}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        {actions
                          .filter((a) => !a.visible || a.visible(r))
                          .map((a) => {
                            const isApprove = a.label.toLowerCase().includes("approve");
                            return (
                              <button
                                key={a.label}
                                disabled={mutation.isPending}
                                className={`h-7 px-3 text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 ${
                                  isApprove
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "border border-border text-foreground hover:bg-secondary"
                                }`}
                                onClick={() => mutation.mutate(() => a.run(r))}
                              >
                                {isApprove ? (
                                  <CheckCircle2 className="size-3" />
                                ) : (
                                  <XCircle className="size-3" />
                                )}
                                {a.label}
                              </button>
                            );
                          })}
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="size-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 shadow-sm">
                        <Inbox className="size-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground">
                          {query.isLoading ? "Loading Ledger Records..." : `No ${title} Records Found`}
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          {query.isLoading
                            ? "Fetching latest entries from project operations ledger..."
                            : search
                            ? `No records match your search filter "${search}". Try clearing the search query.`
                            : `There are currently no items recorded under ${title.toLowerCase()}. Use the action button above to log a new record.`}
                        </p>
                      </div>
                      {fields && !query.isLoading && (
                        <button
                          onClick={() => {
                            setRequestId(crypto.randomUUID());
                            setOpen(true);
                          }}
                          className="mt-2 h-9 px-4 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Plus className="size-4" /> {createLabel}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={submit}
            className="bg-[color:var(--surface)] border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">{createLabel}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {(fields ?? []).map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  {field.label}
                  {field.required ? <span className="text-orange-600 font-bold ml-1">*</span> : ""}
                </label>

                {field.options ? (
                  <select
                    name={field.key}
                    required={field.required}
                    defaultValue={field.defaultValue ?? ""}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="">Select option...</option>
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    name={field.key}
                    rows={3}
                    required={field.required}
                    className="w-full p-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <input
                    name={field.key}
                    type={field.type ?? "text"}
                    required={field.required}
                    min={field.type === "number" ? (field.min ?? 0) : undefined}
                    step={field.type === "number" ? "any" : undefined}
                    defaultValue={field.defaultValue}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>
            ))}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => setOpen(false)}
                className="h-10 px-4 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="h-10 px-5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:pointer-events-none shadow-sm"
              >
                {mutation.isPending ? "Saving Record..." : "Save Record"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
