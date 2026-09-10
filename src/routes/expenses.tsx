import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import { Wallet, Search, Filter, Plus, Receipt, IndianRupee, Clock, MoreHorizontal, Building2 } from "lucide-react";
import { useState } from "react";

import { useQuery, useQueries } from "@tanstack/react-query";
import { projectApi, financeApi } from "../lib/api";

export const Route = createFileRoute("/expenses")({
  component: GlobalExpensesPage,
});

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

function GlobalExpensesPage() {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");

  const { data: rawProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectApi.list(),
    retry: 1,
  });

  const expenseQueries = useQueries({
    queries: rawProjects.map((p) => ({
      queryKey: ["expenses", p.projectId],
      queryFn: () => financeApi.listExpenses(p.projectId),
      retry: 1,
    })),
  });

  const isLoading = projectsLoading || expenseQueries.some((q) => q.isLoading);

  const expenses = expenseQueries.flatMap((q, idx) => {
    const proj = rawProjects[idx];
    const data = q.data || [];
    return data.map((e) => ({
      id: e.expenseId || `EXP-${Math.random().toString(36).substr(2, 9)}`,
      project: proj.name,
      category: e.category,
      desc: e.description,
      amount: typeof e.amount === "number" ? `₹${e.amount.toLocaleString()}` : e.amount,
      amountRaw: typeof e.amount === "number" ? e.amount : parseFloat(String(e.amount).replace(/[^\d.]/g, "")) || 0,
      date: e.date || new Date().toISOString().split("T")[0],
      submittedBy: e.submittedBy || "Supervisor",
      status: e.status || "Pending",
    }));
  });

  const filteredExpenses = expenses.filter(exp => {
    const matchSearch = exp.desc.toLowerCase().includes(search.toLowerCase()) || exp.id.toLowerCase().includes(search.toLowerCase());
    const matchProj = projectFilter === "All" || exp.project === projectFilter;
    return matchSearch && matchProj;
  });

  const projectsList = ["All", ...rawProjects.map(p => p.name)];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Global Expenses"
        eyebrow="Company Finance"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="size-4" /> Add Corporate Expense
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Consolidated Spent" value={`₹${expenses.reduce((sum, e) => sum + e.amountRaw, 0).toLocaleString()}`} icon={<IndianRupee className="size-5" />} color="bg-emerald-500/10 text-emerald-600" />
        <MetricCard label="Pending Global Approvals" value={`₹${expenses.filter(e => e.status === "Pending").reduce((sum, e) => sum + e.amountRaw, 0).toLocaleString()}`} icon={<Clock className="size-5" />} color="bg-amber-500/10 text-amber-600" />
        <MetricCard label="Active Cost Centers" value={rawProjects.length} icon={<Building2 className="size-5" />} color="bg-blue-500/10 text-blue-600" />
      </div>

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search all expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full sm:w-auto h-9 pl-9 pr-8 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50 appearance-none"
              >
                {projectsList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium">Expense Details</th>
                <th className="px-6 py-4 font-medium">Project / Branch</th>
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
                  <td className="px-6 py-4 font-medium text-foreground">
                    {exp.project}
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
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No corporate expenses found matching the criteria.
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
