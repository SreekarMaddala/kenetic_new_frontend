import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { useState } from "react";
import { toast } from "sonner";
import { Warehouse, Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Plus, FileDown, X, CheckCircle2, Filter } from "lucide-react";
import { exportToExcel } from "../../../lib/excel";

export const Route = createFileRoute("/projects/$projectId/warehouse")({
  head: () => ({
    meta: [
      { title: "Central Warehouse — Kinetic" },
      { name: "description", content: "Central warehouse stock register, GRN, issue vouchers, and inventory management." },
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

const STOCK: StockItem[] = [
  { id: "SK01", code: "RM-001", name: "OPC Cement 53 Grade", category: "Cement",  unit: "Bags",  openingStock: 1200, received: 800, issued: 1680, closingStock: 320, reorderLevel: 500, unitRate: 440,   status: "low" },
  { id: "SK02", code: "RM-002", name: "TMT Steel Fe-500 12mm", category: "Steel",  unit: "Kg",   openingStock: 8000, received: 5000, issued: 11200, closingStock: 1800, reorderLevel: 2000, unitRate: 72, status: "low" },
  { id: "SK03", code: "RM-003", name: "M-Sand (Manufactured)",category: "Aggregate",unit: "Cft",  openingStock: 2200, received: 1500, issued: 2100, closingStock: 1600, reorderLevel: 500, unitRate: 28,  status: "ok" },
  { id: "SK04", code: "RM-004", name: "20mm Metal Aggregate", category: "Aggregate",unit: "Cft",  openingStock: 1800, received: 1200, issued: 1700, closingStock: 1300, reorderLevel: 400, unitRate: 22,  status: "ok" },
  { id: "SK05", code: "RM-005", name: "PVC Conduit 25mm",     category: "Electrical",unit: "Rmt", openingStock: 5000, received: 3000, issued: 7500, closingStock: 500, reorderLevel: 1000, unitRate: 42, status: "critical" },
  { id: "SK06", code: "RM-006", name: "CPVC Pipe 1 inch",     category: "Plumbing", unit: "Rmt",  openingStock: 3000, received: 2000, issued: 4200, closingStock: 800, reorderLevel: 500, unitRate: 78,  status: "ok" },
  { id: "SK07", code: "RM-007", name: "Vitrified Tiles 600x600",category: "Finishing",unit: "Box", openingStock: 800, received: 600, issued: 1100, closingStock: 300, reorderLevel: 200, unitRate: 2800, status: "ok" },
  { id: "SK08", code: "RM-008", name: "Wall Putty (20kg bag)",  category: "Finishing",unit: "Bag", openingStock: 400, received: 200, issued: 560, closingStock: 40, reorderLevel: 100, unitRate: 480,   status: "critical" },
  { id: "SK09", code: "SA-001", name: "Safety Helmets",         category: "Safety",  unit: "Nos",  openingStock: 150, received: 50, issued: 80, closingStock: 120, reorderLevel: 50, unitRate: 320,     status: "ok" },
  { id: "SK10", code: "SA-002", name: "Safety Harness Full Body",category: "Safety", unit: "Nos",  openingStock: 60,  received: 20, issued: 10, closingStock: 70, reorderLevel: 20, unitRate: 1800,    status: "ok" },
];

const GRNS: GrnEntry[] = [
  { id: "G1", grnNo: "GRN-0421", date: "11 Jul 2026", vendor: "UltraTech Cement",   poRef: "PO-1041", item: "OPC Cement 53 Grade",    qty: 800, unit: "Bags", rate: 440, amount: 352000, receivedBy: "Ravi Kumar (Store)" },
  { id: "G2", grnNo: "GRN-0422", date: "11 Jul 2026", vendor: "Jindal Steel Works",  poRef: "PO-1042", item: "TMT Steel Fe-500 12mm",   qty: 5000, unit: "Kg", rate: 72,  amount: 360000, receivedBy: "Ravi Kumar (Store)" },
  { id: "G3", grnNo: "GRN-0420", date: "09 Jul 2026", vendor: "Kajaria Ceramics",    poRef: "PO-1038", item: "Vitrified Tiles 600x600", qty: 600, unit: "Box", rate: 2800, amount: 1680000, receivedBy: "Store Asst." },
  { id: "G4", grnNo: "GRN-0419", date: "08 Jul 2026", vendor: "Finolex Industries",  poRef: "PO-1035", item: "PVC Conduit 25mm",         qty: 3000, unit: "Rmt", rate: 42, amount: 126000, receivedBy: "Ravi Kumar (Store)" },
  { id: "G5", grnNo: "GRN-0418", date: "06 Jul 2026", vendor: "Astral Pipes",         poRef: "PO-1032", item: "CPVC Pipe 1 inch",         qty: 2000, unit: "Rmt", rate: 78, amount: 156000, receivedBy: "Store Asst." },
];

const ISSUES: IssueVoucher[] = [
  { id: "IV1", voucherNo: "IV-2081", date: "12 Jul 2026", project: "DLF Camellias",     issuedTo: "Vikram Rao (Sup.)", item: "OPC Cement 53 Grade", qty: 200, unit: "Bags", rate: 440, amount: 88000 },
  { id: "IV2", voucherNo: "IV-2082", date: "12 Jul 2026", project: "Lodha World Towers", issuedTo: "Suresh Iyer (Sup.)",item: "TMT Steel Fe-500 12mm",qty: 2000,unit: "Kg",  rate: 72,  amount: 144000 },
  { id: "IV3", voucherNo: "IV-2080", date: "11 Jul 2026", project: "DLF Camellias",     issuedTo: "Vikram Rao (Sup.)", item: "Safety Helmets",      qty: 30, unit: "Nos",  rate: 320, amount: 9600 },
  { id: "IV4", voucherNo: "IV-2079", date: "10 Jul 2026", project: "Prestige Lakeside", issuedTo: "Priya Menon (Sup.)",item: "CPVC Pipe 1 inch",     qty: 500, unit: "Rmt", rate: 78, amount: 39000 },
];

interface WarehouseEquipment {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  status: "Available" | "Deployed" | "Maintenance";
}

const WAREHOUSE_EQUIPMENT: WarehouseEquipment[] = [
  { id: "WE1", code: "EQ-B02", name: "JCB Backhoe Loader (3DX)", category: "Earthmoving", location: "DLF Camellias", status: "Deployed" },
  { id: "WE2", code: "EQ-C01", name: "Tower Crane 1 (Potain MCT 85)", category: "Lifting", location: "Prestige Lakeside", status: "Deployed" },
  { id: "WE3", code: "EQ-G01", name: "Diesel Generator 500kVA", category: "Power", location: "Central Warehouse", status: "Available" },
  { id: "WE4", code: "EQ-F01", name: "Rebar Cutting Machine (GW40)", category: "Fabrication", location: "Central Warehouse", status: "Available" },
  { id: "WE5", code: "EQ-M01", name: "Concrete Mixer (200L)", category: "Concreting", location: "Central Warehouse", status: "Maintenance" },
];

const STATUS_COLOR: Record<StockStatus, string> = { ok: "hsl(158,64%,42%)", low: "hsl(40,90%,52%)", critical: "hsl(0,72%,55%)" };

function WarehousePage() {
  const [tab, setTab] = useState<"stock" | "grn" | "issue" | "equipment">("stock");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStatus, setFilterStatus] = useState<StockStatus | "All">("All");
  const [showGrn, setShowGrn] = useState(false);
  const [showIssue, setShowIssue] = useState(false);

  const categories = ["All", ...new Set(STOCK.map((s) => s.category))];
  const filtered = STOCK.filter((s) => {
    const catOk = filterCat === "All" || s.category === filterCat;
    const statusOk = filterStatus === "All" || s.status === filterStatus;
    return catOk && statusOk;
  });

  const totalStockValue = STOCK.reduce((s, item) => s + item.closingStock * item.unitRate, 0);
  const criticalItems = STOCK.filter((s) => s.status === "critical").length;
  const lowItems = STOCK.filter((s) => s.status === "low").length;

  const inputCls = "w-full h-10 px-3 border border-border rounded-lg bg-[color:var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        eyebrow="Inventory"
        title="Central Warehouse"
        actions={
          <div className="flex gap-3">
            <button onClick={() => setShowGrn(true)} className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary flex items-center gap-2">
              <ArrowDownToLine className="size-4" /> New GRN
            </button>
            <button onClick={() => setShowIssue(true)} className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary flex items-center gap-2">
              <ArrowUpFromLine className="size-4" /> Issue Stock
            </button>
            <button onClick={() => { exportToExcel(filtered.map(s => ({ "Code": s.code, "Item": s.name, "Category": s.category, "Unit": s.unit, "Opening": s.openingStock, "Received": s.received, "Issued": s.issued, "Closing": s.closingStock, "Reorder Level": s.reorderLevel, "Unit Rate (₹)": s.unitRate, "Stock Value (₹)": s.closingStock * s.unitRate, "Status": s.status })), "Kinetic_Warehouse_Stock", undefined, "Stock Register"); toast.success("Stock register exported"); }} className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary flex items-center gap-2">
              <FileDown className="size-4" /> Export Excel
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Stock Value",   value: fmt(totalStockValue), color: "hsl(210,80%,58%)", icon: <Warehouse className="size-4" /> },
          { label: "Critical Stock Items",value: criticalItems,        color: "hsl(0,72%,55%)",   icon: <AlertTriangle className="size-4" /> },
          { label: "Low Stock Items",      value: lowItems,             color: "hsl(40,90%,52%)",  icon: <Package className="size-4" /> },
          { label: "GRNs This Week",       value: GRNS.length,          color: "hsl(158,64%,42%)", icon: <CheckCircle2 className="size-4" /> },
        ].map((k, i) => (
          <div key={k.label} className="bg-[color:var(--surface)] border border-border rounded-xl p-5 animate-fade-up" style={{ animationDelay: `${i*60}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{k.label}</span>
              <span style={{ color: k.color }}>{k.icon}</span>
            </div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 mb-6 w-fit">
        {(["stock", "grn", "issue", "equipment"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-[color:var(--surface)] shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "stock" ? "Stock Register" : t === "grn" ? "GRN Log" : t === "issue" ? "Issue Vouchers" : "Equipments"}
          </button>
        ))}
      </div>

      {/* Stock Register */}
      {tab === "stock" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <Filter className="size-3.5 text-muted-foreground" />
            {categories.map((c) => (
              <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterCat === c ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground bg-[color:var(--surface)]"}`}>{c}</button>
            ))}
            <div className="ml-auto flex gap-2">
              {(["All", "ok", "low", "critical"] as const).map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterStatus === s ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground bg-[color:var(--surface)]"}`}>{s === "All" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="bg-[color:var(--surface)] border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Code</th><th className="text-left px-5 py-3">Item</th><th className="text-center px-4 py-3">Unit</th>
                    <th className="text-right px-4 py-3">Opening</th><th className="text-right px-4 py-3">Received</th><th className="text-right px-4 py-3">Issued</th>
                    <th className="text-right px-4 py-3">Closing</th><th className="text-right px-4 py-3">Value</th><th className="text-center px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{s.code}</td>
                      <td className="px-5 py-4"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.category}</div></td>
                      <td className="px-4 py-4 text-center text-xs">{s.unit}</td>
                      <td className="px-4 py-4 text-right font-mono">{s.openingStock.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right font-mono text-emerald-500">+{s.received.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right font-mono text-red-500">-{s.issued.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right font-bold">{s.closingStock.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right font-mono">{fmt(s.closingStock * s.unitRate)}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ color: STATUS_COLOR[s.status], background: `${STATUS_COLOR[s.status]}18`, border: `1px solid ${STATUS_COLOR[s.status]}30` }}>
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
                  <th className="text-left px-5 py-3">GRN No</th><th className="text-left px-5 py-3">Date</th><th className="text-left px-4 py-3">Vendor</th>
                  <th className="text-left px-4 py-3">PO Ref</th><th className="text-left px-4 py-3">Item</th><th className="text-right px-4 py-3">Qty</th><th className="text-right px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {GRNS.map((g) => (
                  <tr key={g.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="px-5 py-4 font-mono text-xs font-bold text-primary">{g.grnNo}</td>
                    <td className="px-5 py-4 text-muted-foreground">{g.date}</td>
                    <td className="px-4 py-4 font-medium">{g.vendor}</td>
                    <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{g.poRef}</td>
                    <td className="px-4 py-4">{g.item}</td>
                    <td className="px-4 py-4 text-right font-mono">{g.qty.toLocaleString()} {g.unit}</td>
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
                  <th className="text-left px-5 py-3">Voucher No</th><th className="text-left px-5 py-3">Date</th><th className="text-left px-4 py-3">Project</th>
                  <th className="text-left px-4 py-3">Issued To</th><th className="text-left px-4 py-3">Item</th><th className="text-right px-4 py-3">Qty</th><th className="text-right px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ISSUES.map((iv) => (
                  <tr key={iv.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="px-5 py-4 font-mono text-xs font-bold text-amber-500">{iv.voucherNo}</td>
                    <td className="px-5 py-4 text-muted-foreground">{iv.date}</td>
                    <td className="px-4 py-4 font-medium">{iv.project}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{iv.issuedTo}</td>
                    <td className="px-4 py-4">{iv.item}</td>
                    <td className="px-4 py-4 text-right font-mono">{iv.qty.toLocaleString()} {iv.unit}</td>
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
                  <tr key={eq.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{eq.code}</td>
                    <td className="px-5 py-4 font-medium">{eq.name}</td>
                    <td className="px-4 py-4 text-muted-foreground">{eq.category}</td>
                    <td className="px-4 py-4">
                      <span className={`font-semibold ${eq.location === "Central Warehouse" ? "text-emerald-500" : "text-foreground"}`}>
                        {eq.location}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        eq.status === "Available" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                        eq.status === "Maintenance" ? "bg-orange-500/10 text-orange-600 border border-orange-500/20" :
                        "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                      }`}>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGrn(false)}>
          <div className="bg-[color:var(--surface)] border border-border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold">Create GRN</h2><button onClick={() => setShowGrn(false)} className="size-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="size-4" /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Vendor</label><input className={inputCls} placeholder="Vendor name" /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">PO Reference</label><input className={inputCls} placeholder="PO-XXXX" /></div>
              </div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Item Received</label><input className={inputCls} placeholder="Material / item name" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Quantity</label><input type="number" className={inputCls} placeholder="Qty" /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Unit</label><select className={inputCls}>{["Bags","Kg","Rmt","Box","Nos","Cft","Liter"].map(u=><option key={u}>{u}</option>)}</select></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Rate (₹)</label><input type="number" className={inputCls} placeholder="Rate" /></div>
              </div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Received By</label><input className={inputCls} placeholder="Store keeper name" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowGrn(false)} className="flex-1 h-10 border border-border rounded-lg text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={() => { toast.success("GRN created successfully"); setShowGrn(false); }} className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">Save GRN</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowIssue(false)}>
          <div className="bg-[color:var(--surface)] border border-border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold">Issue Stock Voucher</h2><button onClick={() => setShowIssue(false)} className="size-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="size-4" /></button></div>
            <div className="space-y-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Item</label>
                <select className={inputCls}>{STOCK.map(s=><option key={s.id}>{s.name} (Stock: {s.closingStock} {s.unit})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Quantity</label><input type="number" className={inputCls} placeholder="Qty to issue" /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Project</label><select className={inputCls}>{["DLF Camellias","Lodha World Towers","Prestige Lakeside","Brigade Cornerstone"].map(p=><option key={p}>{p}</option>)}</select></div>
              </div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Issued To (Supervisor / Contractor)</label><input className={inputCls} placeholder="Name & designation" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowIssue(false)} className="flex-1 h-10 border border-border rounded-lg text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={() => { toast.success("Stock issued successfully"); setShowIssue(false); }} className="flex-1 h-10 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:opacity-90">Issue Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
