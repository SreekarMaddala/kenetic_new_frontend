import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Calendar,
  Search,
  Users,
  CheckCircle2,
  Clock,
  MinusCircle,
  Inbox,
  RotateCw,
} from "lucide-react";
import { PageHeader } from "./AppShell";
import { api, projectApi, type DomainRecord } from "../lib/api";
import { employeeAnalytics } from "../lib/employeeAnalytics";
import { exportToExcel } from "../lib/excel";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

export function EmployeeAnalytics({ projectId: fixedProjectId }: { projectId?: string }) {
  const [selection, setSelection] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [search, setSearch] = useState("");
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: projectApi.list,
    enabled: !fixedProjectId,
  });
  const projectId = fixedProjectId ?? selection;

  const report = useQuery({
    queryKey: ["employee-analytics", projectId, month],
    enabled: !!projectId && /^\d{4}-\d{2}$/.test(month),
    refetchInterval: 15000,
    queryFn: async () => {
      const [workers, cycles] = await Promise.all([
        api.get<DomainRecord[]>(
          `/supervisor/labour/attendance?projectId=${encodeURIComponent(projectId)}&date=${month}-01`,
        ),
        api.get<DomainRecord[]>(`/projects/${encodeURIComponent(projectId)}/payroll`),
      ]);
      return employeeAnalytics(workers, cycles, month);
    },
  });

  const rows = (report.data ?? []).filter((row) =>
    row.name.toLowerCase().includes(search.toLowerCase()),
  );
  const totals = rows.reduce(
    (sum, row) => ({
      days: sum.days + (row.days ?? 0),
      paid: sum.paid + row.paid,
      outstanding: sum.outstanding + row.outstanding,
      deductions: sum.deductions + row.deductions,
    }),
    { days: 0, paid: 0, outstanding: 0, deductions: 0 },
  );

  const renderStatusBadge = (statusStr: string) => {
    const normalized = String(statusStr || "").toLowerCase();
    if (normalized === "paid") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {statusStr}
        </span>
      );
    }
    if (["not paid", "partly paid", "pending"].includes(normalized)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-amber-500" />
          {statusStr}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-secondary text-muted-foreground">
        {statusStr}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Employee Analytics"
        eyebrow="Attendance & Payments"
        actions={
          <button
            className="h-9 px-4 border border-border rounded-xl text-xs font-semibold hover:bg-secondary transition-colors disabled:opacity-40 flex items-center gap-1.5 bg-[color:var(--surface)] text-foreground shadow-sm"
            disabled={!rows.length || report.isFetching || !!report.error}
            onClick={() => exportToExcel(rows, `employee-analytics-${projectId}-${month}`)}
          >
            <Download className="size-3.5" /> Export Report
          </button>
        }
      />

      <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
        Monthly attendance, daily payments recorded by supervisors, and unpaid employee wages.
        Select a project and wage month to see how much each employee has received and is still
        owed.
      </p>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex flex-wrap gap-4 items-end">
        {!fixedProjectId && (
          <div className="space-y-1.5 min-w-[200px]">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" /> Select Project
            </label>
            <select
              className="w-full h-9 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
            >
              <option value="">Choose a project...</option>
              {projects.data?.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5 min-w-[180px]">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="size-3.5 text-primary" /> Wage Month
          </label>
          <input
            type="month"
            className="w-full h-9 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>

        <div className="space-y-1.5 flex-1 min-w-[220px]">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Search className="size-3.5 text-primary" /> Employee Filter
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              className="w-full h-9 pl-9 pr-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search employee by name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      {projects.error && !fixedProjectId && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 text-xs font-semibold">
          Unable to load projects: {projects.error.message}
        </div>
      )}

      {!projectId ? (
        <div className="p-12 text-center border border-border rounded-2xl bg-[color:var(--surface)] text-muted-foreground text-xs space-y-2">
          <Users className="size-8 mx-auto text-muted-foreground" />
          <div className="font-bold text-foreground">Choose a Project</div>
          <p>Select a project above to view employee attendance and monthly payment analytics.</p>
        </div>
      ) : !month ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Select a wage month to generate report.
        </div>
      ) : report.isLoading ? (
        <div className="p-12 text-center border border-border rounded-2xl bg-[color:var(--surface)] text-xs text-muted-foreground space-y-3">
          <RotateCw className="size-6 animate-spin mx-auto text-orange-600" />
          <div className="font-semibold text-foreground">Generating Employee Analytics...</div>
        </div>
      ) : report.error ? (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 text-xs font-semibold space-y-3">
          <p>Unable to load analytics: {report.error.message}</p>
          <button
            className="h-8 px-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold"
            onClick={() => report.refetch()}
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <>
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Attendance Days
                </div>
                <div className="text-2xl font-black text-foreground mt-0.5">{totals.days}</div>
              </div>
              <div className="size-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Wages Paid
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-0.5">
                  {money(totals.paid)}
                </div>
              </div>
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="size-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Amount Still Owed
                </div>
                <div className="text-2xl font-black text-amber-600 mt-0.5">
                  {money(totals.outstanding)}
                </div>
              </div>
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Clock className="size-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Advances & Deductions
                </div>
                <div className="text-2xl font-black text-rose-600 mt-0.5">
                  {money(totals.deductions)}
                </div>
              </div>
              <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <MinusCircle className="size-5" />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            Present days earn the daily wage; absent days earn zero. Amount owed is earned wages
            minus recorded payments and advances/deductions. Totals follow the employee filter.
          </p>

          {/* Upgraded Table */}
          <div className="rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-secondary/40 border-b border-border text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {[
                      "Employee",
                      "Days",
                      "Gross wages",
                      "Advances / deductions",
                      "Wages paid",
                      "Amount owed",
                      "Status",
                      "Payment reference",
                      "Paid on",
                    ].map((label) => (
                      <th key={label} className="py-3 px-4 whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">{row.name}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold">{row.days ?? "—"}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                        {money(row.gross)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-rose-600 whitespace-nowrap">
                        {money(row.deductions)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {money(row.paid)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-600 whitespace-nowrap">
                        {money(row.outstanding)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(row.status)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {row.reference || "—"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {row.paidAt ? new Date(row.paidAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  ))}

                  {!rows.length && (
                    <tr>
                      <td colSpan={9} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="size-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 shadow-sm">
                            <Inbox className="size-7" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-foreground">
                              {search ? "No Employees Found" : "No Attendance or Payroll Records"}
                            </h4>
                            <p className="text-xs text-muted-foreground max-w-sm">
                              {search
                                ? `No staff members match "${search}". Try clearing the search query.`
                                : "There are no labour attendance or payroll cycle records registered for this project and month."}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
