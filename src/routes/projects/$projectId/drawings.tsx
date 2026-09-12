import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { useState } from "react";
import {
  Search,
  Filter,
  PenTool,
  LayoutTemplate,
  Zap,
  Download,
  Maximize2,
  MoreHorizontal,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { documentControlApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/drawings")({
  component: DrawingsPage,
});

function DrawingsPage() {
  const { projectId } = Route.useParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const { data: rawDrawings = [] } = useQuery({
    queryKey: ["drawings", projectId],
    queryFn: () => documentControlApi.listDrawings(projectId),
  });
  const drawings = rawDrawings.map((drawing) => ({
    id: String(drawing.drawingId ?? ""),
    title: String(drawing.title ?? drawing.name ?? "Untitled drawing"),
    category: String(drawing.category ?? "Architectural"),
    rev: String(drawing.revision ?? drawing.rev ?? "—"),
    status: String(drawing.status ?? "Pending Review"),
    date: String(drawing.createdAt ?? ""),
    author: String(drawing.author ?? "—"),
    icon: <LayoutTemplate className="size-5 text-primary" />,
    bg: "bg-primary/10",
  }));

  const filteredDrawings = drawings.filter((d) => {
    const matchSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || d.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = ["All", "Architectural", "Structural", "MEP"];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader title="Drawings & Blueprints" eyebrow="Planning & Engineering" />

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search drawings (e.g. DWG-A-101)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDrawings.map((dwg) => (
          <div
            key={dwg.id}
            className="group rounded-xl border border-border bg-[color:var(--surface)] overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
          >
            {/* Thumbnail Placeholder */}
            <div className="h-40 bg-secondary/30 border-b border-border relative flex items-center justify-center p-6">
              <div className="absolute top-3 right-3 flex gap-1">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    dwg.status === "Approved (GFC)"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : dwg.status === "Pending Review"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {dwg.status}
                </span>
                <span className="px-2 py-0.5 rounded bg-background border border-border text-[10px] font-bold text-foreground">
                  {dwg.rev}
                </span>
              </div>
              <div className="w-full h-full border-2 border-dashed border-border/50 rounded flex items-center justify-center text-muted-foreground/30">
                <LayoutTemplate className="size-16" />
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                  title="View Full Screen"
                >
                  <Maximize2 className="size-4" />
                </button>
                <button
                  className="size-10 rounded-full bg-white text-foreground border shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                  title="Download PDF"
                >
                  <Download className="size-4" />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono text-primary mb-1">{dwg.id}</div>
                  <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                    {dwg.title}
                  </h4>
                </div>
                <div
                  className={`size-8 rounded flex items-center justify-center shrink-0 ${dwg.bg}`}
                >
                  {dwg.icon}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <span>{dwg.author}</span>
                <span>{dwg.date}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredDrawings.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No drawings found matching the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
