import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
type Extracted = {
  vendor: string;
  invoice: string;
  total: string;
  date: string;
  tax: string;
  documentId: string;
};
export function InvoiceCapture({ projectId }: { projectId: string }) {
  const [result, setResult] = useState<Extracted | null>(null);
  const qc = useQueryClient();
  const extract = useMutation({
    mutationFn: async (file: File) => {
      if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024)
        throw new Error("Choose a JPEG or PNG invoice image up to 5 MB.");
      const endpoint = `/projects/${projectId}/documents`;
      const signed = await api.post<{
        upload: { url: string; fields: Record<string, string> };
        storageKey: string;
      }>(`${endpoint}/upload`, { name: file.name, size: file.size, contentType: file.type });
      const data = new FormData();
      Object.entries(signed.upload.fields).forEach(([k, v]) => data.append(k, v));
      data.append("file", file);
      const response = await fetch(signed.upload.url, { method: "POST", body: data });
      if (!response.ok) throw new Error("Invoice upload failed.");
      const doc = await api.post<{ documentId: string }>(endpoint, {
        title: file.name,
        category: "Invoice",
        filename: file.name,
        size: file.size,
        storageKey: signed.storageKey,
        requestId: crypto.randomUUID(),
      });
      qc.invalidateQueries();
      return api.post<Extracted>(`${endpoint}/${doc.documentId}/extract`, {});
    },
    onSuccess: setResult,
    onError: (e: Error) => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/projects/${projectId}/bills`, body),
    onSuccess: () => {
      setResult(null);
      qc.invalidateQueries();
      toast.success("Invoice saved for review.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const amount = Number(data.get("grossAmount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a positive invoice amount.");
      return;
    }
    save.mutate({
      billNumber: String(data.get("billNumber")),
      clientOrContractor: String(data.get("clientOrContractor")),
      date: String(data.get("date")),
      grossAmount: amount,
      type: "Vendor",
      documentId: result?.documentId,
      requestId: `invoice-${result?.documentId}`,
    });
  }
  return (
    <section className="p-6 max-w-7xl mx-auto space-y-3">
      <h2 className="text-lg font-semibold">Extract invoice details</h2>
      <p className="text-sm text-muted-foreground">
        Upload a JPEG or PNG invoice image (up to 5 MB), then check the extracted fields before
        saving. Manual entry is available below.
      </p>
      <input
        aria-label="Invoice image"
        type="file"
        accept="image/jpeg,image/png"
        disabled={extract.isPending || save.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) extract.mutate(file);
          e.target.value = "";
        }}
      />
      {extract.isPending && <p role="status">Uploading and reading invoice...</p>}
      {result && (
        <form key={result.documentId} onSubmit={submit} className="border rounded-lg p-4 space-y-3">
          <p className="text-sm">
            Detected total: {result.total || "Not found"} · Detected date:{" "}
            {result.date || "Not found"} · Detected tax: {result.tax || "Not found"}. Confirm the
            numeric amount and date below.
          </p>
          <label className="block">
            Invoice number
            <input
              name="billNumber"
              required
              defaultValue={result.invoice}
              className="block border rounded p-2 bg-background"
            />
          </label>
          <label className="block">
            Vendor
            <input
              name="clientOrContractor"
              required
              defaultValue={result.vendor}
              className="block border rounded p-2 bg-background"
            />
          </label>
          <label className="block">
            Confirmed invoice amount
            <input
              name="grossAmount"
              type="number"
              min="0.01"
              step="any"
              required
              className="block border rounded p-2 bg-background"
            />
          </label>
          <label className="block">
            Confirmed invoice date
            <input
              name="date"
              type="date"
              required
              className="block border rounded p-2 bg-background"
            />
          </label>
          <button
            disabled={save.isPending}
            className="bg-primary text-primary-foreground px-3 py-2 rounded"
          >
            {save.isPending ? "Saving..." : "Save reviewed fields"}
          </button>
        </form>
      )}
    </section>
  );
}
