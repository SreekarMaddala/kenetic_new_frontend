import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import {
  Wallet,
  Search,
  Filter,
  Plus,
  Receipt,
  IndianRupee,
  MoreHorizontal,
  Clock,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi, type Expense } from "../../../lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$projectId/expenses")({
  head: () => ({
    meta: [
      { title: "Site Expenses — Kinetic" },
      {
        name: "description",
        content: "Project expense claims, petty cash, and overheads.",
      },
    ],
  }),
  component: ExpensesPage,
});

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className={`p-4 rounded-xl border border-border bg-[color:var(--surface)] flex items-center gap-4`}
    >
      <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-display font-bold text-foreground">{value}</div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

function ExpensesPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [newCategory, setNewCategory] = useState("Petty Cash");
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", projectId],
    queryFn: () => financeApi.listExpenses(projectId),
    enabled: !!projectId,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (body: Parameters<typeof financeApi.createExpense>[1]) =>
      financeApi.createExpense(projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", projectId] });
      toast.success("Expense submitted.");
      setShowModal(false);
      setNewDesc("");
      setNewAmount("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredExpenses = expenses.filter((exp: Expense) => {
    const matchSearch =
      (exp.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (exp.expenseId ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || exp.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = ["All", ...Array.from(new Set(expenses.map((e: Expense) => e.category)))];
  const totalSpent = expenses.reduce((s: number, e: Expense) => s + e.amount, 0);
  const totalPending = expenses
    .filter((e: Expense) => e.status === "Pending")
    .reduce((s: number, e: Expense) => s + e.amount, 0);

  const inputCls =
    "w-full h-10 px-3 border border-border rounded-lg bg-[color:var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Weekly Site Expenses"
        eyebrow="Finance & Overheads"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="size-4" /> Add Expense
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Total Expenses (This Project)"
          value={fmt(totalSpent)}
          icon={<IndianRupee className="size-5" />}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <MetricCard
          label="Pending Approval"
          value={fmt(totalPending)}
          icon={<Clock className="size-5" />}
          color="bg-amber-500/10 text-amber-600"
        />
        <MetricCard
          label="Total Entries"
          value={expenses.length}
          icon={<Wallet className="size-5" />}
          color="bg-blue-500/10 text-blue-600"
        />
      </div>

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto h-9 pl-9 pr-8 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50 appearance-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium">Expense Details</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Submitted By</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Loading expenses…
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredExpenses.map((exp: Expense) => (
                  <tr key={exp.expenseId} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary text-muted-foreground shrink-0 border border-border/50">
                          <Receipt className="size-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground line-clamp-1">
                            {exp.description}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                            {exp.expenseId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-secondary text-muted-foreground">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-foreground">
                      {exp.submittedBy ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {exp.date ?? exp.createdAt?.split("T")[0] ?? "—"}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-foreground text-right">
                      {fmt(exp.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          exp.status === "Paid"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : exp.status === "Approved"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md opacity-0 group-hover:opacity-100 transition-all">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              {!isLoading && filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No expenses found for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[color:var(--surface)] w-full max-w-md rounded-2xl shadow-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg">Submit Expense</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="size-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newDesc || !newAmount) {
                  toast.error("Please fill in description and amount.");
                  return;
                }
                createMutation.mutate({
                  category: newCategory,
                  description: newDesc,
                  amount: parseFloat(newAmount),
                  date: newDate,
                  projectId,
                });
              }}
            >
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={inputCls}
                >
                  {["Petty Cash", "Logistics", "Materials", "Travel", "Overheads", "Other"].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">
                  Description
                </label>
                <input
                  className={inputCls}
                  placeholder="What was this expense for?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  placeholder="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full h-10 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createMutation.isPending ? "Submitting…" : "Submit Expense"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
