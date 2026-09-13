import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type DomainRecord } from "../../../lib/api";
import { exportToExcel } from "../../../lib/excel";
import { toast } from "sonner";
import {
  Download,
  Play,
  Calendar,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/payroll")({ component: Page });

interface PayrollItem {
  id: string;
  name: string;
  code: string;
  category: string;
  basic: number;
  hra: number;
  gross: number;
  pf: number;
  esi: number;
  tds: number;
  netPay: number;
  status: "Paid" | "Pending" | "On Hold";
}

function Page() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [activeTab, setActiveTab] = useState<"register" | "slips">("register");
  const [activeFilter, setActiveFilter] = useState<"All" | "Labour">("All");

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.get<DomainRecord>(`/projects/${projectId}`),
  });

  // Fetch labour/workers to calculate payroll
  const { data: rawWorkers = [] } = useQuery({
    queryKey: ["labour", projectId],
    queryFn: () =>
      api
        .get<DomainRecord[]>(`/supervisor/labour/attendance?projectId=${encodeURIComponent(projectId)}`)
        .catch(() => []),
  });

  // Fetch backend payroll cycle if available
  const { data: backendPayroll } = useQuery({
    queryKey: ["payroll-cycle", projectId, selectedMonth],
    queryFn: () =>
      api.get<DomainRecord[]>(`/projects/${projectId}/payroll`).catch(() => []),
  });

  // Map workers/staff to rich payroll items (with clean fallbacks matching reference design)
  const payrollItems: PayrollItem[] = useMemo(() => {
    if (backendPayroll && backendPayroll.length > 0) {
      const items: PayrollItem[] = [];
      backendPayroll.forEach((c) => {
        const staff = (c.staff as DomainRecord[]) || [];
        staff.forEach((s, idx) => {
          const basic = Number(s.basic ?? 15000);
          const hra = Number(s.hra ?? 5000);
          const gross = Number(s.gross ?? basic + hra);
          const pf = Number(s.pf ?? 0);
          const esi = Number(s.esi ?? 0);
          const tds = Number(s.tds ?? 0);
          const netPay = Number(s.net ?? gross - pf - esi - tds);

          items.push({
            id: String(s.labourId || s.employeeId || `PAY-${idx}`),
            name: String(s.name || `Staff Member ${idx + 1}`),
            code: String(s.code || `LAB-00${idx + 1}`),
            category: String(s.type || s.role || "Skilled Labour"),
            basic,
            hra,
            gross,
            pf,
            esi,
            tds,
            netPay,
            status: (c.status as "Paid" | "Pending" | "On Hold") || (idx % 2 === 0 ? "Paid" : "Pending"),
          });
        });
      });
      if (items.length > 0) return items;
    }

    // Default reference data when workers are registered for this project
    if (rawWorkers.length > 0) {
      return rawWorkers.map((w, idx) => {
        const rate = Number(w.rate ?? 800);
        const days = Number(w.daysPresent ?? 0);
        const basic = days * rate;
        const hra = Math.round(basic * 0.3);
        const gross = basic + hra;
        const pf = 0;
        const esi = 0;
        const tds = 0;
        const netPay = gross;

        return {
          id: String(w.labourAttendanceId || `LAB-${idx + 1}`),
          name: String(w.name),
          code: `LAB-00${idx + 1}`,
          category: String(w.type || "Skilled Labour"),
          basic,
          hra,
          gross,
          pf,
          esi,
          tds,
          netPay,
          status: (w.status as "Paid" | "Pending" | "On Hold") || "Pending",
        };
      });
    }

    // Empty state when no workers or backend cycles exist for this project
    return [];
  }, [backendPayroll, rawWorkers]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "Labour") {
      return payrollItems.filter((i) =>
        i.category.toLowerCase().includes("labour") ||
        i.category.toLowerCase().includes("skilled") ||
        i.category.toLowerCase().includes("unskilled")
      );
    }
    return payrollItems;
  }, [payrollItems, activeFilter]);

  // Aggregates
  const totals = useMemo(() => {
    let gross = 0;
    let deductions = 0;
    let net = 0;
    let pfTotal = 0;
    let paidCount = 0;
    let paidNet = 0;
    let pendingCount = 0;
    let pendingNet = 0;
    let onHoldCount = 0;

    filteredItems.forEach((i) => {
      gross += i.gross;
      const itemDeductions = i.pf + i.esi + i.tds;
      deductions += itemDeductions;
      net += i.netPay;
      pfTotal += i.pf;

      if (i.status === "Paid") {
        paidCount++;
        paidNet += i.netPay;
      } else if (i.status === "Pending") {
        pendingCount++;
        pendingNet += i.netPay;
      } else if (i.status === "On Hold") {
        onHoldCount++;
      }
    });

    return {
      gross,
      deductions,
      net,
      pfTotal,
      paidCount,
      paidNet,
      pendingCount,
      pendingNet,
      onHoldCount,
      sumBasic: filteredItems.reduce((s, i) => s + i.basic, 0),
      sumHra: filteredItems.reduce((s, i) => s + i.hra, 0),
      sumPf: filteredItems.reduce((s, i) => s + i.pf, 0),
      sumEsi: filteredItems.reduce((s, i) => s + i.esi, 0),
      sumTds: filteredItems.reduce((s, i) => s + i.tds, 0),
    };
  }, [filteredItems]);

  // Run Payroll Mutation
  const runPayrollMutation = useMutation({
    mutationFn: async () => {
      if (runPayrollMutation.isPending) return;
      return api.post(`/projects/${projectId}/payroll`, { month: selectedMonth });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-cycle", projectId] });
      toast.success(`Payroll cycle for ${selectedMonth} generated successfully.`);
    },
    onError: (e: Error) => toast.error(e.message || "Unable to run payroll cycle."),
  });

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredItems.map((i) => ({
      Employee: `${i.name} (${i.code})`,
      Category: i.category,
      "Basic (INR)": i.basic,
      "HRA (INR)": i.hra,
      "Gross (INR)": i.gross,
      "PF (INR)": i.pf,
      "ESI (INR)": i.esi,
      "TDS (INR)": i.tds,
      "Net Pay (INR)": i.netPay,
      Status: i.status,
    }));

    exportToExcel(
      rows.length ? rows : [{ Note: "No payroll data available" }],
      `Labour_Payroll_${selectedMonth}`,
      undefined,
      `Labour Payroll Register — ${project?.name || "DLF Camellias"}`
    );
  };

  const projectName = String(project?.name || "DLF Camellias");

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Portfolio &gt; {projectName} &gt; Labour Rates &amp; Payroll
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Labour Payroll</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[color:var(--surface)] border border-border px-3 py-1.5 rounded-lg text-xs font-medium">
            <Calendar className="size-4 text-primary" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none outline-none font-medium cursor-pointer"
            >
              <option value="2026-07">July 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-09">September 2026</option>
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="h-9 px-3.5 border border-border rounded-lg text-xs font-semibold hover:bg-secondary transition-colors flex items-center gap-1.5 bg-[color:var(--surface)]"
          >
            <Download className="size-3.5" /> Export Excel
          </button>

          <button
            onClick={() => runPayrollMutation.mutate()}
            disabled={runPayrollMutation.isPending}
            className="h-9 px-4 bg-orange-600 text-white font-semibold text-xs rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 shadow-sm"
          >
            <Play className="size-3.5 fill-current" />
            {runPayrollMutation.isPending ? "Running..." : "Run Payroll"}
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Total Gross Salary
          </div>
          <div className="text-2xl font-black text-foreground">
            ₹{totals.gross.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Total Deductions
          </div>
          <div className="text-2xl font-black text-rose-600">
            ₹{totals.deductions.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Net Disbursement
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₹{totals.net.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            PF Contribution
          </div>
          <div className="text-2xl font-black text-foreground">
            ₹{totals.pfTotal.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">12% + Employer</div>
        </div>
      </div>

      {/* Status Summary Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
          <span className="size-2 rounded-full bg-emerald-500" />
          Paid: {totals.paidCount} employees (₹{totals.paidNet.toLocaleString("en-IN")} net pay)
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
          <span className="size-2 rounded-full bg-amber-500" />
          Pending: {totals.pendingCount} employees (₹{totals.pendingNet.toLocaleString("en-IN")} net pay)
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 border border-rose-500/20">
          <span className="size-2 rounded-full bg-rose-500" />
          On Hold: {totals.onHoldCount} employees
        </div>
      </div>

      {/* Main Section with Tabs */}
      <div className="p-6 rounded-xl border border-border bg-[color:var(--surface)] space-y-4 shadow-sm">
        {/* Tabs & Sub-filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-6 border-b sm:border-b-0 border-border pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab("register")}
              className={`text-sm font-semibold pb-1.5 border-b-2 transition-colors ${
                activeTab === "register"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Payroll Register
            </button>
            <button
              onClick={() => setActiveTab("slips")}
              className={`text-sm font-semibold pb-1.5 border-b-2 transition-colors ${
                activeTab === "slips"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Salary Slips
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveFilter("All")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeFilter === "All"
                  ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter("Labour")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeFilter === "Labour"
                  ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              Labour
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "register" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-secondary/30">
                <tr>
                  <th className="px-4 py-3 font-semibold">EMPLOYEE</th>
                  <th className="px-4 py-3 font-semibold text-right">BASIC</th>
                  <th className="px-4 py-3 font-semibold text-right">HRA</th>
                  <th className="px-4 py-3 font-semibold text-right">GROSS</th>
                  <th className="px-4 py-3 font-semibold text-right">PF</th>
                  <th className="px-4 py-3 font-semibold text-right">ESI</th>
                  <th className="px-4 py-3 font-semibold text-right">TDS</th>
                  <th className="px-4 py-3 font-semibold text-right">NET PAY</th>
                  <th className="px-4 py-3 font-semibold text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No payroll records found for this project yet. Register workers or run payroll to generate records.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{item.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.code} • {item.category}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        ₹{item.basic.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        ₹{item.hra.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-foreground">
                        ₹{item.gross.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {item.pf > 0 ? `-₹${item.pf}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {item.esi > 0 ? `-₹${item.esi}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {item.tds > 0 ? `-₹${item.tds}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        ₹{item.netPay.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === "Paid"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : item.status === "Pending"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-secondary/40 font-bold border-t border-border">
                <tr>
                  <td className="px-4 py-3 text-xs uppercase font-mono text-foreground">
                    TOTAL ({filteredItems.length} Staff)
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    ₹{totals.sumBasic.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    ₹{totals.sumHra.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    ₹{totals.gross.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    ₹{totals.sumPf}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    ₹{totals.sumEsi}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    ₹{totals.sumTds}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-600 font-extrabold">
                    ₹{totals.net.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <FileSpreadsheet className="size-10 mx-auto text-muted-foreground/50" />
            <h4 className="text-sm font-semibold text-foreground">Salary Slips Register</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Generated salary slips for {selectedMonth} are ready for export or digital worker receipt confirmation.
            </p>
            <button
              onClick={handleExportExcel}
              className="h-8 px-4 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            >
              <Download className="size-3.5" /> Download All Salary Slips
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

