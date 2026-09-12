import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  useEffect(() => {
    setOpen(false);
    setSearch("");
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
  const filtered = rows.filter((row) =>
    columns.some((c) =>
      String(row[c.key] ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  );
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
  return (
    <section className="p-6 max-w-7xl mx-auto space-y-5">
      <PageHeader
        title={title}
        eyebrow="Project Operations"
        actions={
          <div className="flex gap-2">
            <button
              className="border rounded-lg px-3 py-2 text-sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              Refresh
            </button>
            <button
              className="border rounded-lg px-3 py-2 text-sm"
              onClick={() =>
                exportToExcel(
                  filtered.map((r) =>
                    Object.fromEntries(columns.map((c) => [c.label, r[c.key] ?? ""])),
                  ),
                  title,
                )
              }
            >
              Export
            </button>
            {fields && (
              <button
                className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm"
                onClick={() => {
                  setRequestId(crypto.randomUUID());
                  setOpen(true);
                }}
              >
                {createLabel}
              </button>
            )}
          </div>
        }
      />
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {query.error && (
        <p role="alert" className="text-destructive">
          {query.error.message}
        </p>
      )}
      <input
        aria-label={`Search ${title}`}
        placeholder="Search records..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded-lg px-3 py-2 bg-background w-full max-w-sm"
      />
      <div className="border rounded-xl overflow-x-auto bg-background">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="p-3">
                  {c.label}
                </th>
              ))}
              {actions.length > 0 && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={String(r[idKey] ?? i)} className="border-t">
                {columns.map((c) => (
                  <td key={c.key} className="p-3 whitespace-pre-wrap">
                    {typeof r[c.key] === "number"
                      ? Number(r[c.key]).toLocaleString("en-IN")
                      : String(r[c.key] ?? "—")}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="p-3">
                    <div className="flex gap-2 flex-wrap">
                      {actions
                        .filter((a) => !a.visible || a.visible(r))
                        .map((a) => (
                          <button
                            key={a.label}
                            disabled={mutation.isPending}
                            className="border px-2 py-1 rounded disabled:opacity-50"
                            onClick={() => mutation.mutate(() => a.run(r))}
                          >
                            {a.label}
                          </button>
                        ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-muted-foreground">
                  {query.isLoading ? "Loading..." : "No records found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={submit}
            className="bg-background rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
          >
            <h2 className="text-xl font-semibold">{createLabel}</h2>
            {(fields ?? []).map((field) => (
              <label key={field.key} className="block text-sm">
                {field.label}
                {field.required ? " *" : ""}
                {field.options ? (
                  <select
                    name={field.key}
                    required={field.required}
                    defaultValue={field.defaultValue ?? ""}
                    className="block w-full border rounded p-2 bg-background mt-1"
                  >
                    <option value="">Select...</option>
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    name={field.key}
                    required={field.required}
                    className="block w-full border rounded p-2 bg-background mt-1"
                  />
                ) : (
                  <input
                    name={field.key}
                    type={field.type ?? "text"}
                    required={field.required}
                    min={field.type === "number" ? (field.min ?? 0) : undefined}
                    step={field.type === "number" ? "any" : undefined}
                    defaultValue={field.defaultValue}
                    className="block w-full border rounded p-2 bg-background mt-1"
                  />
                )}
              </label>
            ))}
            <div className="flex justify-end gap-3">
              <button type="button" disabled={mutation.isPending} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                disabled={mutation.isPending}
                className="bg-primary text-primary-foreground rounded px-4 py-2"
              >
                {mutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
