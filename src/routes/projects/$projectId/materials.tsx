/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from "../../../contexts/AuthContext";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import * as React from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Package,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  FileDown,
  X,
  Clock,
  Truck,
  Check,
} from "lucide-react";
import { exportToExcel } from "../../../lib/excel";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fieldOperationsApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/materials")({
  head: () => ({
    meta: [
      { title: "Materials — Kinetic" },
      {
        name: "description",
        content: "Stock tracking, material requests, and reorder alerts across all sites.",
      },
    ],
  }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const activeRole = useAuth().user?.role;

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["materials", projectId],
    queryFn: () => fieldOperationsApi.listMaterials(projectId),
    enabled: !!projectId,
    retry: 1,
  });

  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "critical" | "warn" | "ok">("all");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    if (rawMaterials && rawMaterials.length > 0) {
      const parsedItems = rawMaterials.map((m: any, idx: number) => ({
        name: m.name || m.materialName || `Material #${idx + 1}`,
        vendor: m.vendor || "Approved Supplier",
        stock: m.stock || m.quantity || 100,
        unit: m.unit || "Units",
        reorderAt: m.reorderAt || 200,
        site: m.site || "Project Site",
        status: m.status || (m.stock < (m.reorderAt || 200) ? "warn" : "ok"),
      }));
      setItems(parsedItems);
    } else {
      setItems([]);
    }
  }, [rawMaterials]);

  const createIndentMutation = useMutation({
    mutationFn: (body: any) => fieldOperationsApi.createIndent({ projectId, ...body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", projectId] });
      toast.success("Reorder request submitted to central warehouse.");
    },
  });

  const isSupervisor = activeRole === "supervisor";
  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const handleReorder = (name: string) => {
    toast.success("Reorder raised", { description: `Indented reorder for ${name}.` });
  };

  const stats = [
    { label: "SKUs Tracked", value: "148", icon: <Package className="size-4" />, color: "accent" },
    {
      label: "Below Reorder",
      value: String(items.filter((i) => i.status !== "ok").length).padStart(2, "0"),
      icon: <AlertTriangle className="size-4" />,
      color: "primary",
    },
    { label: "Pending Requests", value: "11", icon: <RefreshCw className="size-4" />, color: "" },
    {
      label: "Vendors Mapped",
      value: "42",
      icon: <CheckCircle2 className="size-4" />,
      color: "accent",
    },
  ];

  const handleExport = () => {
    exportToExcel(
      filtered.map((item) => ({
        Item: item.name,
        Vendor: item.vendor,
        Stock: `${item.stock} ${item.unit}`,
        "Reorder At": item.reorderAt,
        Site: item.site,
        Status:
          item.status === "critical" ? "Critical" : item.status === "warn" ? "Low Stock" : "OK",
      })),
      `Kinetic_Materials_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}`,
      undefined,
      "Material Inventory Report",
    );
    toast.success("Material report exported to Excel");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        eyebrow="Inventory"
        title="Material Management"
        actions={
          <div className="flex gap-3">
            {isSupervisor ? (
              <>
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="h-10 px-4 border border-amber-500/30 text-amber-600 bg-amber-500/10 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-2"
                >
                  <AlertTriangle className="size-4" />
                  Report Issue
                </button>
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="h-10 px-4 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  <Package className="size-4" />
                  Raise Request
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleExport}
                  className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <FileDown className="size-4" />
                  Export Excel
                </button>
                <button
                  onClick={() => toast.success("Request raised")}
                  className="h-10 px-6 bg-foreground text-background rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  Raise Request
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Page Content based on Role */}
      {isSupervisor ? (
        <div className="animate-fade-up mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold">My Material Requests</h2>
          </div>

          <div className="bg-[color:var(--surface)] rounded-xl border border-border overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Date</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req: any, i: number) => (
                  <tr
                    key={req.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <td>
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        {req.id}
                      </span>
                    </td>
                    <td>
                      <p className="font-semibold text-sm">{req.material}</p>
                    </td>
                    <td>
                      <span className="text-sm">{req.qty}</span>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground">{req.date}</span>
                    </td>
                    <td className="text-right">
                      {req.status === "pending" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                          <Clock className="size-3" /> Pending Review
                        </div>
                      ) : req.status === "approved" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          <Check className="size-3" /> Approved
                        </div>
                      ) : req.status === "in-transit" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                          <Truck className="size-3" /> In Transit
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="size-3" /> Delivered
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="bg-[color:var(--surface)] p-5 rounded-xl border border-border card-hover animate-fade-up"
                style={{ animationDelay: `${i * 60}ms`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    {s.label}
                  </p>
                  <span
                    className={
                      s.color === "accent"
                        ? "text-accent"
                        : s.color === "primary"
                          ? "text-primary"
                          : "text-muted-foreground"
                    }
                  >
                    {s.icon}
                  </span>
                </div>
                <p
                  className={`text-3xl font-display font-bold tracking-tight ${s.color === "primary" ? "text-primary" : s.color === "accent" ? "text-accent" : ""}`}
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div
            className="flex items-center gap-2 mb-5 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            {(["all", "critical", "warn", "ok"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-foreground text-background" : "bg-[color:var(--surface)] border border-border text-muted-foreground hover:text-foreground"}`}
              >
                {f === "all"
                  ? "All"
                  : f === "critical"
                    ? "🔴 Critical"
                    : f === "warn"
                      ? "🟡 Warning"
                      : "🟢 Healthy"}
              </button>
            ))}
            <span className="ml-auto text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Updated 12 min ago
            </span>
          </div>

          {/* Table */}
          <div
            className="bg-[color:var(--surface)] rounded-xl border border-border overflow-hidden animate-fade-up"
            style={{ animationDelay: "280ms", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Site</th>
                  <th>Stock Level</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const pct = Math.min(100, Math.round((m.stock / m.reorderAt) * 100));
                  return (
                    <tr
                      key={m.name}
                      className="animate-fade-up"
                      style={{ animationDelay: `${320 + i * 50}ms` }}
                    >
                      <td>
                        <p className="font-semibold text-sm">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{m.vendor}</p>
                      </td>
                      <td>
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded font-mono">
                          {m.site}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[100px]">
                            <div className="progress-track">
                              <div
                                className={`progress-fill animate-reveal-bar ${m.status === "critical" ? "bg-primary" : m.status === "warn" ? "bg-yellow-500" : "bg-accent"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[9px] font-mono text-muted-foreground mt-1">
                              {pct}% of reorder
                            </p>
                          </div>
                          <span className="font-mono text-xs font-semibold">
                            {m.stock}{" "}
                            <span className="text-muted-foreground font-normal">{m.unit}</span>
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        {m.status === "critical" ? (
                          <button
                            onClick={() => handleReorder(m.name)}
                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-colors"
                          >
                            Reorder Now
                          </button>
                        ) : m.status === "warn" ? (
                          <button
                            onClick={() => handleReorder(m.name)}
                            className="px-3 py-1.5 border border-yellow-400/40 bg-yellow-500/10 text-yellow-700 rounded-lg text-[11px] font-bold hover:bg-yellow-500/15 transition-colors"
                          >
                            Plan Reorder
                          </button>
                        ) : (
                          <span className="chip chip-accent">Healthy</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modals */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <h3 className="font-semibold">Raise Material Request</h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Material Name
                </label>
                <input
                  type="text"
                  className="w-full h-10 px-3 bg-secondary/20 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  placeholder="e.g. Cement OPC 53 Grade"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Quantity
                  </label>
                  <input
                    type="number"
                    className="w-full h-10 px-3 bg-secondary/20 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Unit
                  </label>
                  <select className="w-full h-10 px-3 bg-secondary/20 border border-border rounded-lg text-sm focus:outline-none focus:border-primary">
                    <option>Bags</option>
                    <option>Tons</option>
                    <option>Truckloads</option>
                    <option>Boxes</option>
                    <option>Meters</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Required By Date
                </label>
                <input
                  type="date"
                  className="w-full h-10 px-3 bg-secondary/20 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Remarks (Optional)
                </label>
                <textarea
                  className="w-full p-3 bg-secondary/20 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  rows={2}
                  placeholder="Any specific requirements..."
                ></textarea>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-secondary/10">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-secondary border border-transparent rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("Request raised successfully");
                  setShowRequestModal(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {showIssueModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <h3 className="font-semibold text-amber-600 flex items-center gap-2">
                <AlertTriangle className="size-4" /> Inform Shortage / Issue
              </h3>
              <button
                onClick={() => setShowIssueModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Issue Type
                </label>
                <select className="w-full h-10 px-3 bg-secondary/20 border border-border rounded-lg text-sm focus:outline-none focus:border-amber-500">
                  <option>Critical Shortage</option>
                  <option>Quality Defect</option>
                  <option>Delivery Delay</option>
                  <option>Other Issue</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Material Affected (Optional)
                </label>
                <input
                  type="text"
                  className="w-full h-10 px-3 bg-secondary/20 border border-border rounded-lg text-sm focus:outline-none focus:border-amber-500"
                  placeholder="e.g. TMT Steel 12mm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Issue Details
                </label>
                <textarea
                  className="w-full p-3 bg-secondary/20 border border-border rounded-lg text-sm focus:outline-none focus:border-amber-500"
                  rows={4}
                  placeholder="Describe the issue in detail..."
                ></textarea>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-secondary/10">
              <button
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-secondary border border-transparent rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("Issue reported to Head Office");
                  setShowIssueModal(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Report Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
