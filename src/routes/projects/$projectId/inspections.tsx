import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import {
  ClipboardCheck,
  Search,
  Filter,
  Plus,
  FileSignature,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { siteControlApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/inspections")({
  component: InspectionsPage,
});

function InspectionsPage() {
  const { projectId } = Route.useParams();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const { data: rawInspections = [] } = useQuery({
    queryKey: ["inspections", projectId],
    queryFn: () => siteControlApi.listInspections(projectId),
  });
  const inspections = rawInspections.map((inspection) => ({
    id: String(inspection.inspectionId ?? ""),
    title: String(inspection.title ?? "Untitled inspection"),
    type: String(inspection.type ?? "QA/QC"),
    status: String(inspection.status ?? "Pending"),
    date: String(inspection.createdAt ?? ""),
    inspector: String(inspection.inspector ?? "—"),
    score: String(inspection.score ?? "—"),
  }));

  const filteredInspections = inspections.filter((insp) => {
    const matchSearch = insp.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || insp.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Audits & Inspections"
        eyebrow="Quality & Safety"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="size-4" /> New Inspection
          </button>
        }
      />

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search inspections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-auto h-9 pl-9 pr-8 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50 appearance-none"
              >
                <option value="All">All Types</option>
                <option value="QA/QC">QA/QC</option>
                <option value="Safety">Safety</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium">Inspection Details</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Inspector</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Score</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInspections.map((insp) => (
                <tr
                  key={insp.id}
                  className="hover:bg-secondary/20 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${insp.type === "Safety" ? "bg-orange-500/10 text-orange-600" : "bg-blue-500/10 text-blue-600"}`}
                      >
                        {insp.type === "Safety" ? (
                          <AlertCircle className="size-4" />
                        ) : (
                          <ClipboardCheck className="size-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{insp.title}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{insp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-secondary text-muted-foreground">
                      {insp.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground">
                    {insp.inspector}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                    <CalendarClock className="size-3" /> {insp.date}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-foreground">{insp.score}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        insp.status === "Passed"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : insp.status === "Failed"
                            ? "bg-red-500/10 text-red-600 border border-red-500/20"
                            : insp.status === "Conditional Pass"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-gray-500/10 text-gray-600 border border-gray-500/20"
                      }`}
                    >
                      {insp.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredInspections.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No inspections found.
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
