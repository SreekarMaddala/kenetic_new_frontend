import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, employeeApi, governanceApi, type DomainRecord } from "../../../lib/api";
import { payrollItems } from "../../../lib/payroll";
import { localDate } from "../../../lib/projectForm";
import { exportToExcel } from "../../../lib/excel";
import { PayrollCyclePanel } from "../../../components/PayrollCyclePanel";
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
  const [settlementGroup, setSettlementGroup] = useState("all");
  const endpoint = `/projects/${encodeURIComponent(projectId)}/payroll`;
  const cycles = useQuery({
    queryKey: ["payroll-cycle", projectId, month],
    queryFn: () => api.get<DomainRecord[]>(`${endpoint}?month=${encodeURIComponent(month)}`),
  });
  const cycle = cycles.data?.find((item) => item.month === month);
  const allItems = payrollItems(cycles.data ?? [], month);
  const items =
    settlementGroup === "all"
      ? allItems
      : allItems.filter((item) => item.groupKey === settlementGroup);
  const groupOptions = [...new Map(allItems.map((item) => [item.groupKey, item.group])).entries()];
  const total = (
    field: "gross" | "deductions" | "dailyPaid" | "netPay" | "remaining" | "advanceRecovery",
  ) => items.reduce((sum, item) => sum + item[field], 0);
  const operation = useMutation({
    mutationFn: ({
      kind,
      selectedMonth,
      receipt,
      createdAt,
      group,
    }: {
      kind: "generate" | "settle" | "reopen";
      selectedMonth: string;
      receipt?: string;
      createdAt?: unknown;
      group?: string;
    }) => {
      if (kind === "reopen") return api.delete(`${endpoint}/${selectedMonth}`);
      if (kind === "generate") return governanceApi.generatePayroll(projectId, selectedMonth);
      return api.post(kind === "settle" ? `${endpoint}/disburse` : endpoint, {
        month: selectedMonth,
        ...(kind === "settle"
          ? { reference: receipt, expectedCreatedAt: createdAt, settlementGroup: group ?? "all" }
          : {}),
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
        qc.invalidateQueries({ queryKey: ["worker-profile"] }),
        qc.invalidateQueries({ queryKey: ["gang-account"] }),
        qc.invalidateQueries({ queryKey: ["gang-headcounts"] }),
        qc.invalidateQueries({ queryKey: ["ledger"] }),
        qc.invalidateQueries({ queryKey: ["posted-spending", projectId] }),
        qc.invalidateQueries({ queryKey: ["executive-report"] }),
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
      group: settlementGroup,
    });
  }
  const unavailable =
    cycles.isPending || cycles.isError || operation.isPending || !/^\d{4}-\d{2}$/.test(month);
  return (
    <div className="payroll-page">
      <PayrollCyclePanel
        month={month}
        onMonthChange={(value) => {
          setMonth(value);
          setReference("");
          setSettlementGroup("all");
          operation.reset();
        }}
        status={cycle ? String(cycle.status) : undefined}
        entries={allItems.length}
        loading={cycles.isPending}
        error={cycles.error?.message}
        busy={operation.isPending ? operation.variables?.kind : undefined}
        unavailable={unavailable}
        onGenerate={() => operation.mutate({ kind: "generate", selectedMonth: month })}
        onExport={() =>
          exportToExcel(
            items.map((item) => ({ ...item, month })),
            `Payroll_${projectId}_${month}_${settlementGroup}`,
            [
              { key: "month", header: "Month" },
              { key: "name", header: "Employee / worker" },
              { key: "group", header: "Group" },
              { key: "category", header: "Category" },
              { key: "gross", header: "Gross wages (INR)" },
              { key: "advanceRecovery", header: "Advances deducted (INR)" },
              { key: "carryForward", header: "Advance carried forward (INR)" },
              { key: "deductions", header: "Total deductions including advances (INR)" },
              { key: "dailyPaid", header: "Daily wages already paid (INR)" },
              { key: "netPay", header: "Final wages after deductions (INR)" },
              { key: "remaining", header: "Remaining settlement (INR)" },
              { key: "status", header: "Payment status" },
              { key: "reference", header: "Payment reference" },
              { key: "paidAt", header: "Paid at" },
            ],
            `Monthly wages — ${month} — ${settlementGroup === "all" ? "All groups" : (items[0]?.group ?? "Selected group")}`,
          )
        }
        onReopen={() => operation.mutate({ kind: "reopen", selectedMonth: month })}
        onRetry={() => {
          void cycles.refetch();
        }}
      />
      {cycle && !cycles.isError && (
        <>
          {allItems.some((item) => item.category === "Gang headcount") && (
            <section
              className="rounded-xl border border-border bg-card p-5 space-y-3"
              aria-label="Gang payment calculation"
            >
              <h2 className="font-semibold">Gang payment, made clear</h2>
              <p className="text-sm text-muted-foreground">
                Wages earned − advance deducted = payment to the gang. Extra advance carries forward
                to future wages. Advances added after this payroll was prepared are included in the
                next payroll.
              </p>
              {items
                .filter((item) => item.category === "Gang headcount")
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm"
                  >
                    <strong>{item.name}</strong>
                    <span>
                      {money(item.gross)} earned − {money(item.advanceRecovery)} advance ={" "}
                      <strong>
                        {money(item.netPay)} {item.status === "Paid" ? "paid" : "to pay"}
                      </strong>
                      {item.carryForward > 0 && (
                        <small className="block text-muted-foreground">
                          {money(item.carryForward)} advance carries forward from this snapshot
                        </small>
                      )}
                    </span>
                  </div>
                ))}
            </section>
          )}
          <label className="grid gap-1 text-sm max-w-sm">
            Worker group / report filter
            <select
              className={input}
              value={settlementGroup}
              disabled={operation.isPending}
              onChange={(event) => {
                setSettlementGroup(event.target.value);
                setReference("");
              }}
            >
              <option value="all">All groups and staff</option>
              {groupOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!cycle.advanceRecoveryVersion && (
            <p className="text-sm text-amber-700">
              This register predates automatic advance deductions. Reopen an unpaid cycle and
              generate it again to include advances.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ["Gross", total("gross")],
              ["Deductions", total("deductions")],
              ["Daily wages already paid", total("dailyPaid")],
              ["Remaining settlement", total("remaining")],
            ].map(([label, value]) => (
              <div key={String(label)} className="payroll-summary-card">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-xl font-semibold">{money(Number(value))}</p>
              </div>
            ))}
          </div>
          <p className="text-sm">
            Advances deducted: <strong>{money(total("advanceRecovery"))}</strong>
          </p>
          <p>
            Status: <strong>{String(cycle.status)}</strong>
            {cycle.paymentReference ? ` · Receipt: ${cycle.paymentReference}` : ""}
          </p>
          <div className="payroll-register overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  {[
                    "Employee",
                    "Category",
                    "Group",
                    "Basic / wage earnings",
                    "HRA",
                    "Other allowances",
                    "Gross",
                    "Deductions",
                    "Advances in deductions",
                    "Daily paid",
                    "Settlement",
                    "Payment status",
                    "Receipt",
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
                    <td className="p-3">{item.group}</td>
                    {[
                      item.basic,
                      item.hra,
                      item.allowances,
                      item.gross,
                      item.deductions,
                      item.advanceRecovery,
                      item.dailyPaid,
                      item.netPay,
                    ].map((value, index) => (
                      <td key={index} className="p-3 whitespace-nowrap">
                        {money(value)}
                      </td>
                    ))}
                    <td className="p-3">{item.status}</td>
                    <td className="p-3">{item.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cycle.status !== "Paid" && items.some((item) => item.status !== "Paid") && (
            <form onSubmit={settle} className="rounded-xl border border-border p-5 space-y-3">
              <p className="text-sm">
                Pay {money(total("remaining"))} outside this app for{" "}
                {settlementGroup === "all"
                  ? "all remaining groups and staff"
                  : (groupOptions.find(([key]) => key === settlementGroup)?.[1] ??
                    "the selected group")}
                , then record its bank transaction or receipt reference here.
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
        className="payroll-salary-ledger"
        showSummary={false}
        eyebrow="SALARY SETTINGS"
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
