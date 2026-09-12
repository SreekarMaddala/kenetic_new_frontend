import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import {
  BarChart3,
  Download,
  FileText,
  Filter,
  CalendarDays,
  LineChart,
  PieChart,
  RefreshCcw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../lib/api";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

const REPORT_TYPES = [
  {
    id: "RT1",
    name: "Company Financial Overview",
    desc: "Consolidated P&L, expenses, and margins across all active projects.",
    icon: <LineChart className="size-5 text-emerald-600" />,
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    id: "RT2",
    name: "Workforce & Labour Analytics",
    desc: "Daily attendance averages, subcontractor manpower, and wage distributions.",
    icon: <PieChart className="size-5 text-blue-600" />,
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    id: "RT3",
    name: "Vendor Performance & Compliance",
    desc: "Rating matrix for subcontractors, active contract values, and SLA breaches.",
    icon: <BarChart3 className="size-5 text-orange-600" />,
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
];

const RECENT_REPORTS = [
  {
    id: "REP-992",
    name: "Q2 2026 Consolidated P&L",
    type: "Financial",
    date: "15 Jul 2026, 10:30 AM",
    author: "Sneha Patel",
  },
  {
    id: "REP-991",
    name: "June Workforce Attendance",
    type: "Labour",
    date: "02 Jul 2026, 09:15 AM",
    author: "Rajesh Kumar",
  },
  {
    id: "REP-990",
    name: "Equipment Utilization H1 2026",
    type: "Assets",
    date: "28 Jun 2026, 04:45 PM",
    author: "Rajesh Kumar",
  },
  {
    id: "REP-989",
    name: "Subcontractor Payouts - May",
    type: "Financial",
    date: "05 Jun 2026, 11:20 AM",
    author: "Sneha Patel",
  },
];

function ReportsPage() {
  const {
    data: execReport,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["executive-report"],
    queryFn: () => reportsApi.executive(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
      <PageHeader
        title="Global Analytics & Reports"
        eyebrow="Global Workspace"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <RefreshCcw className="size-4" /> Sync Data
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
              className="p-5 rounded-xl border border-border bg-[color:var(--surface)] hover:border-primary/40 transition-colors cursor-pointer group"
            >
              <div
                className={`size-10 rounded-lg flex items-center justify-center mb-4 border ${rt.bg} ${rt.border}`}
              >
                {rt.icon}
              </div>
              <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {rt.name}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{rt.desc}</p>
              <div className="mt-4 flex items-center text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Generate Report &rarr;
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
              {RECENT_REPORTS.map((rep) => (
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
                    <button className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold ml-auto">
                      <Download className="size-3.5" /> PDF
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
