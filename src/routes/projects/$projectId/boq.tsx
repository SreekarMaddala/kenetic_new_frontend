import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileText, Plus, Download, ChevronDown, ChevronRight,
  CheckCircle2, AlertTriangle, Clock, FileDown, X,
} from "lucide-react";
import { exportToExcel } from "../../../lib/excel";

export const Route = createFileRoute("/projects/$projectId/boq")({
  head: () => ({
    meta: [
      { title: "BOQ & RA Bills — Kinetic" },
      { name: "description", content: "Bill of Quantities and Running Account Bills for all construction projects." },
    ],
  }),
  component: BoqPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface BoqItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  budgetedQty: number;
  rate: number;
  amount: number;
  category: string;
  billedQty: number;
}

interface RaBill {
  id: string;
  project: string;
  billNo: string;
  date: string;
  from: string;
  to: string;
  amount: number;
  status: "Draft" | "Submitted" | "Certified" | "Paid";
  items: { description: string; qty: number; rate: number; amount: number }[];
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const PROJECTS = ["DLF Camellias", "Lodha World Towers", "Prestige Lakeside", "Brigade Cornerstone"];

const BOQ_DATA: BoqItem[] = [
  { id: "B01", code: "CW-001", description: "Excavation in all types of soil", unit: "Cum", budgetedQty: 1200, rate: 380, amount: 456000, category: "Civil Works", billedQty: 850 },
  { id: "B02", code: "CW-002", description: "PCC M15 grade (1:2:4)", unit: "Cum", budgetedQty: 240, rate: 4200, amount: 1008000, category: "Civil Works", billedQty: 200 },
  { id: "B03", code: "CW-003", description: "RCC M30 grade columns & slabs", unit: "Cum", budgetedQty: 820, rate: 7500, amount: 6150000, category: "Civil Works", billedQty: 480 },
  { id: "B04", code: "CW-004", description: "TMT Fe-500 reinforcement steel", unit: "MT", budgetedQty: 95, rate: 72000, amount: 6840000, category: "Civil Works", billedQty: 58 },
  { id: "B05", code: "CW-005", description: "Brick masonry in cement mortar 1:6", unit: "Cum", budgetedQty: 640, rate: 3800, amount: 2432000, category: "Civil Works", billedQty: 320 },
  { id: "B06", code: "FW-001", description: "Internal wall plastering 12mm thk", unit: "Sqm", budgetedQty: 8400, rate: 185, amount: 1554000, category: "Finishing Works", billedQty: 2100 },
  { id: "B07", code: "FW-002", description: "External wall plastering 20mm thk", unit: "Sqm", budgetedQty: 3200, rate: 220, amount: 704000, category: "Finishing Works", billedQty: 0 },
  { id: "B08", code: "FW-003", description: "Vitrified floor tiles 600x600mm", unit: "Sqm", budgetedQty: 4800, rate: 650, amount: 3120000, category: "Finishing Works", billedQty: 800 },
  { id: "B09", code: "FW-004", description: "OBD paint 2 coats internal", unit: "Sqm", budgetedQty: 9200, rate: 95, amount: 874000, category: "Finishing Works", billedQty: 0 },
  { id: "B10", code: "EP-001", description: "PVC conduit 25mm concealed wiring", unit: "Rmt", budgetedQty: 12000, rate: 82, amount: 984000, category: "Electrical", billedQty: 6200 },
  { id: "B11", code: "EP-002", description: "MCB Distribution board 8-way", unit: "Nos", budgetedQty: 120, rate: 2200, amount: 264000, category: "Electrical", billedQty: 45 },
  { id: "B12", code: "PL-001", description: "CPVC hot/cold plumbing 25mm", unit: "Rmt", budgetedQty: 8500, rate: 145, amount: 1232500, category: "Plumbing", billedQty: 3200 },
];

const RA_BILLS: RaBill[] = [
  {
    id: "RA1", project: "DLF Camellias", billNo: "RA/DLF/001", date: "30 Jun 2026",
    from: "01 Apr 2026", to: "30 Jun 2026", amount: 4820000, status: "Certified",
    items: [
      { description: "Excavation in all types of soil", qty: 850, rate: 380, amount: 323000 },
      { description: "PCC M15 grade", qty: 200, rate: 4200, amount: 840000 },
      { description: "RCC M30 grade", qty: 480, rate: 7500, amount: 3600000 },
      { description: "TMT Fe-500 steel", qty: 15, rate: 72000, amount: 1080000 },
    ],
  },
  {
    id: "RA2", project: "Lodha World Towers", billNo: "RA/LWT/002", date: "30 Jun 2026",
    from: "01 May 2026", to: "30 Jun 2026", amount: 2950000, status: "Submitted",
    items: [
      { description: "PVC conduit wiring 25mm", qty: 6200, rate: 82, amount: 508400 },
      { description: "CPVC plumbing 25mm", qty: 3200, rate: 145, amount: 464000 },
      { description: "MCB DB 8-way", qty: 45, rate: 2200, amount: 99000 },
    ],
  },
  {
    id: "RA3", project: "Prestige Lakeside", billNo: "RA/PL/001", date: "15 Jul 2026",
    from: "01 Jun 2026", to: "14 Jul 2026", amount: 1840000, status: "Draft",
    items: [
      { description: "Brick masonry 1:6", qty: 320, rate: 3800, amount: 1216000 },
      { description: "Internal plastering 12mm", qty: 2100, rate: 185, amount: 388500 },
    ],
  },
];

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<RaBill["status"], { color: string; bg: string; border: string }> = {
  Draft:     { color: "hsl(220,10%,55%)",  bg: "hsl(220,10%,55%,0.10)", border: "hsl(220,10%,55%,0.25)" },
  Submitted: { color: "hsl(210,80%,58%)",  bg: "hsl(210,80%,58%,0.10)", border: "hsl(210,80%,58%,0.25)" },
  Certified: { color: "hsl(158,64%,42%)",  bg: "hsl(158,64%,42%,0.10)", border: "hsl(158,64%,42%,0.25)" },
  Paid:      { color: "hsl(280,65%,60%)",  bg: "hsl(280,65%,60%,0.10)", border: "hsl(280,65%,60%,0.25)" },
};

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

// ── Main Component ─────────────────────────────────────────────────────────────

function BoqPage() {
  const [activeTab, setActiveTab] = useState<"boq" | "ra">("boq");
  const [selectedProject, setSelectedProject] = useState("DLF Camellias");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Civil Works");
  const [expandedRa, setExpandedRa] = useState<string | null>(null);
  const [showNewRa, setShowNewRa] = useState(false);

  const categories = [...new Set(BOQ_DATA.map((b) => b.category))];
  const totalBudget = BOQ_DATA.reduce((s, b) => s + b.amount, 0);
  const totalBilled = BOQ_DATA.reduce((s, b) => s + b.billedQty * b.rate, 0);
  const totalBalance = totalBudget - totalBilled;
  const pct = Math.round((totalBilled / totalBudget) * 100);

  const handleExportBoq = () => {
    exportToExcel(
      BOQ_DATA.map((b) => ({
        "Item Code": b.code, "Description": b.description, "Unit": b.unit,
        "Budgeted Qty": b.budgetedQty, "Rate (₹)": b.rate,
        "BOQ Amount (₹)": b.amount, "Billed Qty": b.billedQty,
        "Billed Amount (₹)": b.billedQty * b.rate,
        "Balance (₹)": b.amount - b.billedQty * b.rate,
        "% Complete": Math.round((b.billedQty / b.budgetedQty) * 100) + "%",
      })),
      `Kinetic_BOQ_${selectedProject.replace(/ /g, "_")}`,
      undefined, "Bill of Quantities"
    );
    toast.success("BOQ exported to Excel");
  };

  const handleExportRa = () => {
    exportToExcel(
      RA_BILLS.map((r) => ({
        "Bill No": r.billNo, "Project": r.project, "Date": r.date,
        "Period From": r.from, "Period To": r.to,
        "Amount (₹)": r.amount, "Status": r.status,
      })),
      "Kinetic_RA_Bills",
      undefined, "RA Bills Summary"
    );
    toast.success("RA Bills exported to Excel");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        eyebrow="Finance"
        title="BOQ & RA Bills"
        actions={
          <div className="flex gap-3">
            <select
              className="h-10 px-3 text-sm border border-border rounded-lg bg-[color:var(--surface)]"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {PROJECTS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <button onClick={activeTab === "boq" ? handleExportBoq : handleExportRa} className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary flex items-center gap-2">
              <FileDown className="size-4" /> Export Excel
            </button>
            {activeTab === "ra" && (
              <button onClick={() => setShowNewRa(true)} className="h-10 px-5 bg-foreground text-background rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2">
                <Plus className="size-4" /> New RA Bill
              </button>
            )}
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total BOQ Value",   value: fmt(totalBudget),  color: "hsl(210,80%,58%)", sub: `${BOQ_DATA.length} items` },
          { label: "Amount Billed",     value: fmt(totalBilled),  color: "hsl(158,64%,42%)", sub: `${pct}% of BOQ` },
          { label: "Balance to Bill",   value: fmt(totalBalance), color: "hsl(40,90%,52%)",  sub: `${100 - pct}% remaining` },
          { label: "RA Bills Raised",   value: RA_BILLS.length,   color: "hsl(280,65%,60%)", sub: `${RA_BILLS.filter(r=>r.status==="Certified").length} Certified` },
        ].map((k, i) => (
          <div key={k.label} className="bg-[color:var(--surface)] border border-border rounded-xl p-5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-[color:var(--surface)] border border-border rounded-xl p-5 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold">BOQ Billing Progress</span>
          <span className="font-bold text-primary">{pct}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Billed: {fmt(totalBilled)}</span>
          <span>Balance: {fmt(totalBalance)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 mb-6 w-fit">
        {(["boq", "ra"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? "bg-[color:var(--surface)] shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "boq" ? "Bill of Quantities" : "RA Bills"}
          </button>
        ))}
      </div>

      {/* BOQ Tab */}
      {activeTab === "boq" && (
        <div className="space-y-3">
          {categories.map((cat) => {
            const items = BOQ_DATA.filter((b) => b.category === cat);
            const catTotal = items.reduce((s, b) => s + b.amount, 0);
            const catBilled = items.reduce((s, b) => s + b.billedQty * b.rate, 0);
            const open = expandedCategory === cat;
            return (
              <div key={cat} className="bg-[color:var(--surface)] border border-border rounded-xl overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors" onClick={() => setExpandedCategory(open ? null : cat)}>
                  <div className="flex items-center gap-3">
                    {open ? <ChevronDown className="size-4 text-primary" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                    <span className="font-semibold">{cat}</span>
                    <span className="text-xs text-muted-foreground">({items.length} items)</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right"><div className="text-xs text-muted-foreground">BOQ</div><div className="font-bold">{fmt(catTotal)}</div></div>
                    <div className="text-right"><div className="text-xs text-muted-foreground">Billed</div><div className="font-bold text-primary">{fmt(catBilled)}</div></div>
                    <div className="text-right"><div className="text-xs text-muted-foreground">Balance</div><div className="font-bold text-amber-500">{fmt(catTotal - catBilled)}</div></div>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                          <th className="text-left px-5 py-3">Code</th>
                          <th className="text-left px-5 py-3">Description</th>
                          <th className="text-center px-4 py-3">Unit</th>
                          <th className="text-right px-4 py-3">Budgeted Qty</th>
                          <th className="text-right px-4 py-3">Rate</th>
                          <th className="text-right px-4 py-3">BOQ Amt</th>
                          <th className="text-right px-4 py-3">Billed Qty</th>
                          <th className="text-right px-5 py-3">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((b) => {
                          const billedAmt = b.billedQty * b.rate;
                          const pct = Math.round((b.billedQty / b.budgetedQty) * 100);
                          return (
                            <tr key={b.id} className="border-t border-border hover:bg-secondary/20">
                              <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{b.code}</td>
                              <td className="px-5 py-3 font-medium">{b.description}</td>
                              <td className="px-4 py-3 text-center text-xs">{b.unit}</td>
                              <td className="px-4 py-3 text-right font-mono">{b.budgetedQty.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-mono">{fmt(b.rate)}</td>
                              <td className="px-4 py-3 text-right font-semibold">{fmt(b.amount)}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="font-mono">{b.billedQty.toLocaleString()}</div>
                                <div className="text-xs font-bold" style={{ color: pct >= 80 ? "hsl(158,64%,42%)" : pct >= 40 ? "hsl(40,90%,52%)" : "hsl(220,10%,55%)" }}>{pct}%</div>
                              </td>
                              <td className="px-5 py-3 text-right font-semibold text-amber-500">{fmt(b.amount - billedAmt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* RA Bills Tab */}
      {activeTab === "ra" && (
        <div className="space-y-4">
          {RA_BILLS.map((r) => {
            const s = STATUS_STYLE[r.status];
            const open = expandedRa === r.id;
            return (
              <div key={r.id} className="bg-[color:var(--surface)] border border-border rounded-xl overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors text-left" onClick={() => setExpandedRa(open ? null : r.id)}>
                  <div className="flex items-center gap-4">
                    {open ? <ChevronDown className="size-4 text-primary shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
                    <div>
                      <div className="font-bold">{r.billNo}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.project} · Period: {r.from} – {r.to}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Bill Amount</div>
                      <div className="font-bold text-lg">{fmt(r.amount)}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{r.status}</span>
                    <div className="text-xs text-muted-foreground">{r.date}</div>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                          <th className="text-left px-5 py-3">Description</th>
                          <th className="text-right px-4 py-3">Qty</th>
                          <th className="text-right px-4 py-3">Rate</th>
                          <th className="text-right px-5 py-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.items.map((item, i) => (
                          <tr key={i} className="border-t border-border hover:bg-secondary/20">
                            <td className="px-5 py-3 font-medium">{item.description}</td>
                            <td className="px-4 py-3 text-right font-mono">{item.qty.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmt(item.rate)}</td>
                            <td className="px-5 py-3 text-right font-bold">{fmt(item.amount)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-primary/30 bg-primary/5">
                          <td colSpan={3} className="px-5 py-3 font-bold text-right">Total Bill Amount</td>
                          <td className="px-5 py-3 text-right font-bold text-primary text-lg">{fmt(r.amount)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex justify-end gap-3 px-5 py-4 border-t border-border bg-secondary/10">
                      {r.status === "Draft" && (
                        <button onClick={() => toast.success("RA Bill submitted for certification")} className="h-9 px-5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90">Submit for Certification</button>
                      )}
                      <button onClick={() => { exportToExcel(r.items.map(i => ({ "Description": i.description, "Qty": i.qty, "Rate (₹)": i.rate, "Amount (₹)": i.amount })), `RA_Bill_${r.billNo}`, undefined, r.billNo); toast.success("RA Bill exported"); }} className="h-9 px-4 border border-border text-sm rounded-lg flex items-center gap-2 hover:bg-secondary">
                        <FileDown className="size-3.5" /> Export Bill
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New RA Bill Modal */}
      {showNewRa && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewRa(false)}>
          <div className="bg-[color:var(--surface)] border border-border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Create New RA Bill</h2>
              <button onClick={() => setShowNewRa(false)} className="size-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="size-4" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Project</label>
                <select className="w-full h-10 px-3 border border-border rounded-lg bg-[color:var(--surface)] text-sm">{PROJECTS.map(p=><option key={p}>{p}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Period From</label><input type="date" className="w-full h-10 px-3 border border-border rounded-lg bg-[color:var(--surface)] text-sm" /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Period To</label><input type="date" className="w-full h-10 px-3 border border-border rounded-lg bg-[color:var(--surface)] text-sm" /></div>
              </div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Remarks</label><textarea rows={2} className="w-full px-3 py-2 border border-border rounded-lg bg-[color:var(--surface)] text-sm resize-none" placeholder="Measurement details, reference drawings…" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewRa(false)} className="flex-1 h-10 border border-border rounded-lg text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={() => { toast.success("RA Bill created as Draft"); setShowNewRa(false); }} className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">Create Draft</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
