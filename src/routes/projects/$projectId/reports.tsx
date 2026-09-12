import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import {
  FileText,
  Download,
  Search,
  Filter,
  Plus,
  Clock,
  Users,
  HardHat,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fieldOperationsApi, type DomainRecord } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/reports")({
  head: () => ({
    meta: [
      { title: "Project Reports & DPRs — Kinetic" },
      {
        name: "description",
        content: "Daily progress reports, weekly summaries, and project milestones.",
      },
    ],
  }),
  component: ProjectReportsPage,
});

function ProjectReportsPage() {
  const { projectId } = Route.useParams();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const { data: rawDprs = [], isLoading } = useQuery({
    queryKey: ["dpr", projectId],
    queryFn: () => fieldOperationsApi.listDpr(projectId),
    enabled: !!projectId,
    retry: 1,
  });

  const reports = rawDprs.map((item: DomainRecord) => ({
    id: (item.dprId as string) ?? "—",
    date: (item.date as string) ?? (item.createdAt as string)?.split("T")[0] ?? "—",
    type: (item.reportType as string) ?? "Daily Progress",
    author: (item.supervisorId as string) ?? "—",
    status: (item.status as string) ?? "Pending Review",
    labour: typeof item.labourCount === "number" ? item.labourCount : "—",
    weather: (item.weather as string) ?? "—",
    notes: (item.notes as string) ?? (item.summary as string) ?? "—",
  }));

  const filteredReports = reports.filter((rep) => {
    const matchSearch =
      rep.id.toLowerCase().includes(search.toLowerCase()) ||
      rep.date.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || rep.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Project Reports & DPRs"
        eyebrow="Quality & Safety"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="size-4" /> Create Report
          </button>
        }
      />

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID or Date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-auto h-9 pl-9 pr-8 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/50 appearance-none"
              >
                <option value="All">All Types</option>
                <option value="Daily Progress">Daily Progress (DPR)</option>
                <option value="Weekly Summary">Weekly Summary</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {isLoading && (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading reports…</div>
          )}
          {!isLoading &&
            filteredReports.map((rep) => (
              <div
                key={rep.id}
                className="p-5 hover:bg-secondary/20 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center gap-4"
              >
                {/* Core Info */}
                <div className="flex-1 min-w-0 flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl shrink-0 ${rep.type === "Weekly Summary" ? "bg-purple-500/10 text-purple-600" : "bg-blue-500/10 text-blue-600"}`}
                  >
                    <FileText className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider bg-secondary px-2 py-0.5 rounded">
                        {rep.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          rep.status === "Approved" || rep.status === "Published"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-orange-500/10 text-orange-600"
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                      {rep.type} - {rep.date}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{rep.notes}</p>
                  </div>
                </div>

                {/* Stats (Desktop only mostly) */}
                {rep.type === "Daily Progress" && (
                  <div className="hidden lg:flex items-center gap-6 px-6 border-l border-border h-12">
                    <div className="text-xs">
                      <div className="text-muted-foreground mb-0.5 flex items-center gap-1">
                        <Users className="size-3" /> Total Labour
                      </div>
                      <div className="font-bold text-foreground">
                        {typeof rep.labour === "number" ? `${rep.labour} workers` : rep.labour}
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="text-muted-foreground mb-0.5 flex items-center gap-1">
                        <Clock className="size-3" /> Weather
                      </div>
                      <div className="font-semibold text-foreground">{rep.weather}</div>
                    </div>
                  </div>
                )}

                {/* Author & Action */}
                <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 md:w-48 pt-4 md:pt-0 border-t md:border-t-0 border-border">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <HardHat className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="text-xs font-medium text-foreground">{rep.author}</div>
                  </div>
                  <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-all shrink-0">
                    <Download className="size-4" />
                  </button>
                </div>
              </div>
            ))}

          {!isLoading && filteredReports.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No reports found for this project.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
