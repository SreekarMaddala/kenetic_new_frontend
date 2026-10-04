import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, employeeApi, type DomainRecord } from "../../../lib/api";
import { payrollItems } from "../../../lib/payroll";
import { localDate } from "../../../lib/projectForm";
import { exportToExcel } from "../../../lib/excel";
import { PageHeader } from "../../../components/AppShell";
import { WorkflowLedger } from "../../../components/WorkflowLedger";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$projectId/payroll")({ component: Page });
const input = "rounded-lg border border-border bg-background px-3 py-2 text-sm";
const button =
  "rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-40";
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

function Page() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  if (user?.role === "supervisor")
    return (
      <div className="p-8">
        Project payroll is managed by your administrator.{" "}
        <Link to="/my-salary" className="text-primary underline">
          View My Salary
        </Link>
      </div>
    );
  return <Payroll key={projectId} projectId={projectId} />;
}

function Payroll({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [reference, setReference] = useState("");
  const endpoint = `/projects/${encodeURIComponent(projectId)}/payroll`;
  const cycles = useQuery({
    queryKey: ["payroll-cycle", projectId],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });
  const cycle = cycles.data?.find((item) => item.month === month);
  const items = payrollItems(cycles.data ?? [], month);
  const total = (field: "gross" | "deductions" | "dailyPaid" | "netPay") =>
    items.reduce((sum, item) => sum + item[field], 0);
  const operation = useMutation({
    mutationFn: ({
      kind,
      selectedMonth,
      receipt,
      createdAt,
    }: {
      kind: "generate" | "settle" | "reopen";
      selectedMonth: string;
      receipt?: string;
      createdAt?: unknown;
    }) => {
      if (kind === "reopen") return api.delete(`${endpoint}/${selectedMonth}`);
      return api.post(kind === "settle" ? `${endpoint}/disburse` : endpoint, {
        month: selectedMonth,
        ...(kind === "settle" ? { reference: receipt, expectedCreatedAt: createdAt } : {}),
      });
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["payroll-cycle", projectId] }),
        qc.invalidateQueries({ queryKey: ["employee-analytics", projectId] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["project", projectId] }),
        qc.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
        qc.invalidateQueries({ queryKey: ["my-salary"] }),
      ]);
      setReference("");
      toast.success(
        variables.kind === "settle"
          ? "External payroll payment recorded."
          : variables.kind === "reopen"
            ? "Unpaid payroll reopened; its previous snapshot is retained."
            : "Payroll generated from recorded wages and configured salaries.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });
  function settle(event: FormEvent) {
    event.preventDefault();
    if (!reference.trim() || operation.isPending) return;
    operation.mutate({
      kind: "settle",
      selectedMonth: month,
      receipt: reference.trim(),
      createdAt: cycle?.createdAt,
    });
  }
  const unavailable =
    cycles.isPending || cycles.isError || operation.isPending || !/^\d{4}-\d{2}$/.test(month);
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader title="Project Payroll" eyebrow="Monthly wages and salary settlement" />
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Payroll month
          <input
            aria-label="Payroll month"
            type="month"
            value={month}
            disabled={operation.isPending}
            onChange={(event) => {
              setMonth(event.target.value);
              setReference("");
            }}
            className={input}
          />
        </label>
        <button
          className={button}
          disabled={unavailable || !!cycle}
          onClick={() => operation.mutate({ kind: "generate", selectedMonth: month })}
        >
          Generate payroll
        </button>
        <button
          className={input}
          disabled={unavailable || !cycle || !items.length}
          onClick={() =>
            exportToExcel(
              items.map((item) => ({ ...item, month })),
              `Payroll_${projectId}_${month}`,
            )
          }
        >
          Export register
        </button>
        {cycle?.status === "Pending" && (
          <button
            className={input}
            disabled={unavailable}
            onClick={() => operation.mutate({ kind: "reopen", selectedMonth: month })}
          >
            Reopen unpaid cycle
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Generation locks attendance and deductions for this month. The register uses the saved
        payroll snapshot. Daily wage payments are deducted before calculating the remaining
        settlement.
      </p>
      {cycles.isPending && <p role="status">Loading payroll...</p>}
      {cycles.isError && (
        <p role="alert">
          Unable to load payroll: {cycles.error.message}{" "}
          <button className="underline" onClick={() => cycles.refetch()}>
            Retry
          </button>
        </p>
      )}
      {!unavailable && !cycle && (
        <p>
          No cycle has been generated for {month}. Configure salaries below and save worker
          attendance before generating payroll.
        </p>
      )}
      {cycle && !cycles.isError && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ["Gross", total("gross")],
              ["Deductions", total("deductions")],
              ["Daily wages already paid", total("dailyPaid")],
              ["Remaining settlement", total("netPay")],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-xl font-semibold">{money(Number(value))}</p>
              </div>
            ))}
          </div>
          <p>
            Status: <strong>{String(cycle.status)}</strong>
            {cycle.paymentReference ? ` · Receipt: ${cycle.paymentReference}` : ""}
          </p>
          <div className="overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  {[
                    "Employee",
                    "Category",
                    "Basic / wage earnings",
                    "HRA",
                    "Other allowances",
                    "Gross",
                    "Deductions",
                    "Daily paid",
                    "Settlement",
                  ].map((label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{item.category}</td>
                    {[
                      item.basic,
                      item.hra,
                      item.allowances,
                      item.gross,
                      item.deductions,
                      item.dailyPaid,
                      item.netPay,
                    ].map((value, index) => (
                      <td key={index} className="p-3 whitespace-nowrap">
                        {money(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cycle.status === "Pending" && (
            <form onSubmit={settle} className="rounded-xl border border-border p-5 space-y-3">
              <p className="text-sm">
                After paying the remaining amount outside this app, record the bank transaction or
                receipt reference here.
              </p>
              <label className="grid gap-1 text-sm">
                Payment reference
                <input
                  className={input}
                  value={reference}
                  required
                  maxLength={200}
                  disabled={operation.isPending}
                  onChange={(event) => setReference(event.target.value)}
                />
              </label>
              <button className={button} disabled={unavailable || !reference.trim()}>
                Record external payment
              </button>
            </form>
          )}
        </>
      )}
      <SalaryConfiguration projectId={projectId} endpoint={endpoint} />
    </div>
  );
}

function SalaryConfiguration({ projectId, endpoint }: { projectId: string; endpoint: string }) {
  const employees = useQuery({ queryKey: ["employees"], queryFn: employeeApi.list });
  return (
    <>
      {employees.isError && <p role="alert">Unable to load employees: {employees.error.message}</p>}
      <WorkflowLedger
        title="Staff Salary Configuration"
        description="Changes apply to future generated cycles. Existing payroll snapshots retain their original salary amounts."
        endpoint={`${endpoint}/staff`}
        idKey="employeeId"
        createLabel="Configure salary"
        fields={[
          {
            key: "employeeId",
            label: "Employee",
            required: true,
            options: (employees.data ?? [])
              .filter((employee) => employee.status === "Active")
              .map((employee) => ({ value: employee.employeeId, label: employee.name })),
          },
          ...["basic", "hra", "conveyance", "medical", "pf", "esi", "tds"].map((key) => ({
            key,
            label: key.toUpperCase(),
            type: "number" as const,
            min: key === "basic" ? 0.01 : 0,
            required: key === "basic",
            defaultValue: "0",
          })),
        ]}
        columns={[
          { key: "name", label: "Employee" },
          ...["basic", "hra", "conveyance", "medical", "pf", "esi", "tds"].map((key) => ({
            key,
            label: key.toUpperCase(),
          })),
        ]}
        onCreate={(body) => api.post(`${endpoint}/staff`, { ...body, projectId })}
      />
    </>
  );
}
