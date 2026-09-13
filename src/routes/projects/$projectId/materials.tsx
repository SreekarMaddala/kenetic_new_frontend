import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import {
  api,
  projectApi,
  fieldOperationsApi,
  vendorApi,
  type DomainRecord,
} from "../../../lib/api";
import { toast } from "sonner";
import {
  Download,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Box,
  X,
  FileText,
  Building2,
  Package,
} from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/materials")({
  component: MaterialsPage,
});

interface MaterialItem {
  id: string;
  name: string;
  category: string;
  site: string;
  stockLevelPercent: number;
  quantity: number;
  unit: string;
  reorderLevel: number;
  status: "Critical" | "Warning" | "Healthy";
}

function MaterialsPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "operations_admin" || user?.role === "super_admin";
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<"All" | "Critical" | "Warning" | "Healthy">(
    "All",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"stock" | "requests">("stock");
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);

  // Form state for Raise Request
  const [materialName, setMaterialName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Bags");
  const [requiredDate, setRequiredDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  // Queries
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const materialsQuery = useQuery({
    queryKey: ["materials-stock", projectId],
    queryFn: () => fieldOperationsApi.listMaterials(projectId),
  });

  const indentsQuery = useQuery({
    queryKey: ["materials-indents", projectId],
    queryFn: () => fieldOperationsApi.listIndents(projectId),
  });

  const vendorsQuery = useQuery({
    queryKey: ["vendors"],
    queryFn: () => vendorApi.list(),
  });

  // Raise Request Mutation
  const createIndentMutation = useMutation({
    mutationFn: (body: DomainRecord) => fieldOperationsApi.createIndent(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials-indents", projectId] });
      toast.success("Material request submitted successfully.");
      setIsRaiseModalOpen(false);
      setMaterialName("");
      setQuantity("");
      setRemarks("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Review Indent Mutation (Approve / Reject)
  const reviewIndentMutation = useMutation({
    mutationFn: ({ indentId, status }: { indentId: string; status: string }) =>
      fieldOperationsApi.updateIndent(projectId, indentId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials-indents", projectId] });
      toast.success("Request status updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Issue from Warehouse Mutation
  const issueWarehouseMutation = useMutation({
    mutationFn: (r: DomainRecord) =>
      api.post("/warehouse/issue-vouchers", {
        targetProjectId: projectId,
        item: r.materialName,
        unit: r.unit,
        qty: r.quantity,
        indentId: r.materialId,
        requestId: `indent-${r.materialId}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials-stock", projectId] });
      qc.invalidateQueries({ queryKey: ["materials-indents", projectId] });
      toast.success("Stock issued from warehouse.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Parse stock items dynamically
  const materialsList: MaterialItem[] = useMemo(() => {
    if (!materialsQuery.data || materialsQuery.data.length === 0) return [];

    return materialsQuery.data.map((m, idx) => {
      const rawQty = Number(m.quantity ?? m.totalStock ?? 0);
      const reorder = Number(m.reorderLevel ?? m.minStock ?? 100);
      const pct = Math.min(Math.round((rawQty / (reorder || 1)) * 100), 100);

      let status: "Critical" | "Warning" | "Healthy" = "Healthy";
      if (m.status === "Critical" || pct <= 35) {
        status = "Critical";
      } else if (m.status === "Warning" || pct < 70) {
        status = "Warning";
      }

      return {
        id: String(m.materialId ?? m.itemId ?? m.id ?? `mat-${idx}`),
        name: String(m.name ?? m.materialName ?? "Construction Material"),
        category: String(m.category ?? m.manufacturer ?? m.brand ?? "General Stock"),
        site: String(m.site ?? project.data?.name ?? "Project Site"),
        stockLevelPercent: pct,
        quantity: rawQty,
        unit: String(m.unit ?? "Units"),
        reorderLevel: reorder,
        status,
      };
    });
  }, [materialsQuery.data, project.data]);

  // Derived counts for top 4 cards
  const skusTrackedCount = materialsList.length;
  const belowReorderCount = useMemo(() => {
    return materialsList.filter((m) => m.status === "Critical" || m.status === "Warning").length;
  }, [materialsList]);

  const pendingRequestsCount = useMemo(() => {
    return (
      indentsQuery.data?.filter((i) => String(i.status).toLowerCase() === "pending").length ?? 0
    );
  }, [indentsQuery.data]);

  const vendorsMappedCount = vendorsQuery.data?.length ?? 0;

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materialsList.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.site.toLowerCase().includes(searchQuery.toLowerCase());

      if (statusFilter === "All") return matchesSearch;
      return matchesSearch && m.status === statusFilter;
    });
  }, [materialsList, searchQuery, statusFilter]);

  function handleRaiseSubmit(e: FormEvent) {
    e.preventDefault();
    if (createIndentMutation.isPending) return;
    if (!materialName.trim() || !quantity) {
      toast.error("Please fill in material name and quantity.");
      return;
    }
    createIndentMutation.mutate({
      projectId,
      materialName: materialName.trim(),
      quantity: Number(quantity),
      unit,
      requiredDate,
      remarks,
      status: "pending",
    });
  }

  function handleExportExcel() {
    if (materialsList.length === 0) {
      toast.error("No material stock data to export.");
      return;
    }
    const headers = ["Material Name", "Category", "Site", "Quantity", "Unit", "Status"];
    const rows = materialsList.map((m) => [
      `"${m.name}"`,
      `"${m.category}"`,
      `"${m.site}"`,
      m.quantity,
      `"${m.unit}"`,
      `"${m.status}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `material_registry_${projectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Materials registry exported to CSV.");
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <span>Portfolio</span>
        <span>›</span>
        <span>{project.data?.name || "Project"}</span>
        <span>›</span>
        <span className="text-foreground font-semibold">Materials Registry</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-orange-600 font-bold mb-1">
            — INVENTORY
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Material Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="h-10 px-4 rounded-xl border border-border bg-[color:var(--surface)] hover:bg-secondary text-foreground text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="size-4" /> Export Excel
          </button>
          <button
            onClick={() => setIsRaiseModalOpen(true)}
            className="h-10 px-5 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-bold flex items-center gap-2 shadow-md transition-opacity"
          >
            <Plus className="size-4" /> Raise Request
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* SKUs Tracked */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              SKUS TRACKED
            </div>
            <div className="text-3xl font-black text-foreground">{skusTrackedCount}</div>
          </div>
          <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <Box className="size-5" />
          </div>
        </div>

        {/* Below Reorder */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              BELOW REORDER
            </div>
            <div className="text-3xl font-black text-orange-600">
              {String(belowReorderCount).padStart(2, "0")}
            </div>
          </div>
          <div className="size-10 rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center">
            <AlertTriangle className="size-5" />
          </div>
        </div>

        {/* Pending Requests */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              PENDING REQUESTS
            </div>
            <div className="text-3xl font-black text-foreground">{pendingRequestsCount}</div>
          </div>
          <div className="size-10 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
            <RefreshCw className="size-5" />
          </div>
        </div>

        {/* Vendors Mapped */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              VENDORS MAPPED
            </div>
            <div className="text-3xl font-black text-foreground">{vendorsMappedCount}</div>
          </div>
          <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="size-5" />
          </div>
        </div>
      </div>

      {/* Main Sub-Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        {/* Status Filter Buttons & Main View Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Sub Tab Toggle */}
          <div className="flex items-center bg-secondary/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("stock")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "stock"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Material Registry
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "requests"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending Indents
              {pendingRequestsCount > 0 && (
                <span className="size-4 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>

          {activeTab === "stock" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter("All")}
                className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  statusFilter === "All"
                    ? "bg-foreground text-background border-foreground font-bold"
                    : "border-border bg-[color:var(--surface)] text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("Critical")}
                className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  statusFilter === "Critical"
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30 font-bold"
                    : "border-border bg-[color:var(--surface)] text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="size-2 rounded-full bg-rose-500" /> Critical
              </button>
              <button
                onClick={() => setStatusFilter("Warning")}
                className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  statusFilter === "Warning"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold"
                    : "border-border bg-[color:var(--surface)] text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="size-2 rounded-full bg-amber-500" /> Warning
              </button>
              <button
                onClick={() => setStatusFilter("Healthy")}
                className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  statusFilter === "Healthy"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold"
                    : "border-border bg-[color:var(--surface)] text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="size-2 rounded-full bg-emerald-500" /> Healthy
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search material or site..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs border border-border rounded-xl bg-[color:var(--surface)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Stock Registry View */}
      {activeTab === "stock" && (
        <div className="rounded-xl border border-border bg-[color:var(--surface)] shadow-sm overflow-hidden">
          {filteredMaterials.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Package className="size-10 text-muted-foreground mx-auto" />
              <div className="text-sm font-bold text-foreground">No Material Records Found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No inventory items match your current filter criteria. Click "Raise Request" to add
                new stock indents.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-5">MATERIAL</th>
                    <th className="py-3 px-5">SITE</th>
                    <th className="py-3 px-5">STOCK LEVEL</th>
                    <th className="py-3 px-5 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filteredMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                      {/* Material Name & Category */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-foreground text-sm">{m.name}</div>
                        <div className="text-xs text-muted-foreground font-medium">{m.category}</div>
                      </td>

                      {/* Site Badge Pill */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-secondary/80 text-foreground border border-border">
                          <Building2 className="size-3 text-muted-foreground" />
                          {m.site}
                        </span>
                      </td>

                      {/* Stock Level Bar & Quantity */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-4 max-w-xs">
                          <div className="flex-1 space-y-1">
                            <div className="text-[10px] text-muted-foreground font-medium">
                              {m.stockLevelPercent}% of reorder
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  m.status === "Critical"
                                    ? "bg-rose-500"
                                    : m.status === "Warning"
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.max(m.stockLevelPercent, 10)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <span className="font-black text-sm text-foreground">
                              {m.quantity.toLocaleString()}
                            </span>{" "}
                            <span className="text-xs font-medium text-muted-foreground">
                              {m.unit}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action Button / Status Badge */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        {m.status === "Critical" ? (
                          <button
                            onClick={() => {
                              setMaterialName(m.name);
                              setUnit(m.unit);
                              setIsRaiseModalOpen(true);
                            }}
                            className="h-8 px-4 bg-orange-600 text-white font-bold text-xs rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                          >
                            Reorder Now
                          </button>
                        ) : m.status === "Warning" ? (
                          <button
                            onClick={() => {
                              setMaterialName(m.name);
                              setUnit(m.unit);
                              setIsRaiseModalOpen(true);
                            }}
                            className="h-8 px-4 bg-amber-500/10 text-amber-600 border border-amber-500/30 font-bold text-xs rounded-lg hover:bg-amber-500/20 transition-colors"
                          >
                            Plan Reorder
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase">
                            HEALTHY
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending Indents / Requests View */}
      {activeTab === "requests" && (
        <div className="rounded-xl border border-border bg-[color:var(--surface)] shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="font-bold text-sm text-foreground">Material Indents & Requests</h3>
              <p className="text-xs text-muted-foreground">
                Track pending site requests and issue warehouse stock after administrator approval.
              </p>
            </div>
          </div>

          {!indentsQuery.data || indentsQuery.data.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No material indents or requests submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {indentsQuery.data.map((r) => {
                const reqStatus = String(r.status ?? "pending").toLowerCase();
                return (
                  <div
                    key={String(r.materialId ?? r.indentId)}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {String(r.materialName ?? "Material")}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            reqStatus === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : reqStatus === "rejected"
                              ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {reqStatus}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Quantity: <span className="font-semibold text-foreground">{String(r.quantity)} {String(r.unit ?? "")}</span> · Required By: {String(r.requiredDate ?? "ASAP")}
                      </div>
                      {Boolean(r.remarks) && (
                        <div className="text-xs text-muted-foreground italic">"{String(r.remarks)}"</div>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        {reqStatus === "pending" && (
                          <>
                            <button
                              disabled={reviewIndentMutation.isPending}
                              onClick={() =>
                                reviewIndentMutation.mutate({
                                  indentId: String(r.materialId),
                                  status: "approved",
                                })
                              }
                              className="h-8 px-3 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                            >
                              Approve
                            </button>
                            <button
                              disabled={reviewIndentMutation.isPending}
                              onClick={() =>
                                reviewIndentMutation.mutate({
                                  indentId: String(r.materialId),
                                  status: "rejected",
                                })
                              }
                              className="h-8 px-3 border border-border text-foreground font-bold text-xs rounded-lg hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {reqStatus === "approved" && (
                          <button
                            disabled={issueWarehouseMutation.isPending}
                            onClick={() => issueWarehouseMutation.mutate(r)}
                            className="h-8 px-3.5 bg-foreground text-background font-bold text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                          >
                            <Box className="size-3.5" /> Issue From Warehouse
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Raise Request Modal */}
      {isRaiseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[color:var(--surface)] border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-orange-600" />
                <h3 className="font-bold text-base text-foreground">Raise Material Request</h3>
              </div>
              <button
                onClick={() => setIsRaiseModalOpen(false)}
                className="size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Material Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cement OPC 53 Grade, TMT Steel 12mm..."
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 250"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  >
                    <option value="Bags">Bags</option>
                    <option value="Tons">Tons</option>
                    <option value="Truckloads">Truckloads</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Meters">Meters</option>
                    <option value="Units">Units</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Required By Date</label>
                <input
                  type="date"
                  required
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Remarks / Category</label>
                <textarea
                  rows={3}
                  placeholder="Specify urgency, brand preference, or delivery site location notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-3 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRaiseModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createIndentMutation.isPending}
                  className="h-10 px-5 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
                >
                  {createIndentMutation.isPending ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
