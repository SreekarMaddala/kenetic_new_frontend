import { useState, useMemo, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  RotateCw,
  Download,
  Plus,
  Search,
  Inbox,
  X,
  CreditCard,
  Truck,
  Users,
  Zap,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../../../components/AppShell";
import { api, type DomainRecord } from "../../../lib/api";
import { exportToExcel } from "../../../lib/excel";

export const Route = createFileRoute("/projects/$projectId/expenses")({ component: Page });

interface UnifiedExpense {
  id: string;
  date: string;
  source: "Vendor Payment" | "Logistics Fuel" | "Rental Transit" | "Labour Advance" | "Direct Expense";
  description: string;
  category: string;
  amount: number;
  paidBy: string;
  status: string;
  raw: DomainRecord;
}

function isThisWeek(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);
  return d >= startOfWeek && d <= endOfWeek;
}

function isThisMonth(dateStr: string): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return dateStr.startsWith(currentMonthStr);
}

function Page() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();

  // Active Time Range Filter: "week" | "month" | "all"
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");
  // Source Filter: "ALL" | "Vendor Payment" | "Logistics Fuel" | "Rental Transit" | "Labour Advance" | "Direct Expense"
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Add Expense
  const [expDesc, setExpDesc] = useState("");
  const [expCat, setExpCat] = useState("Food & Mess");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expPaidBy, setExpPaidBy] = useState("");

  // Data Queries from all project modules
  const expensesQuery = useQuery({
    queryKey: ["expenses", projectId],
    queryFn: () => api.get<DomainRecord[]>(`/projects/${projectId}/expenses`),
  });

  const paymentsQuery = useQuery({
    queryKey: ["payments", projectId],
    queryFn: () => api.get<DomainRecord[]>(`/projects/${projectId}/payments`),
  });

  const logisticsQuery = useQuery({
    queryKey: ["logistics-trips", projectId],
    queryFn: () => api.get<DomainRecord[]>(`/supervisor/logistics/trips?projectId=${projectId}`),
  });

  const labourQuery = useQuery({
    queryKey: ["labour", projectId],
    queryFn: () => api.get<DomainRecord[]>(`/supervisor/labour/attendance?projectId=${projectId}`),
  });

  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      if (createExpenseMutation.isPending) return;
      if (!expDesc.trim() || !expAmount || Number(expAmount) <= 0 || !expPaidBy.trim()) {
        throw new Error("Please fill in description, valid amount, and paid by name.");
      }
      return api.post(`/projects/${projectId}/expenses`, {
        projectId,
        description: expDesc.trim(),
        category: expCat,
        amount: Number(expAmount),
        date: expDate,
        submittedBy: expPaidBy.trim(),
        status: "Approved",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", projectId] });
      toast.success("Project expense logged successfully.");
      setIsAddModalOpen(false);
      setExpDesc("");
      setExpAmount("");
      setExpPaidBy("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Combine and unify all expenses across Vendor Payments, Logistics, Labour Advances, and Direct Expenses
  const combinedExpenses: UnifiedExpense[] = useMemo(() => {
    const list: UnifiedExpense[] = [];

    // 1. Direct Project Expenses
    (expensesQuery.data ?? []).forEach((exp, idx) => {
      list.push({
        id: String(exp.expenseId ?? `exp-${idx}`),
        date: String(exp.date ?? new Date().toISOString().slice(0, 10)),
        source: "Direct Expense",
        description: String(exp.description ?? "Project Expense"),
        category: String(exp.category ?? "Site Operations"),
        amount: Number(exp.amount ?? 0),
        paidBy: String(exp.submittedBy ?? "Operations Admin"),
        status: String(exp.status ?? "Approved"),
        raw: exp,
      });
    });

    // 2. Vendor Payments
    (paymentsQuery.data ?? []).forEach((pay, idx) => {
      list.push({
        id: String(pay.paymentId ?? `pay-${idx}`),
        date: String(pay.date ?? new Date().toISOString().slice(0, 10)),
        source: "Vendor Payment",
        description: `Vendor Payment: ${String(pay.vendorName ?? pay.vendorId ?? "Supplier")} (${String(pay.mode ?? "Bank Transfer")})`,
        category: "Vendor & Material Bill",
        amount: Number(pay.amount ?? 0),
        paidBy: String(pay.reference ? `Ref: ${pay.reference}` : "Finance Admin"),
        status: String(pay.status ?? "Approved"),
        raw: pay,
      });
    });

    // 3. Logistics & Fleet Expenditure Trips
    (logisticsQuery.data ?? []).forEach((log, idx) => {
      const tripType = String(log.tripType ?? "");
      if (tripType === "fuel") {
        list.push({
          id: String(log.tripId ?? log.recordId ?? `fuel-${idx}`),
          date: String(log.date ?? new Date().toISOString().slice(0, 10)),
          source: "Logistics Fuel",
          description: `Fuel Fill: ${String(log.vehicle ?? "Fleet Vehicle")} (${String(log.liters ?? 0)} Liters)`,
          category: "Fuel & Fleet Maintenance",
          amount: Number(log.total ?? 0),
          paidBy: String(log.notes ? `Receipt: ${log.notes}` : "Site Supervisor"),
          status: "Approved",
          raw: log,
        });
      } else if (tripType === "rental") {
        list.push({
          id: String(log.tripId ?? log.recordId ?? `rental-${idx}`),
          date: String(log.date ?? new Date().toISOString().slice(0, 10)),
          source: "Rental Transit",
          description: `Rental Auto: ${String(log.vendor ?? "Transport Operator")} (${String(log.material ?? "Transit")})`,
          category: "Rental Auto & Freight",
          amount: Number(log.total ?? 0),
          paidBy: "Site Supervisor",
          status: "Approved",
          raw: log,
        });
      }
    });

    // 4. Labour Debits & Daily Advances
    (labourQuery.data ?? []).forEach((worker) => {
      const workerName = String(worker.name ?? "Worker");
      const workerDeductions = Array.isArray(worker.deductions) ? worker.deductions : [];
      workerDeductions.forEach((ded: DomainRecord, idx: number) => {
        list.push({
          id: String(ded.deductionId ?? `ded-${worker.labourAttendanceId}-${idx}`),
          date: String(ded.date ?? new Date().toISOString().slice(0, 10)),
          source: "Labour Advance",
          description: `Labour Advance (${workerName}): ${String(ded.description ?? "Cash Advance")}`,
          category: String(ded.category ?? ded.expenseType ?? "Food & Mess Allowance"),
          amount: Number(ded.amount ?? 0),
          paidBy: "Site Supervisor",
          status: "Approved",
          raw: ded,
        });
      });
    });

    // Sort by Date Descending
    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expensesQuery.data, paymentsQuery.data, logisticsQuery.data, labourQuery.data]);

  // Apply Time Range, Source, and Text Search Filters
  const filteredExpenses = useMemo(() => {
    return combinedExpenses.filter((item) => {
      // 1. Time range filter
      if (timeRange === "week" && !isThisWeek(item.date)) return false;
      if (timeRange === "month" && !isThisMonth(item.date)) return false;

      // 2. Source filter
      if (sourceFilter !== "ALL" && item.source !== sourceFilter) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.paidBy.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.date.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [combinedExpenses, timeRange, sourceFilter, search]);

  // Metrics calculation
  const totalSpending = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + item.amount, 0),
    [filteredExpenses],
  );

  const vendorPaymentsTotal = useMemo(
    () =>
      filteredExpenses
        .filter((i) => i.source === "Vendor Payment")
        .reduce((sum, i) => sum + i.amount, 0),
    [filteredExpenses],
  );

  const logisticsTotal = useMemo(
    () =>
      filteredExpenses
        .filter((i) => i.source === "Logistics Fuel" || i.source === "Rental Transit")
        .reduce((sum, i) => sum + i.amount, 0),
    [filteredExpenses],
  );

  const labourAdvancesTotal = useMemo(
    () =>
      filteredExpenses
        .filter((i) => i.source === "Labour Advance")
        .reduce((sum, i) => sum + i.amount, 0),
    [filteredExpenses],
  );

  const isFetchingAny =
    expensesQuery.isFetching ||
    paymentsQuery.isFetching ||
    logisticsQuery.isFetching ||
    labourQuery.isFetching;

  const handleRefetch = () => {
    expensesQuery.refetch();
    paymentsQuery.refetch();
    logisticsQuery.refetch();
    labourQuery.refetch();
  };

  const handleExport = () => {
    const exportRows = filteredExpenses.map((e) => ({
      Date: e.date,
      "Expense Source": e.source,
      Description: e.description,
      Category: e.category,
      "Amount (INR)": e.amount,
      "Paid By / Ref": e.paidBy,
      Status: e.status,
    }));

    const label =
      timeRange === "week" ? "This_Week" : timeRange === "month" ? "This_Month" : "All_Time";
    exportToExcel(
      exportRows.length ? exportRows : [{ Note: "No expense records found" }],
      `Project_Expenses_${label}`,
      undefined,
      `Consolidated Project Expenses — ${label}`,
    );
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    createExpenseMutation.mutate();
  };

  const renderSourceBadge = (source: UnifiedExpense["source"]) => {
    if (source === "Vendor Payment") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 uppercase tracking-wider">
          <CreditCard className="size-3" /> Vendor Payment
        </span>
      );
    }
    if (source === "Logistics Fuel") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 border border-orange-500/20 uppercase tracking-wider">
          <Truck className="size-3" /> Fuel Fill
        </span>
      );
    }
    if (source === "Rental Transit") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
          <Truck className="size-3" /> Rental Transit
        </span>
      );
    }
    if (source === "Labour Advance") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wider">
          <Users className="size-3" /> Labour Advance
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase tracking-wider">
        <Zap className="size-3" /> Direct Expense
      </span>
    );
  };

  return (
    <section className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        title="Project Expenses & Expenditure Ledger"
        eyebrow="Consolidated Finance & Site Operations"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefetch}
              disabled={isFetchingAny}
              className="h-9 px-3 border border-border rounded-xl text-xs font-semibold hover:bg-secondary transition-colors flex items-center gap-1.5 bg-[color:var(--surface)] text-foreground shadow-sm"
            >
              <RotateCw className={`size-3.5 ${isFetchingAny ? "animate-spin text-primary" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="h-9 px-3 border border-border rounded-xl text-xs font-semibold hover:bg-secondary transition-colors flex items-center gap-1.5 bg-[color:var(--surface)] text-foreground shadow-sm"
            >
              <Download className="size-3.5" />
              Export
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-9 px-4 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="size-4" />
              Log Expense
            </button>
          </div>
        }
      />

      <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
        Unified project expenditure ledger mixing direct site expenses, vendor payments, fuel/rental logistics costs, and daily labour cash advances.
      </p>

      {/* Top 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Spending ({timeRange === "week" ? "This Week" : timeRange === "month" ? "This Month" : "All Time"})
            </div>
            <div className="text-2xl font-black text-foreground mt-0.5">
              ₹{totalSpending.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="size-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <Layers className="size-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Vendor Payments
            </div>
            <div className="text-2xl font-black text-purple-600 mt-0.5">
              ₹{vendorPaymentsTotal.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <CreditCard className="size-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Logistics & Fleet
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              ₹{logisticsTotal.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Truck className="size-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Labour Advances
            </div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">
              ₹{labourAdvancesTotal.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Users className="size-5" />
          </div>
        </div>
      </div>

      {/* Toolbar: Time Range Filter Buttons, Source Filter, and Search */}
      <div className="p-4 rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Time Range Filter Pill Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-secondary/40 rounded-xl border border-border/60">
          <button
            onClick={() => setTimeRange("week")}
            className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              timeRange === "week"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="size-3.5" /> This Week
          </button>
          <button
            onClick={() => setTimeRange("month")}
            className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              timeRange === "month"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="size-3.5" /> This Month
          </button>
          <button
            onClick={() => setTimeRange("all")}
            className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              timeRange === "all"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="size-3.5" /> All Time
          </button>
        </div>

        {/* Source Dropdown Filter and Search Input */}
        <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-9 px-3 text-xs border border-border rounded-xl bg-background font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
          >
            <option value="ALL">🍱 All Expense Sources</option>
            <option value="Vendor Payment">💳 Vendor Payments</option>
            <option value="Logistics Fuel">⛽ Logistics Fuel</option>
            <option value="Rental Transit">🚚 Rental Transit</option>
            <option value="Labour Advance">🍱 Labour Advances</option>
            <option value="Direct Expense">⚡ Direct Expenses</option>
          </select>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
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
        </div>
      </div>

      <div className="text-xs text-muted-foreground font-mono flex items-center justify-between px-1">
        <span>
          Showing <strong className="text-foreground">{filteredExpenses.length}</strong> of {combinedExpenses.length} total project entries
        </span>
        <span>
          Filter: <strong className="text-orange-600 uppercase font-bold">{timeRange}</strong>
        </span>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-border bg-[color:var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-secondary/40 border-b border-border text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">SOURCE MODULE</th>
                <th className="py-3 px-4">DESCRIPTION / DETAILS</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4">AMOUNT</th>
                <th className="py-3 px-4">PAID BY / REF</th>
                <th className="py-3 px-4 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                    {e.date}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">{renderSourceBadge(e.source)}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">{e.description}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{e.category}</td>
                  <td className="py-3.5 px-4 font-mono font-black text-foreground whitespace-nowrap text-sm">
                    ₹{e.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{e.paidBy}</td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}

              {!filteredExpenses.length && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="size-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 shadow-sm">
                        <Inbox className="size-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground">
                          {isFetchingAny
                            ? "Loading Consolidated Expenses..."
                            : "No Expense Records Found"}
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          {isFetchingAny
                            ? "Fetching latest entries from vendor payments, logistics, and site operations..."
                            : search || sourceFilter !== "ALL" || timeRange !== "all"
                            ? `No records match your selected filters (${timeRange.toUpperCase()} time range, ${sourceFilter} source). Try clearing filters.`
                            : "There are currently no items recorded under project expenses. Click the Log Expense button above to log a new record."}
                        </p>
                      </div>
                      {!isFetchingAny && (
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-2 h-9 px-4 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Plus className="size-4" /> Log New Expense
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

      {/* Log Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSubmit}
            className="bg-[color:var(--surface)] border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Log Direct Project Expense</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Description / Purpose <span className="text-orange-600 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tea & snacks for floor casting crew"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Category</label>
                <select
                  value={expCat}
                  onChange={(e) => setExpCat(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground font-semibold"
                >
                  <option value="Food & Mess">Food & Mess charges</option>
                  <option value="Site Supplies">Site Supplies</option>
                  <option value="Repairs">Repairs & Maintenance</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Amount (₹) <span className="text-orange-600 font-bold">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="500"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Date</label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Paid By <span className="text-orange-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar (PM)"
                  value={expPaidBy}
                  onChange={(e) => setExpPaidBy(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                disabled={createExpenseMutation.isPending}
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createExpenseMutation.isPending}
                className="h-10 px-5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:pointer-events-none shadow-sm"
              >
                {createExpenseMutation.isPending ? "Saving Expense..." : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
