import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  FileDown,
  X,
  TrendingDown,
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import { exportToExcel } from "../../../lib/excel";
import { useProject } from "../../../lib/ProjectContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi, type Bill, type Expense } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/payments")({
  head: () => ({
    meta: [
      { title: "Payments & Expenses — Kinetic" },
      {
        name: "description",
        content: "Payment vouchers, expense claims, and project-wise running balance.",
      },
    ],
  }),
  component: PaymentsPage,
});

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
type PayMode = "NEFT" | "RTGS" | "Cheque" | "Cash" | "UPI";
type VoucherType = "Payment" | "Expense";
type VStatus = "Approved" | "Pending" | "Rejected";

interface Voucher {
  id: string;
  vNo: string;
  date: string;
  type: VoucherType;
  payee: string;
  project: string;
  category: string;
  amount: number;
  mode: PayMode;
  status: VStatus;
  reference: string;
  remarks: string;
}

const MODE_COLOR: Record<PayMode, string> = {
  NEFT: "hsl(210,80%,58%)",
  RTGS: "hsl(280,65%,60%)",
  Cheque: "hsl(40,90%,52%)",
  Cash: "hsl(22,90%,48%)",
  UPI: "hsl(158,64%,42%)",
};

export function PaymentsPage() {
  const { projectId } = Route.useParams();
  const { project } = useProject();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"vouchers" | "summary">("vouchers");
  const [filterType, setFilterType] = useState<VoucherType | "All">("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>("All");

  // Form state for new voucher
  const [newType, setNewType] = useState<VoucherType>("Payment");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPayee, setNewPayee] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newMode, setNewMode] = useState<PayMode>("NEFT");
  const [newRemarks, setNewRemarks] = useState("");

  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ["bills", projectId],
    queryFn: () => financeApi.listBills(projectId),
    enabled: !!projectId,
    retry: 1,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["payments-expenses", projectId],
    queryFn: () => financeApi.listExpenses(projectId),
    enabled: !!projectId,
    retry: 1,
  });

  const createBillMutation = useMutation({
    mutationFn: (body: Parameters<typeof financeApi.createBill>[1]) =>
      financeApi.createBill(projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills", projectId] });
      toast.success("Voucher created & sent for approval");
      setShowModal(false);
      setNewPayee("");
      setNewAmount("");
      setNewRemarks("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Combine bills + expenses into a unified Voucher[] display shape
  const VOUCHERS: Voucher[] = [
    ...bills.map((b: Bill, idx: number): Voucher => ({
      id: b.billId,
      vNo: b.billNumber ?? `PV-${String(idx + 1).padStart(4, "0")}`,
      date: b.date ?? b.createdAt?.split("T")[0] ?? "—",
      type: "Payment",
      payee: b.clientOrContractor,
      project: project?.name ?? projectId,
      category: b.type ?? "Bill",
      amount: b.netPayable ?? b.grossAmount,
      mode: "NEFT",
      status: (b.status as VStatus) ?? "Pending",
      reference: b.billNumber ?? "",
      remarks: "",
    })),
    ...expenses.map((e: Expense, idx: number): Voucher => ({
      id: e.expenseId ?? `EXP-${idx}`,
      vNo: e.expenseId ?? `EV-${String(idx + 1).padStart(4, "0")}`,
      date: e.date ?? e.createdAt?.split("T")[0] ?? "—",
      type: "Expense",
      payee: e.submittedBy ?? "—",
      project: project?.name ?? projectId,
      category: e.category,
      amount: e.amount,
      mode: "Cash",
      status: (e.status as VStatus) ?? "Pending",
      reference: "",
      remarks: e.description,
    })),
  ].sort((a, b) => (a.date > b.date ? -1 : 1));

  const isLoading = billsLoading || expensesLoading;

  const allVendors = Array.from(new Set(VOUCHERS.map((v) => v.payee)));
  const globalFilteredVouchers = VOUCHERS.filter(
    (v) => selectedVendor === "All" || v.payee === selectedVendor,
  );

  const filtered = globalFilteredVouchers.filter(
    (v) => filterType === "All" || v.type === filterType,
  );
  const totalPayments = globalFilteredVouchers
    .filter((v) => v.type === "Payment")
    .reduce((s, v) => s + v.amount, 0);
  const totalExpenses = globalFilteredVouchers
    .filter((v) => v.type === "Expense")
    .reduce((s, v) => s + v.amount, 0);
  const pending = globalFilteredVouchers
    .filter((v) => v.status === "Pending")
    .reduce((s, v) => s + v.amount, 0);

  const projectSummary = project
    ? [
        {
          project: project.name,
          payments: globalFilteredVouchers
            .filter((v) => v.status === "Approved")
            .reduce((s, v) => s + v.amount, 0),
        },
      ]
    : [];

  const inputCls =
    "w-full h-10 px-3 border border-border rounded-lg bg-[color:var(--surface)] text-sm focus:ring-1 focus:ring-primary outline-none transition-shadow";

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Finance"
        title="Payments & Expenses"
        actions={
          <div className="flex gap-3">
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="h-10 px-3 border border-border rounded-lg bg-background text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="All">All Vendors</option>
              {allVendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                exportToExcel(
                  filtered.map((v) => ({
                    "Voucher No": v.vNo,
                    Date: v.date,
                    Type: v.type,
                    Payee: v.payee,
                    Project: v.project,
                    Category: v.category,
                    "Amount (₹)": v.amount,
                    Mode: v.mode,
                    Status: v.status,
                    Reference: v.reference,
                  })),
                  `Kinetic_Payments_${project?.name ?? projectId}`,
                  undefined,
                  "Payments & Expenses",
                );
                toast.success("Exported to Excel");
              }}
              className="h-10 px-4 border border-border bg-background rounded-lg text-xs font-semibold hover:bg-secondary flex items-center gap-2 transition-colors"
            >
              <FileDown className="size-4" /> Export Excel
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="h-10 px-5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-2 transition-all shadow-sm"
            >
              <Plus className="size-4" /> New Voucher
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Payments",
            value: fmt(totalPayments),
            color: "from-blue-500/10 to-indigo-500/5",
            border: "border-blue-500/20 dark:border-blue-500/10",
            textColor: "text-blue-600 dark:text-blue-400",
            iconColor: "text-blue-500 bg-blue-500/10",
            icon: <TrendingDown className="size-5" />,
          },
          {
            label: "Total Expenses",
            value: fmt(totalExpenses),
            color: "from-orange-500/10 to-amber-500/5",
            border: "border-orange-500/20 dark:border-orange-500/10",
            textColor: "text-orange-600 dark:text-orange-400",
            iconColor: "text-orange-500 bg-orange-500/10",
            icon: <Receipt className="size-5" />,
          },
          {
            label: "Pending Approval",
            value: fmt(pending),
            color: "from-yellow-500/10 to-amber-500/5",
            border: "border-yellow-500/20 dark:border-yellow-500/10",
            textColor: "text-yellow-600 dark:text-yellow-400",
            iconColor: "text-yellow-500 bg-yellow-500/10",
            icon: <Clock className="size-5" />,
          },
          {
            label: "Vouchers This Month",
            value: globalFilteredVouchers.length,
            color: "from-emerald-500/10 to-teal-500/5",
            border: "border-emerald-500/20 dark:border-emerald-500/10",
            textColor: "text-emerald-600 dark:text-emerald-400",
            iconColor: "text-emerald-500 bg-emerald-500/10",
            icon: <TrendingUp className="size-5" />,
          },
        ].map((k, i) => (
          <div
            key={k.label}
            className={`relative bg-gradient-to-br ${k.color} border ${k.border} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 animate-fade-up group`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-4 -mt-4 transition-all group-hover:scale-125 pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                {k.label}
              </span>
              <span
                className={`size-10 rounded-xl flex items-center justify-center ${k.iconColor} transition-transform duration-300 group-hover:scale-110 shadow-sm shrink-0`}
              >
                {k.icon}
              </span>
            </div>
            <div className={`text-2xl font-display font-bold tracking-tight ${k.textColor}`}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/60 backdrop-blur-sm rounded-xl p-1 w-fit border border-border shadow-inner">
        {(["vouchers", "summary"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              tab === t
                ? "bg-[color:var(--surface)] border border-border shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            {t === "vouchers" ? (
              <>
                <Receipt className="size-4 text-primary" /> Vouchers Ledger
              </>
            ) : (
              <>
                <Building2 className="size-4 text-primary" /> Project Summary
              </>
            )}
          </button>
        ))}
      </div>

      {tab === "vouchers" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex gap-2 bg-secondary/25 p-1 rounded-xl w-fit border border-border/40">
            {(["All", "Payment", "Expense"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterType(s as VoucherType | "All")}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${
                  filterType === s
                    ? "bg-foreground text-background shadow-md scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/55"
                }`}
              >
                {s}s
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Loading vouchers…
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((v) => {
              const accentColor =
                v.type === "Payment"
                  ? "border-l-4 border-l-blue-500"
                  : "border-l-4 border-l-orange-500";
              const typeLabelColor =
                v.type === "Payment"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-orange-500/10 text-orange-600 dark:text-orange-400";
              const statusColors: Record<VStatus, string> = {
                Approved:
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                Pending:
                  "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 animate-pulse",
                Rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
              };
              const statusIcons: Record<VStatus, React.ReactNode> = {
                Approved: <CheckCircle2 className="size-3.5 shrink-0" />,
                Pending: <Clock className="size-3.5 shrink-0" />,
                Rejected: <XCircle className="size-3.5 shrink-0" />,
              };

              return (
                <div
                  key={v.id}
                  className={`bg-[color:var(--surface)] border border-border rounded-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all duration-300 ${accentColor} group hover:border-border-hover`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${typeLabelColor} shadow-sm group-hover:scale-105 transition-transform`}
                    >
                      {v.type === "Payment" ? (
                        <CreditCard className="size-4" />
                      ) : (
                        <Receipt className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9px] bg-secondary px-2 py-0.5 rounded text-muted-foreground font-semibold uppercase">
                          {v.vNo}
                        </span>
                        <span className="font-bold text-sm text-foreground truncate">
                          {v.payee}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${statusColors[v.status]} flex items-center gap-1 w-fit`}
                        >
                          {statusIcons[v.status]}
                          {v.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2 gap-y-1">
                        <span className="font-semibold text-foreground">{v.project}</span>
                        <span>·</span>
                        <span>{v.category}</span>
                        <span>·</span>
                        <span className="font-mono">{v.date}</span>
                        {v.remarks && (
                          <>
                            <span>·</span>
                            <span
                              className="italic text-[11px] truncate max-w-[280px]"
                              title={v.remarks}
                            >
                              &ldquo;{v.remarks}&rdquo;
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-border/45 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider"
                        style={{
                          color: MODE_COLOR[v.mode],
                          background: `${MODE_COLOR[v.mode]}12`,
                          border: `1px solid ${MODE_COLOR[v.mode]}25`,
                        }}
                      >
                        {v.mode}
                      </span>
                      {v.reference && (
                        <span className="text-[9px] text-muted-foreground font-mono bg-secondary/40 px-2 py-0.5 rounded border border-border/50">
                          {v.reference}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono font-bold text-base text-foreground">
                          {fmt(v.amount)}
                        </div>
                      </div>

                      {v.status === "Pending" && (
                        <button
                          onClick={() => toast.success(`${v.vNo} approved`)}
                          className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1"
                        >
                          <CheckCircle2 className="size-3.5" /> Approve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!isLoading && filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No vouchers found for this project.
            </div>
          )}
        </div>
      )}

      {tab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
          {projectSummary.map((p) => {
            const total = totalPayments + totalExpenses;
            const pct = total > 0 ? Math.round((p.payments / total) * 100) : 0;
            const projectVouchers = globalFilteredVouchers.filter((v) => v.project === p.project);

            return (
              <div
                key={p.project}
                className="bg-[color:var(--surface)] border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col hover:border-border-hover group"
              >
                {/* Visual Header */}
                <div className="relative h-28 w-full overflow-hidden shrink-0 bg-gradient-to-br from-primary/20 to-primary/5">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute bottom-4 left-5 text-white">
                    <h3 className="font-display font-semibold text-lg drop-shadow-md">
                      {p.project}
                    </h3>
                    <p className="text-[10px] text-zinc-350 font-mono tracking-wide uppercase drop-shadow-sm">
                      Project Disbursement Node
                    </p>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded text-white text-[10px] font-mono border border-white/10">
                    Vouchers: {projectVouchers.length}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      Approved Disbursements
                    </span>
                    <strong className="text-2xl font-display font-bold text-primary">
                      {fmt(p.payments)}
                    </strong>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-2 text-xs">
                      <span className="text-muted-foreground font-semibold">
                        Disbursement Progress Share
                      </span>
                      <span className="font-mono font-bold text-primary">{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden shadow-inner border border-border/10">
                      <div
                        className="h-full bg-gradient-to-r from-primary via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50 text-xs">
                    <div>
                      <dt className="text-muted-foreground uppercase tracking-wider text-[10px] font-mono">
                        Last Billing Activity
                      </dt>
                      <dd className="font-semibold mt-0.5 text-foreground">
                        {projectVouchers[0]?.date || "No activity"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground uppercase tracking-wider text-[10px] font-mono">
                        Principal Payee Node
                      </dt>
                      <dd
                        className="font-semibold mt-0.5 text-foreground truncate"
                        title={projectVouchers[0]?.payee}
                      >
                        {projectVouchers[0]?.payee || "—"}
                      </dd>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {projectSummary.length === 0 && (
            <div className="col-span-2 py-12 text-center text-muted-foreground text-sm">
              No payment data available for this project.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[color:var(--surface)] border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-zoom-in overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-emerald-400" />
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                <Plus className="size-5 text-primary" /> Create Payment Voucher
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="size-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Voucher Type
                  </label>
                  <select
                    className={inputCls}
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as VoucherType)}
                  >
                    <option value="Payment">Payment</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Payee / Vendor *
                </label>
                <input
                  className={inputCls}
                  placeholder="Enter payee or vendor name"
                  value={newPayee}
                  onChange={(e) => setNewPayee(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    className={inputCls}
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as PayMode)}
                  >
                    {(["NEFT", "RTGS", "Cheque", "Cash", "UPI"] as PayMode[]).map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Remarks / Details
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-[color:var(--surface)] text-sm resize-none focus:ring-1 focus:ring-primary outline-none transition-shadow"
                  placeholder="Invoice ref, bill number, work order allocation..."
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-11 border border-border rounded-lg text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newPayee || !newAmount) {
                    toast.error("Payee and Amount are required.");
                    return;
                  }
                  createBillMutation.mutate({
                    billNumber: `PV-${Date.now()}`,
                    clientOrContractor: newPayee,
                    grossAmount: parseFloat(newAmount),
                    netPayable: parseFloat(newAmount),
                    type: newType,
                    date: newDate,
                  });
                }}
                disabled={createBillMutation.isPending}
                className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createBillMutation.isPending ? "Creating…" : "Create Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
