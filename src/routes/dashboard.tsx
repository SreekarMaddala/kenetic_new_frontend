/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Building2,
  IndianRupee,
  FileCheck2,
  AlertTriangle,
  TrendingUp,
  Check,
  X,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { dashboardApi, projectApi, api, type DomainRecord } from "../lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Kinetic" },
      {
        name: "description",
        content:
          "Kinetic construction operations control center. Track projects, budgets, materials, and approvals.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const inventory = useQuery({
    queryKey: ["ledger", "/inventory"],
    queryFn: () => api.get<DomainRecord[]>("/inventory"),
  });
  const stockAlerts = (inventory.data ?? [])
    .filter((i) => Number(i.centralStock ?? 0) < Number(i.reorderLevel ?? 0))
    .map((i) => ({
      name: String(i.name),
      site: "Central warehouse",
      stock: Number(i.centralStock),
      reorder: Number(i.reorderLevel),
    }));

  // Fetch real analytics from backend
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: () => dashboardApi.analytics(),
    retry: 1,
  });

  // Fetch projects for budget chart
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectApi.list(),
    retry: 1,
  });

  // Build chart data from real projects
  const projectsData =
    projects && projects.length > 0
      ? projects.slice(0, 6).map((p) => ({
          name: p.name.length > 18 ? p.name.slice(0, 15) + "…" : p.name,
          Budget: Number((p.budget / 10_000_000).toFixed(1)), // convert to Cr
          Spent: Number((p.spent / 10_000_000).toFixed(1)),
        }))
      : [];

  const activeProjectsCount =
    analytics?.activeProjects ?? projects?.filter((p) => p.status === "Active").length ?? 0;
  const totalBudgetVal = projects
    ? `₹${(projects.reduce((s, p) => s + (p.budget ?? 0), 0) / 10_000_000).toFixed(2)} Cr`
    : "₹0.00 Cr";
  const totalSpentVal = projects
    ? `₹${(projects.reduce((s, p) => s + (p.spent ?? 0), 0) / 10_000_000).toFixed(2)} Cr`
    : "₹0.00 Cr";
  const approvals = (analytics?.approvals ?? []).map((r) => {
    const resource = String(r.resource);
    const id = String(r[resource + "Id"]);
    const endpoint =
      resource === "material"
        ? `/supervisor/materials/indents/${id}?projectId=${r.projectId}`
        : resource === "dpr"
          ? `/supervisor/dpr/${id}?projectId=${r.projectId}`
          : r.projectId
            ? `/projects/${r.projectId}/${resource}s/${id}`
            : `/${resource}s/${id}`;
    return {
      id,
      endpoint,
      type: resource,
      title: String(
        r.description ??
          r.billNumber ??
          r.vendorName ??
          r.materialName ??
          r.summary ??
          r.name ??
          resource,
      ),
      project: String(r.projectId ?? "Company"),
      raisedBy: String(r.createdBy ?? ""),
      age: String(r.createdAt ?? ""),
      amount: Number(r.amount ?? r.grossAmount ?? 0).toLocaleString("en-IN"),
      priority: "medium",
    };
  });
  const pendingApprovalsCount = analytics?.pendingApprovals ?? approvals.length;

  const recentInvoices: any[] = [];

  const approvalMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const row = approvals.find((a) => a.id === id);
      if (!row) throw new Error("Refresh the approval queue.");
      return api.patch(row.endpoint, {
        status: row.type === "material" ? status.toLowerCase() : status,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Review saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const handleApprove = (id: string, _title: string) =>
    approvalMutation.mutate({ id, status: "Approved" });
  const handleReject = (id: string, _title: string) =>
    approvalMutation.mutate({ id, status: "Rejected" });

  const handleReorder = (_itemName: string) => navigate({ to: "/inventory" });

  if (analyticsLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
      {/* Header */}
      <PageHeader
        eyebrow="Command Center"
        title="Operations Control"
        actions={
          <div className="flex gap-2">
            <Link
              to="/projects"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-secondary transition-colors"
            >
              View Projects
            </Link>
            <Link
              to={"/expenses" as any}
              className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:bg-zinc-800 transition-colors"
            >
              Review Approvals
            </Link>
          </div>
        }
      />

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border border-border bg-[color:var(--surface)] hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              Active Projects
            </CardTitle>
            <Building2 className="size-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">{activeProjectsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-accent font-medium">100% on schedule</span> across India
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-[color:var(--surface)] hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              Budget Managed
            </CardTitle>
            <IndianRupee className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">{totalBudgetVal}</div>
            <div className="mt-1.5 flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                <span>Spent: {totalSpentVal}</span>
                <span>59.2%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: "59.2%" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-[color:var(--surface)] hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              Workflow Tasks
            </CardTitle>
            <FileCheck2 className="size-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">{pendingApprovalsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-primary font-medium">{approvals.length} critical</span> items
              await sign-off
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-[color:var(--surface)] hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              Material Alerts
            </CardTitle>
            <AlertTriangle className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">{stockAlerts.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-yellow-600 font-medium">Stock running low</span> at 2 sites
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Dashboard grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Chart (8 cols) */}
        <Card className="lg:col-span-8 border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="font-display font-semibold text-lg">
                Portfolio Budget vs Spent
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Financial comparison across all active project sites (in ₹ Crores)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded border border-border bg-secondary text-[11px] font-mono text-muted-foreground">
              <TrendingUp className="size-3.5 text-accent" />
              <span>OVERALL SPENT: 59.2%</span>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectsData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="Cr"
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                  contentStyle={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                  labelStyle={{
                    fontWeight: "bold",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                  }}
                  itemStyle={{ fontSize: 12 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="Budget"
                  fill="hsl(22 90% 48% / 0.15)"
                  stroke="hsl(22 90% 48%)"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="Spent" fill="hsl(158 64% 32% / 0.85)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right Side: Stock alerts (4 cols) */}
        <Card className="lg:col-span-4 border border-border bg-[color:var(--surface)] shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-border">
              <CardTitle className="font-display font-semibold text-lg flex items-center justify-between">
                <span>Material Alert Logs</span>
                <span className="text-[10px] font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                  LOW STOCK
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Stock ledger status requiring action to avoid pour blockages
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {stockAlerts.length > 0 ? (
                stockAlerts.map((item) => (
                  <div
                    key={item.name}
                    className="p-4 flex items-start justify-between gap-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-semibold">{item.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.site}</p>
                      <div className="flex gap-3 text-[10px] font-mono text-muted-foreground mt-2">
                        <span>
                          Stock: <strong className="text-foreground">{item.stock}</strong>
                        </span>
                        <span>Reorder: {item.reorder}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleReorder(item.name)}
                      className="px-2.5 py-1 text-[10px] font-medium border border-primary/20 hover:border-primary text-primary bg-primary/5 hover:bg-primary/10 rounded transition-all shrink-0"
                    >
                      Review stock
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <span className="size-8 rounded bg-accent/15 grid place-items-center text-accent font-bold">
                    ✓
                  </span>
                  <p>No low-stock alerts for configured reorder levels.</p>
                </div>
              )}
            </CardContent>
          </div>
          <CardHeader className="border-t border-border p-4 bg-secondary/20">
            <Link
              to={"/inventory" as any}
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors flex items-center justify-center gap-1 w-full"
            >
              Open Material Ledger <ChevronRight className="size-3.5" />
            </Link>
          </CardHeader>
        </Card>
      </div>

      {/* ── Sub-level grid: Approvals & Invoices ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Critical Approvals (7 cols) */}
        <Card className="lg:col-span-7 border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display font-semibold text-lg">
                  Action Needed: Approvals
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  High & medium priority transactions pending project head authorization
                </CardDescription>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {approvals.length} PENDING
              </span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {approvals.length > 0 ? (
              approvals.map((app) => (
                <div
                  key={app.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-secondary/10 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`size-1.5 rounded-full shrink-0 ${app.priority === "high" ? "bg-primary" : "bg-yellow-500"}`}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        {app.id} · {app.type}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold truncate leading-tight">{app.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {app.project} · {app.raisedBy} ·{" "}
                      <span className="font-mono">{app.age} ago</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs font-semibold">{app.amount}</span>
                    <div className="flex gap-1.5">
                      <button
                        disabled={approvalMutation.isPending}
                        onClick={() => handleReject(app.id, app.title)}
                        className="size-8 grid place-items-center border border-border hover:border-destructive text-muted-foreground hover:text-destructive rounded transition-colors"
                        title="Reject"
                      >
                        <X className="size-4" />
                      </button>
                      <button
                        disabled={approvalMutation.isPending}
                        onClick={() => handleApprove(app.id, app.title)}
                        className="size-8 grid place-items-center bg-accent text-accent-foreground hover:bg-accent/90 rounded transition-colors"
                        title="Approve"
                      >
                        <Check className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <span className="size-10 rounded-full bg-accent/15 grid place-items-center text-accent text-sm font-bold">
                  ✓
                </span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">No pending reviews</h4>
                  <p className="mt-1">No submissions are awaiting review.</p>
                </div>
              </div>
            )}
          </CardContent>
          {approvals.length > 0 && (
            <CardHeader className="border-t border-border p-4 text-center">
              <Link
                to={"/expenses" as any}
                className="text-xs font-medium text-accent hover:text-accent/80 transition-colors flex items-center justify-center gap-1"
              >
                Go to Approval Center <ChevronRight className="size-3.5" />
              </Link>
            </CardHeader>
          )}
        </Card>

        {/* Right Side: AI Invoices Extraction (5 cols) */}
        <Card className="lg:col-span-5 border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-display font-semibold text-lg flex items-center justify-between">
              <span>AI Bill Extraction logs</span>
              <span className="text-[10px] font-mono text-accent px-2 py-0.5 bg-accent/10 rounded">
                98% ACCURACY
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Automated invoice parsing and ledger uploads
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {recentInvoices.map((inv) => (
              <div
                key={inv.invoice}
                className="p-4 flex items-center justify-between gap-3 hover:bg-secondary/20 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold truncate">{inv.vendor}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    Inv: {inv.invoice} · Conf: <strong className="text-accent">{inv.conf}</strong>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-semibold block">{inv.amount}</span>
                  <span
                    className={`inline-block text-[9px] font-mono mt-1 px-1.5 py-0.5 rounded ${
                      inv.status === "AI Verified"
                        ? "bg-accent/10 text-accent"
                        : "bg-yellow-500/10 text-yellow-700"
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
          <CardHeader className="border-t border-border p-4 bg-secondary/20">
            <Link
              to={"/expenses" as any}
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors flex items-center justify-center gap-1 w-full"
            >
              Verify Invoices <ChevronRight className="size-3.5" />
            </Link>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
