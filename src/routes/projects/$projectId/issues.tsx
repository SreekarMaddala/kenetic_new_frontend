import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, Search, Filter, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { siteControlApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/issues")({
  component: IssuesPage,
});

function IssuesPage() {
  const { projectId } = Route.useParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const { data: rawIssues = [] } = useQuery({
    queryKey: ["issues", projectId],
    queryFn: () => siteControlApi.listIssues(projectId),
  });
  const issues = rawIssues.map((issue) => ({
    id: String(issue.issueId ?? ""), title: String(issue.title ?? issue.description ?? "Untitled issue"),
    category: String(issue.category ?? "General"), priority: String(issue.priority ?? "Medium"),
    status: String(issue.status ?? "Open"), assignedTo: String(issue.assignedTo ?? "Unassigned"),
    date: String(issue.createdAt ?? ""), comments: Number(issue.comments ?? 0),
  }));

  const filteredIssues = issues.filter(iss => {
    const matchSearch = iss.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || iss.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Issues & Snag List"
        eyebrow="Quality & Safety"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="size-4" /> Raise Issue
          </button>
        }
      />

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto h-9 pl-9 pr-8 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/50 appearance-none"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {filteredIssues.map((iss) => (
            <div key={iss.id} className="p-5 hover:bg-secondary/20 transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Icon & Details */}
              <div className="flex-1 min-w-0 flex items-start gap-4">
                <div className={`mt-0.5 p-2 rounded-full shrink-0 ${
                  iss.status === "Resolved" ? "bg-emerald-500/10 text-emerald-600" :
                  iss.priority === "Critical" ? "bg-red-500/10 text-red-600" :
                  iss.priority === "High" ? "bg-orange-500/10 text-orange-600" :
                  "bg-blue-500/10 text-blue-600"
                }`}>
                  {iss.status === "Resolved" ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{iss.id}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {iss.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      iss.priority === "Critical" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                      iss.priority === "High" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                      iss.priority === "Medium" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                      "bg-gray-500/10 text-gray-600 border-gray-500/20"
                    }`}>
                      {iss.priority} Priority
                    </span>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{iss.title}</h4>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="size-3" /> Opened {iss.date}</span>
                    <span className="flex items-center gap-1.5"><MessageSquare className="size-3" /> {iss.comments} Comments</span>
                  </div>
                </div>
              </div>

              {/* Assignee & Status */}
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 sm:w-40 pt-4 sm:pt-0 border-t sm:border-t-0 border-border">
                <div className="text-xs font-medium text-foreground">
                  {iss.assignedTo}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  iss.status === "Resolved" ? "bg-emerald-500/10 text-emerald-600" :
                  iss.status === "In Progress" ? "bg-blue-500/10 text-blue-600" :
                  "bg-orange-500/10 text-orange-600"
                }`}>
                  {iss.status}
                </span>
              </div>
            </div>
          ))}

          {filteredIssues.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No issues found matching the criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
