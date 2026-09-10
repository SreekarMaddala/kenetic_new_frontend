import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { Wallet, Search, Filter, Plus, Receipt, IndianRupee, TrendingUp, MoreHorizontal, Clock } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/projects/$projectId/expenses")({
  component: ExpensesPage,
});

const EXPENSES_DATA = [
  { id: "EXP-1045", category: "Petty Cash", desc: "Site office tea/snacks", amount: "₹4,500", date: "16 Jul 2026", submittedBy: "Amit Mishra", status: "Approved" },
  { id: "EXP-1044", category: "Logistics", desc: "Emergency diesel for generator", amount: "₹18,200", date: "15 Jul 2026", submittedBy: "Rajesh Kumar", status: "Paid" },
  { id: "EXP-1043", category: "Materials", desc: "Local hardware purchase (screws/nails)", amount: "₹3,450", date: "14 Jul 2026", submittedBy: "Amit Mishra", status: "Pending" },
  { id: "EXP-1042", category: "Overheads", desc: "Internet & electricity bill for site office", amount: "₹12,000", date: "10 Jul 2026", submittedBy: "Priya Sharma", status: "Paid" },
  { id: "EXP-1041", category: "Travel", desc: "Taxi fare for architect site visit", amount: "₹1,200", date: "05 Jul 2026", submittedBy: "Amit Mishra", status: "Approved" },
];

function MetricCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`p-4 rounded-xl border border-border bg-[color:var(--surface)] flex items-center gap-4`}>
      <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-foreground">{value}</div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function ExpensesPage() {
  const { projectId } = Route.useParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filteredExpenses = EXPENSES_DATA.filter(exp => {
    const matchSearch = exp.desc.toLowerCase().includes(search.toLowerCase()) || exp.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || exp.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = ["All", ...Array.from(new Set(EXPENSES_DATA.map(e => e.category)))];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Weekly Site Expenses"
        eyebrow="Finance & Overheads"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="size-4" /> Add Expense
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Spent (This Month)" value="₹39,350" icon={<IndianRupee className="size-5" />} color="bg-emerald-500/10 text-emerald-600" />
        <MetricCard label="Pending Approval" value="₹3,450" icon={<Clock className="size-5" />} color="bg-amber-500/10 text-amber-600" />
        <MetricCard label="Petty Cash Balance" value="₹10,650" icon={<Wallet className="size-5" />} color="bg-blue-500/10 text-blue-600" />
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
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary text-muted-foreground shrink-0 border border-border/50">
                        <Receipt className="size-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground line-clamp-1">{exp.desc}</div>
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{exp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-secondary text-muted-foreground">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground">
                    {exp.submittedBy}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {exp.date}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-foreground text-right">
                    {exp.amount}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      exp.status === "Paid" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                      exp.status === "Approved" ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                      "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                    }`}>
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
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No expenses found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
