import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import {
  Download,
  FileText,
  Filter,
  CalendarDays,
  LineChart,
  PieChart,
  RefreshCcw,
  Boxes,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { reportsApi, projectApi, vendorApi, inventoryApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { exportToExcel } from "../lib/excel";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: execReport,
    refetch: refetchExec,
    isFetching: isFetchingExec,
  } = useQuery({
    queryKey: ["executive-report"],
    queryFn: () => reportsApi.executive(),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectApi.list(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => vendorApi.list(),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.list(),
  });

  const handleSyncData = () => {
    queryClient.invalidateQueries();
    refetchExec();
  };

  const authorName = user?.name || user?.email?.split("@")[0] || "Operations Admin";
  const generatedTime = execReport?.generatedAt
    ? new Date(execReport.generatedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const dynamicReports = [
    {
      id: "REP-FIN",
      name: "Executive Financial & P&L Overview",
      type: "Financial",
      date: generatedTime,
      author: authorName,
      downloadFn: () => {
        const rows = (execReport?.projectSummaries || projects).map((p) => ({
          "Project ID": p.projectId,
          "Project Name": p.name,
          "Budget (INR)": p.budget,
          "Spent (INR)": p.spent,
          "Variance / Margin (INR)": (p.budget ?? 0) - (p.spent ?? 0),
          Status: p.status,
        }));
        exportToExcel(
          rows.length ? rows : [{ Note: "No project financial records available" }],
          "Consolidated_Financial_Report",
          undefined,
          "Executive Financial Overview"
        );
      },
    },
    {
      id: "REP-PROJ",
      name: "Global Projects & Operations Summary",
      type: "Operations",
      date: generatedTime,
      author: authorName,
      downloadFn: () => {
        const rows = projects.map((p) => ({
          "Project ID": p.projectId,
          "Project Name": p.name,
          Location: p.location,
          Status: p.status,
          "Start Date": p.startDate,
          "End Date": p.endDate,
          "Budget (INR)": p.budget,
          "Spent (INR)": p.spent,
        }));
        exportToExcel(
          rows.length ? rows : [{ Note: "No project records available" }],
          "Projects_Operations_Summary",
          undefined,
          "Global Projects & Operations Summary"
        );
      },
    },
    {
      id: "REP-VEND",
      name: "Vendor Performance & Contract Matrix",
      type: "Vendors",
      date: generatedTime,
      author: authorName,
      downloadFn: () => {
        const rows = vendors.map((v) => ({
          "Vendor ID": v.vendorId,
          "Vendor Name": v.name,
          Category: v.type,
          Status: v.status,
          Rating: v.rating ?? "N/A",
          Email: v.email,
          Phone: v.phone,
          "Active Contracts": v.activeContracts ?? 0,
        }));
        exportToExcel(
          rows.length ? rows : [{ Note: "No vendor records available" }],
          "Vendor_Performance_Report",
          undefined,
          "Vendor Performance & Contract Matrix"
        );
      },
    },
    {
      id: "REP-INV",
      name: "Global Equipment & Inventory Utilization",
      type: "Assets",
      date: generatedTime,
      author: authorName,
      downloadFn: () => {
        const rows = inventory.map((i) => ({
          "Item ID": i.itemId,
          "Item Name": i.name,
          Category: i.category,
          "Total Stock": i.totalStock,
          Unit: i.unit || "units",
          Status: i.status,
        }));
        exportToExcel(
          rows.length ? rows : [{ Note: "No inventory items available" }],
          "Inventory_Utilization_Report",
          undefined,
          "Global Equipment & Inventory Utilization"
        );
      },
    },
  ];

  const REPORT_TYPES = [
    {
      id: "RT1",
      name: "Company Financial Overview",
      desc: `Consolidated P&L across ${projects.length} active project(s). Total spend ₹${(
        execReport?.totalExpenses ?? projects.reduce((acc, p) => acc + (p.spent || 0), 0)
      ).toLocaleString("en-IN")}.`,
      icon: <LineChart className="size-5 text-emerald-600" />,
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      action: dynamicReports[0].downloadFn,
    },
    {
      id: "RT2",
      name: "Vendor & Subcontractor Analytics",
      desc: `Performance and compliance tracking across ${vendors.length} registered vendor(s).`,
      icon: <PieChart className="size-5 text-blue-600" />,
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      action: dynamicReports[2].downloadFn,
    },
    {
      id: "RT3",
      name: "Inventory & Assets Register",
      desc: `Stock balances, machinery status, and equipment deployment for ${inventory.length} tracked asset(s).`,
      icon: <Boxes className="size-5 text-orange-600" />,
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      action: dynamicReports[3].downloadFn,
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
      <PageHeader
        title="Global Analytics & Reports"
        eyebrow="Global Workspace"
        actions={
          <button
            onClick={handleSyncData}
            disabled={isFetchingExec}
            className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw className={`size-4 ${isFetchingExec ? "animate-spin" : ""}`} /> Sync Data
          </button>
        }
      />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Filter className="size-4 text-primary" /> Report Generators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REPORT_TYPES.map((rt) => (
            <div
              key={rt.id}
              onClick={rt.action}
              className="p-5 rounded-xl border border-border bg-[color:var(--surface)] hover:border-primary/40 transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div
                  className={`size-10 rounded-lg flex items-center justify-center mb-4 border ${rt.bg} ${rt.border}`}
                >
                  {rt.icon}
                </div>
                <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {rt.name}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{rt.desc}</p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-primary opacity-80 group-hover:opacity-100 transition-opacity">
                Generate & Export &rarr;
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" /> Recent Generated Reports
        </h3>
        <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium">Report Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Generated On</th>
                <th className="px-6 py-4 font-medium">Author</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dynamicReports.map((rep) => (
                <tr key={rep.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      {rep.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-secondary text-muted-foreground">
                      {rep.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">{rep.date}</td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground">{rep.author}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={rep.downloadFn}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold ml-auto"
                    >
                      <Download className="size-3.5" /> Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

