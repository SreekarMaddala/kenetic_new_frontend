import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";

export type WorkerAdvance = {
  advanceId: string;
  date: string;
  amount: number;
  description: string;
  remainingAmount?: number;
  clearedAmount?: number;
  version?: number;
};
const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

export function WorkerAdvanceList({
  workerId,
  projectId,
  advances,
  total,
  hasMore,
  admin,
}: {
  workerId: string;
  projectId: string;
  advances: WorkerAdvance[];
  total: number;
  hasMore?: boolean;
  admin: boolean;
}) {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<{
    entry: WorkerAdvance;
    mode: "clear" | "delete";
  } | null>(null);
  const [amount, setAmount] = useState("");
  const requests = useRef(new Map<string, string>());
  const save = useMutation({
    mutationFn: async () => {
      if (!selection) throw new Error("Choose an advance first.");
      const { entry, mode } = selection;
      const remaining = entry.remainingAmount ?? entry.amount;
      const cleared = Number(amount);
      if (mode === "clear" && (!Number.isFinite(cleared) || cleared <= 0 || cleared > remaining))
        throw new Error("Enter an amount up to the remaining advance.");
      const payload = {
        operation: mode === "clear" ? "advance_clear" : "advance_delete",
        workerId,
        projectId,
        advanceId: entry.advanceId,
        date: entry.date,
        expectedVersion: entry.version ?? 0,
        ...(mode === "clear" ? { amount: cleared } : {}),
      };
      const key = JSON.stringify(payload);
      const requestId = requests.current.get(key) ?? crypto.randomUUID();
      requests.current.set(key, requestId);
      return api.post("/supervisor/labour/attendance", { ...payload, requestId });
    },
    onSuccess: async () => {
      toast.success(selection?.mode === "delete" ? "Advance removed." : "Advance amount cleared.");
      setSelection(null);
      await qc.invalidateQueries({ queryKey: ["worker-profile", workerId] });
    },
  });
  const remaining = selection ? (selection.entry.remainingAmount ?? selection.entry.amount) : 0;
  const valid =
    selection?.mode === "delete" ||
    (Number.isFinite(Number(amount)) && Number(amount) > 0 && Number(amount) <= remaining);
  function choose(entry: WorkerAdvance, mode: "clear" | "delete") {
    save.reset();
    setSelection({ entry, mode });
    setAmount(String(entry.remainingAmount ?? entry.amount));
  }
  return (
    <section className="rounded-xl border p-3 grid gap-3">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-semibold">Worker advances</h3>
        <strong>Remaining {money(total)}</strong>
      </div>
      <p className="text-xs text-muted-foreground">
        Clear any repaid amount or delete an entry. Wages and payroll stay unchanged.
      </p>
      {advances.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                {[
                  "Payment date",
                  "Given",
                  "Remaining",
                  "Reason / reference",
                  ...(admin ? ["Actions"] : []),
                ].map((label) => (
                  <th key={label} className="p-2 border-b">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {advances.map((entry) => (
                <tr key={entry.advanceId}>
                  <td className="p-2 whitespace-nowrap">{entry.date}</td>
                  <td className="p-2 whitespace-nowrap">{money(entry.amount)}</td>
                  <td className="p-2 whitespace-nowrap">
                    <strong>{money(entry.remainingAmount ?? entry.amount)}</strong>
                    {!!entry.clearedAmount && (
                      <small className="block text-muted-foreground">
                        {money(entry.clearedAmount)} cleared
                      </small>
                    )}
                  </td>
                  <td className="p-2 break-words">{entry.description}</td>
                  {admin && (
                    <td className="p-2">
                      <div className="flex gap-2 whitespace-nowrap">
                        <button
                          className="worker-advance-trigger"
                          disabled={save.isPending}
                          onClick={() => choose(entry, "clear")}
                        >
                          Clear amount
                        </button>
                        <button
                          className="worker-advance-trigger text-red-700"
                          disabled={save.isPending}
                          onClick={() => choose(entry, "delete")}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No outstanding advances.</p>
      )}
      {selection && (
        <form
          className="rounded-lg border p-3 grid gap-3 bg-muted/30"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !save.isPending) save.mutate();
          }}
        >
          <p className="text-sm font-semibold">
            {selection.mode === "delete" ? "Delete this advance entry?" : "Clear a repaid amount"}
          </p>
          <p className="text-xs text-muted-foreground">
            {selection.entry.date} · {selection.entry.description} · {money(remaining)} remaining
          </p>
          {selection.mode === "clear" && (
            <label className="grid gap-1 text-sm">
              Amount to clear (₹)
              <input
                required
                type="number"
                min="0.01"
                max={remaining}
                step="0.01"
                inputMode="decimal"
                value={amount}
                disabled={save.isPending}
                onChange={(event) => setAmount(event.target.value)}
                className="border rounded-lg bg-background p-2 w-full max-w-xs"
              />
            </label>
          )}
          {selection.mode === "delete" && (
            <p className="text-sm">
              This removes the entry and its remaining amount from the list.
            </p>
          )}
          {save.error && (
            <p role="alert" className="text-sm text-red-700">
              {save.error.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="worker-advance-trigger" disabled={save.isPending || !valid}>
              {save.isPending
                ? "Saving…"
                : selection.mode === "delete"
                  ? "Delete entry"
                  : "Confirm cleared amount"}
            </button>
            <button
              type="button"
              className="worker-advance-trigger"
              disabled={save.isPending}
              onClick={() => {
                setSelection(null);
                save.reset();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {hasMore && (
        <p className="text-xs text-muted-foreground">
          Showing outstanding entries among the latest 100 records. The remaining total includes all
          outstanding entries this month.
        </p>
      )}
    </section>
  );
}
