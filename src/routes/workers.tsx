import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "../components/AppShell";
import { RegistryTable, RecordIdentity } from "../components/RegistryTable";
import { api, type DomainRecord } from "../lib/api";

export const Route = createFileRoute("/workers")({ component: WorkersPage });
const endpoint = "/supervisor/labour/attendance";
const input = "rounded-lg border border-border bg-background px-3 py-2 text-sm";
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

function WorkersPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [rate, setRate] = useState("800");
  const workers = useQuery({
    queryKey: ["workers"],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });
  const register = useMutation({
    mutationFn: () => api.post(endpoint, {
      operation: "register",
      name: name.trim(),
      rate: Number(rate),
    }),
    onSuccess: async () => {
      setName("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["workers"] }),
        qc.invalidateQueries({ queryKey: ["labour"] }),
      ]);
      toast.success("Worker registered. Allocate them from a project's attendance page.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <PageHeader title="Workers" eyebrow="Organization workforce" />
      <p className="text-sm text-muted-foreground">
        Register workers for your organization, then allocate them to projects from Daily Site Attendance.
      </p>
      <form
        className="rounded-2xl border border-border bg-card p-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && !register.isPending) register.mutate();
        }}
      >
        <h2 className="font-semibold">Register Worker</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-2 text-sm">
            Worker name
            <input required maxLength={128} className={input} value={name}
              onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm">
            Daily wage (₹)
            <input required type="number" min="0.01" step="0.01" className={input}
              value={rate} onChange={(event) => setRate(event.target.value)} />
          </label>
          <button
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-40"
            disabled={register.isPending || !name.trim()}
          >
            {register.isPending ? "Registering..." : "Register worker"}
          </button>
        </div>
      </form>
      <RegistryTable
        title="Registered workers"
        description="Workers available for allocation across your organization's projects."
        rows={workers.data ?? []}
        columns={[
          { key: "name", label: "Worker", value: (worker) => String(worker.name),
            render: (worker) => <RecordIdentity name={String(worker.name)} /> },
          { key: "rate", label: "Daily wage", value: (worker) => Number(worker.rate),
            render: (worker) => money(Number(worker.rate)) },
        ]}
        rowKey={(worker) => String(worker.labourAttendanceId)}
        searchText={(worker) => String(worker.name)}
        status={() => "Registered"}
        statuses={["Registered"]}
        loading={workers.isLoading}
        error={workers.error?.message}
        onRetry={() => workers.refetch()}
      />
    </div>
  );
}
