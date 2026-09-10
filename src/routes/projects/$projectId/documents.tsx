import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { FileText, File, FileQuestion, Upload, Search, Filter, Download, MoreVertical, Calendar } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentControlApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { projectId } = Route.useParams();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const { data: rawDocuments = [] } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => documentControlApi.listDocuments(projectId),
  });
  const documents = rawDocuments.map((document) => ({
    id: String(document.documentId ?? ""), name: String(document.name ?? document.title ?? "Untitled document"),
    type: String(document.type ?? "Document"), size: String(document.size ?? "—"),
    date: String(document.createdAt ?? ""), uploader: String(document.uploader ?? document.createdBy ?? "—"),
  }));

  const filteredDocs = documents.filter(doc => {
    const matchSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || doc.type === typeFilter;
    return matchSearch && matchType;
  });

  const types = ["All", ...Array.from(new Set(documents.map(d => d.type)))];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Document Management"
        eyebrow="Planning & Engineering"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Upload className="size-4" /> Upload Document
          </button>
        }
      />

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search file names..."
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
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium">File Name</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Uploaded By</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-secondary/20 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground flex items-center gap-3">
                      <div className="p-2 bg-secondary rounded-lg">
                        <FileText className="size-4 text-primary" />
                      </div>
                      {doc.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-secondary text-muted-foreground">
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                    {doc.size}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {doc.uploader}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                    <Calendar className="size-3" /> {doc.date}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-all" title="Download">
                        <Download className="size-4" />
                      </button>
                      <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-all">
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No documents found.
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
