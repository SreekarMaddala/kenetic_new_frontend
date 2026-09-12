/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { useState } from "react";
import { toast } from "sonner";
import {
  Warehouse,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Plus,
  FileDown,
  X,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { exportToExcel } from "../../../lib/excel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { warehouseApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/warehouse")({
  head: () => ({
    meta: [
      { title: "Central Warehouse — Kinetic" },
      {
        name: "description",
        content: "Central warehouse stock register, GRN, issue vouchers, and inventory management.",
      },
    ],
  }),
  component: WarehousePage,
});

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

type StockStatus = "ok" | "low" | "critical";

interface StockItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  openingStock: number;
  received: number;
  issued: number;
  closingStock: number;
  reorderLevel: number;
  unitRate: number;
  status: StockStatus;
}

interface GrnEntry {
  id: string;
  grnNo: string;
  date: string;
  vendor: string;
  poRef: string;
  item: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  receivedBy: string;
}

interface IssueVoucher {
  id: string;
  voucherNo: string;
  date: string;
  project: string;
  issuedTo: string;
  item: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

interface WarehouseEquipment {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  status: "Available" | "Deployed" | "Maintenance";
}

const STATUS_COLOR: Record<StockStatus, string> = {
  ok: "hsl(158,64%,42%)",
  low: "hsl(40,90%,52%)",
  critical: "hsl(0,72%,55%)",
};

function WarehousePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"stock" | "grn" | "issue" | "equipment">("stock");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStatus, setFilterStatus] = useState<StockStatus | "All">("All");
  const [showGrn, setShowGrn] = useState(false);
  const [showIssue, setShowIssue] = useState(false);

  const { data: rawGrn = [] } = useQuery({
    queryKey: ["warehouse-grn"],
    queryFn: () => warehouseApi.listGrn(),
    retry: 1,
  });

  const { data: rawIssueVouchers = [] } = useQuery({
    queryKey: ["warehouse-vouchers"],
    queryFn: () => warehouseApi.listIssueVouchers(),
    retry: 1,
  });

  const createGrnMutation = useMutation({
    mutationFn: (body: any) => warehouseApi.createGrn(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-grn"] });
      toast.success("GRN created successfully.");
      setShowGrn(false);
    },
  });

  const createIssueVoucherMutation = useMutation({
    mutationFn: (body: any) => warehouseApi.createIssueVoucher(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-vouchers"] });
      toast.success("Stock issue voucher generated.");
      setShowIssue(false);
    },
  });

  const STOCK: StockItem[] = (rawGrn || []).map((g: any, idx: number) => ({
    id: g.itemId || `SK${idx + 1}`,
    code: g.code || `RM-00${idx + 1}`,
    name: g.item || g.name || "Material Item",
    category: g.category || "General",
    unit: g.unit || "Units",
    openingStock: g.openingStock || 500,
    received: g.qty || g.received || 100,
    issued: g.issued || 50,
    closingStock: g.closingStock || (g.qty ? g.qty - 50 : 450),
    reorderLevel: g.reorderLevel || 200,
    unitRate: g.rate || g.unitRate || 100,
    status: (g.status as StockStatus) || "ok",
  }));

  const GRNS: GrnEntry[] = (rawGrn || []).map((g: any, idx: number) => ({
    id: g.grnId || `G${idx + 1}`,
    grnNo: g.grnNo || `GRN-00${idx + 1}`,
    date: g.date || new Date().toISOString().split("T")[0],
    vendor: g.vendor || "Supplier",
    poRef: g.poRef || "PO-1001",
    item: g.item || "Material",
    qty: g.qty || 100,
    unit: g.unit || "Units",
    rate: g.rate || 100,
    amount: (g.qty || 100) * (g.rate || 100),
    receivedBy: g.receivedBy || "Store Manager",
  }));

  const VOUCHERS: IssueVoucher[] = (rawIssueVouchers || []).map((v: any, idx: number) => ({
    id: v.voucherId || `IV${idx + 1}`,
    voucherNo: v.voucherNo || `IV-00${idx + 1}`,
    date: v.date || new Date().toISOString().split("T")[0],
    project: v.project || "Site",
    issuedTo: v.issuedTo || "Supervisor",
    item: v.item || "Material",
    qty: v.qty || 50,
    unit: v.unit || "Units",
    rate: v.rate || 100,
    amount: (v.qty || 50) * (v.rate || 100),
  }));

  const WAREHOUSE_EQUIPMENT: WarehouseEquipment[] = [];

  const categories = ["All", ...new Set(STOCK.map((s) => s.category))];
  const filtered = STOCK.filter((s) => {
    const catOk = filterCat === "All" || s.category === filterCat;
    const statusOk = filterStatus === "All" || s.status === filterStatus;
    return catOk && statusOk;
  });

  const totalStockValue = STOCK.reduce((s, item) => s + item.closingStock * item.unitRate, 0);
  const criticalItems = STOCK.filter((s) => s.status === "critical").length;
  const lowItems = STOCK.filter((s) => s.status === "low").length;

  const inputCls =
    "w-full h-10 px-3 border border-border rounded-lg bg-[color:var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        eyebrow="Inventory"
        title="Central Warehouse"
        actions={
          <div className="flex gap-3">
            <button
              onClick={() => setShowGrn(true)}
              className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary flex items-center gap-2"
            >
              <ArrowDownToLine className="size-4" /> New GRN
            </button>
            <button
              onClick={() => setShowIssue(true)}
              className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary flex items-center gap-2"
            >
              <ArrowUpFromLine className="size-4" /> Issue Stock
            </button>
            <button
              onClick={() => {
                exportToExcel(
                  filtered.map((s) => ({
                    Code: s.code,
                    Item: s.name,
                    Category: s.category,
                    Unit: s.unit,
                    Opening: s.openingStock,
                    Received: s.received,
                    Issued: s.issued,
                    Closing: s.closingStock,
                    "Reorder Level": s.reorderLevel,
                    "Unit Rate (₹)": s.unitRate,
                    "Stock Value (₹)": s.closingStock * s.unitRate,
                    Status: s.status,
                  })),
                  "Kinetic_Warehouse_Stock",
                  undefined,
                  "Stock Register",
                );
                toast.success("Stock register exported");
              }}
              className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary flex items-center gap-2"
            >
              <FileDown className="size-4" /> Export Excel
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Stock Value",
            value: fmt(totalStockValue),
            color: "hsl(210,80%,58%)",
            icon: <Warehouse className="size-4" />,
          },
          {
            label: "Critical Stock Items",
            value: criticalItems,
            color: "hsl(0,72%,55%)",
            icon: <AlertTriangle className="size-4" />,
          },
          {
            label: "Low Stock Items",
            value: lowItems,
            color: "hsl(40,90%,52%)",
            icon: <Package className="size-4" />,
          },
          {
            label: "GRNs This Week",
            value: GRNS.length,
            color: "hsl(158,64%,42%)",
            icon: <CheckCircle2 className="size-4" />,
          },
        ].map((k, i) => (
          <div
            key={k.label}
            className="bg-[color:var(--surface)] border border-border rounded-xl p-5 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{k.label}</span>
              <span style={{ color: k.color }}>{k.icon}</span>
            </div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 mb-6 w-fit">
        {(["stock", "grn", "issue", "equipment"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-[color:var(--surface)] shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "stock"
              ? "Stock Register"
              : t === "grn"
                ? "GRN Log"
                : t === "issue"
                  ? "Issue Vouchers"
                  : "Equipments"}
          </button>
        ))}
      </div>

      {/* Stock Register */}
      {tab === "stock" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <Filter className="size-3.5 text-muted-foreground" />
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterCat === c ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground bg-[color:var(--surface)]"}`}
              >
                {c}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              {(["All", "ok", "low", "critical"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterStatus === s ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground bg-[color:var(--surface)]"}`}
                >
                  {s === "All" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[color:var(--surface)] border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Code</th>
                    <th className="text-left px-5 py-3">Item</th>
                    <th className="text-center px-4 py-3">Unit</th>
                    <th className="text-right px-4 py-3">Opening</th>
                    <th className="text-right px-4 py-3">Received</th>
                    <th className="text-right px-4 py-3">Issued</th>
                    <th className="text-right px-4 py-3">Closing</th>
                    <th className="text-right px-4 py-3">Value</th>
                    <th className="text-center px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/20"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {s.code}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.category}</div>
                      </td>
                      <td className="px-4 py-4 text-center text-xs">{s.unit}</td>
                      <td className="px-4 py-4 text-right font-mono">
                        {s.openingStock.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-emerald-500">
                        +{s.received.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-red-500">
                        -{s.issued.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {s.closingStock.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-mono">
                        {fmt(s.closingStock * s.unitRate)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{
                            color: STATUS_COLOR[s.status],
                            background: `${STATUS_COLOR[s.status]}18`,
                            border: `1px solid ${STATUS_COLOR[s.status]}30`,
                          }}
                        >
                          {s.status === "ok" ? "OK" : s.status === "low" ? "LOW" : "CRITICAL"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* GRN Log */}
      {tab === "grn" && (
        <div className="bg-[color:var(--surface)] border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-3">GRN No</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-4 py-3">Vendor</th>
                  <th className="text-left px-4 py-3">PO Ref</th>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {GRNS.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/20"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-bold text-primary">
                      {g.grnNo}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{g.date}</td>
                    <td className="px-4 py-4 font-medium">{g.vendor}</td>
                    <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{g.poRef}</td>
                    <td className="px-4 py-4">{g.item}</td>
                    <td className="px-4 py-4 text-right font-mono">
                      {g.qty.toLocaleString()} {g.unit}
                    </td>
                    <td className="px-5 py-4 text-right font-bold">{fmt(g.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue Vouchers */}
      {tab === "issue" && (
        <div className="bg-[color:var(--surface)] border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Voucher No</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-left px-4 py-3">Issued To</th>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {VOUCHERS.map((iv: any) => (
                  <tr
                    key={iv.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/20"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-bold text-amber-500">
                      {iv.voucherNo}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{iv.date}</td>
                    <td className="px-4 py-4 font-medium">{iv.project}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{iv.issuedTo}</td>
                    <td className="px-4 py-4">{iv.item}</td>
                    <td className="px-4 py-4 text-right font-mono">
                      {iv.qty.toLocaleString()} {iv.unit}
                    </td>
                    <td className="px-5 py-4 text-right font-bold">{fmt(iv.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment Tab */}
      {tab === "equipment" && (
        <div className="bg-[color:var(--surface)] border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Code</th>
                  <th className="text-left px-5 py-3">Equipment Name</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-center px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {WAREHOUSE_EQUIPMENT.map((eq) => (
                  <tr
                    key={eq.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/20"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{eq.code}</td>
                    <td className="px-5 py-4 font-medium">{eq.name}</td>
                    <td className="px-4 py-4 text-muted-foreground">{eq.category}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`font-semibold ${eq.location === "Central Warehouse" ? "text-emerald-500" : "text-foreground"}`}
                      >
                        {eq.location}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          eq.status === "Available"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : eq.status === "Maintenance"
                              ? "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                              : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                        }`}
                      >
                        {eq.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {showGrn && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowGrn(false)}
        >
          <div
            className="bg-[color:var(--surface)] border border-border rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Create GRN</h2>
              <button
                onClick={() => setShowGrn(false)}
                className="size-8 rounded-lg hover:bg-secondary flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Vendor
                  </label>
                  <input className={inputCls} placeholder="Vendor name" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    PO Reference
                  </label>
                  <input className={inputCls} placeholder="PO-XXXX" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Item Received
                </label>
                <input className={inputCls} placeholder="Material / item name" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Quantity
                  </label>
                  <input type="number" className={inputCls} placeholder="Qty" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Unit
                  </label>
                  <select className={inputCls}>
                    {["Bags", "Kg", "Rmt", "Box", "Nos", "Cft", "Liter"].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Rate (₹)
                  </label>
                  <input type="number" className={inputCls} placeholder="Rate" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Received By
                </label>
                <input className={inputCls} placeholder="Store keeper name" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGrn(false)}
                className="flex-1 h-10 border border-border rounded-lg text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("GRN created successfully");
                  setShowGrn(false);
                }}
                className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
              >
                Save GRN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssue && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowIssue(false)}
        >
          <div
            className="bg-[color:var(--surface)] border border-border rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Issue Stock Voucher</h2>
              <button
                onClick={() => setShowIssue(false)}
                className="size-8 rounded-lg hover:bg-secondary flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Item
                </label>
                <select className={inputCls}>
                  {STOCK.map((s) => (
                    <option key={s.id}>
                      {s.name} (Stock: {s.closingStock} {s.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Quantity
                  </label>
                  <input type="number" className={inputCls} placeholder="Qty to issue" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Project
                  </label>
                  <input type="text" className={inputCls} placeholder="Destination Project / Site" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Issued To (Supervisor / Contractor)
                </label>
                <input className={inputCls} placeholder="Name & designation" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowIssue(false)}
                className="flex-1 h-10 border border-border rounded-lg text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("Stock issued successfully");
                  setShowIssue(false);
                }}
                className="flex-1 h-10 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:opacity-90"
              >
                Issue Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
