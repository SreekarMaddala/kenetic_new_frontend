import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { useState } from "react";
import { toast } from "sonner";
import {
  Wrench,
  Building2,
  Phone,
  Plus,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  FileDown,
  X,
  ChevronRight,
  AlertTriangle,
  Users,
  Filter,
} from "lucide-react";
import { exportToExcel } from "../../../lib/excel";

export const Route = createFileRoute("/projects/$projectId/subcontractors")({
  head: () => ({
    meta: [
      { title: "Sub-Contractors — Kinetic" },
      {
        name: "description",
        content:
          "Manage sub-contractors and their material procurement requests across all active construction sites.",
      },
    ],
  }),
  component: SubContractorsPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type MprStatus = "Pending" | "Approved" | "Dispatched" | "Delivered";
type MprUrgency = "Normal" | "Urgent" | "Critical";

interface SubContractor {
  id: string;
  name: string;
  company: string;
  initials: string;
  trade: string;
  site: string;
  phone: string;
  contractValue: string;
  openMprs: number;
  status: "Active" | "Inactive" | "Suspended";
  color: string;
}

interface MaterialProcurementRequest {
  id: string;
  contractorId: string;
  contractorName: string;
  site: string;
  item: string;
  quantity: string;
  unit: string;
  estimatedCost: string;
  urgency: MprUrgency;
  status: MprStatus;
  raisedOn: string;
  remark: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const CONTRACTORS: SubContractor[] = [
  {
    id: "SC1",
    name: "Ravi Kumar",
    company: "Kumar Civil Works",
    initials: "KC",
    trade: "Civil & Structural",
    site: "DLF Camellias",
    phone: "+91 98100 11223",
    contractValue: "₹2.4Cr",
    openMprs: 3,
    status: "Active",
    color: "hsl(158,64%,38%)",
  },
  {
    id: "SC2",
    name: "Suresh Mehta",
    company: "Mehta MEP Solutions",
    initials: "MM",
    trade: "Mechanical, Electrical & Plumbing",
    site: "Lodha World Towers",
    phone: "+91 87654 44321",
    contractValue: "₹1.8Cr",
    openMprs: 5,
    status: "Active",
    color: "hsl(210,80%,55%)",
  },
  {
    id: "SC3",
    name: "Anita Sharma",
    company: "Sharma Interiors",
    initials: "SI",
    trade: "Interior Finishing & Fit-out",
    site: "Prestige Lakeside",
    phone: "+91 99201 77654",
    contractValue: "₹90L",
    openMprs: 2,
    status: "Active",
    color: "hsl(280,65%,60%)",
  },
  {
    id: "SC4",
    name: "Mohan Reddy",
    company: "Reddy Waterproofing Co.",
    initials: "RW",
    trade: "Waterproofing & Tiling",
    site: "Brigade Cornerstone",
    phone: "+91 90090 55667",
    contractValue: "₹55L",
    openMprs: 1,
    status: "Active",
    color: "hsl(22,90%,48%)",
  },
  {
    id: "SC5",
    name: "Deepak Joshi",
    company: "Joshi Steel Fabricators",
    initials: "JS",
    trade: "Steel Fabrication & Erection",
    site: "Godrej Reflections",
    phone: "+91 88001 23456",
    contractValue: "₹3.1Cr",
    openMprs: 0,
    status: "Inactive",
    color: "hsl(40,90%,48%)",
  },
];

const INITIAL_MPRS: MaterialProcurementRequest[] = [
  {
    id: "MPR-1001",
    contractorId: "SC1",
    contractorName: "Kumar Civil Works",
    site: "DLF Camellias",
    item: "OPC Cement 53 Grade",
    quantity: "300",
    unit: "Bags",
    estimatedCost: "₹1,32,000",
    urgency: "Urgent",
    status: "Pending",
    raisedOn: "12 Jul 2026",
    remark: "Required for slab casting on 6th floor, scheduled for 14 Jul",
  },
  {
    id: "MPR-1002",
    contractorId: "SC2",
    contractorName: "Mehta MEP Solutions",
    site: "Lodha World Towers",
    item: "GI Conduit 25mm",
    quantity: "800",
    unit: "Meters",
    estimatedCost: "₹64,000",
    urgency: "Normal",
    status: "Approved",
    raisedOn: "11 Jul 2026",
    remark: "For electrical rough-in, Tower B floors 10–14",
  },
  {
    id: "MPR-1003",
    contractorId: "SC2",
    contractorName: "Mehta MEP Solutions",
    site: "Lodha World Towers",
    item: "CPVC Pipes 1 inch",
    quantity: "500",
    unit: "Meters",
    estimatedCost: "₹45,000",
    urgency: "Normal",
    status: "Dispatched",
    raisedOn: "10 Jul 2026",
    remark: "Plumbing risers — Tower A",
  },
  {
    id: "MPR-1004",
    contractorId: "SC3",
    contractorName: "Sharma Interiors",
    site: "Prestige Lakeside",
    item: "Gypsum Board 12mm",
    quantity: "1200",
    unit: "Sheets",
    estimatedCost: "₹2,16,000",
    urgency: "Normal",
    status: "Delivered",
    raisedOn: "8 Jul 2026",
    remark: "False ceiling for amenity floor",
  },
  {
    id: "MPR-1005",
    contractorId: "SC1",
    contractorName: "Kumar Civil Works",
    site: "DLF Camellias",
    item: "TMT Steel 16mm",
    quantity: "8",
    unit: "Tons",
    estimatedCost: "₹5,60,000",
    urgency: "Critical",
    status: "Pending",
    raisedOn: "12 Jul 2026",
    remark: "Column reinforcement — basement to 2nd floor, cannot delay",
  },
  {
    id: "MPR-1006",
    contractorId: "SC4",
    contractorName: "Reddy Waterproofing Co.",
    site: "Brigade Cornerstone",
    item: "SBR Waterproofing Compound",
    quantity: "200",
    unit: "Kgs",
    estimatedCost: "₹28,000",
    urgency: "Normal",
    status: "Approved",
    raisedOn: "11 Jul 2026",
    remark: "Terrace waterproofing coat 2",
  },
  {
    id: "MPR-1007",
    contractorId: "SC2",
    contractorName: "Mehta MEP Solutions",
    site: "Lodha World Towers",
    item: "MCB Distribution Board 8-way",
    quantity: "20",
    unit: "Units",
    estimatedCost: "₹40,000",
    urgency: "Urgent",
    status: "Pending",
    raisedOn: "12 Jul 2026",
    remark: "Apartment distribution boards — Tower B",
  },
];

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<MprStatus, string> = {
  Pending: "hsl(40,90%,52%)",
  Approved: "hsl(210,80%,58%)",
  Dispatched: "hsl(280,65%,60%)",
  Delivered: "hsl(158,64%,42%)",
};
const STATUS_BG: Record<MprStatus, string> = {
  Pending: "hsl(40,90%,52% / 0.12)",
  Approved: "hsl(210,80%,58% / 0.12)",
  Dispatched: "hsl(280,65%,60% / 0.12)",
  Delivered: "hsl(158,64%,42% / 0.12)",
};
const URGENCY_COLOR: Record<MprUrgency, string> = {
  Normal: "hsl(158,64%,42%)",
  Urgent: "hsl(40,90%,52%)",
  Critical: "hsl(0,78%,55%)",
};

const MPR_WORKFLOW: MprStatus[] = ["Pending", "Approved", "Dispatched", "Delivered"];

// ── Raise MPR Modal ────────────────────────────────────────────────────────────

function RaiseMprModal({
  contractors,
  onClose,
  onRaise,
}: {
  contractors: SubContractor[];
  onClose: () => void;
  onRaise: (mpr: MaterialProcurementRequest) => void;
}) {
  const [form, setForm] = useState({
    contractorId: contractors[0]?.id ?? "",
    item: "",
    quantity: "",
    unit: "Bags",
    estimatedCost: "",
    urgency: "Normal" as MprUrgency,
    remark: "",
  });

  const submit = () => {
    if (!form.item || !form.quantity) {
      toast.error("Please fill item name and quantity");
      return;
    }
    const contractor = contractors.find((c) => c.id === form.contractorId)!;
    const newMpr: MaterialProcurementRequest = {
      id: `MPR-${1008 + Math.floor(Math.random() * 100)}`,
      contractorId: form.contractorId,
      contractorName: contractor.company,
      site: contractor.site,
      item: form.item,
      quantity: form.quantity,
      unit: form.unit,
      estimatedCost: form.estimatedCost || "TBD",
      urgency: form.urgency,
      status: "Pending",
      raisedOn: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      remark: form.remark,
    };
    onRaise(newMpr);
    toast.success("MPR raised successfully", { description: `${form.item} — ${form.quantity} ${form.unit}` });
    onClose();
  };

  const inputClass = "w-full bg-[color:var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[color:var(--surface)] border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Raise Material Procurement Request</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Request materials for your sub-contractor</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Sub-Contractor</label>
            <select className={inputClass} value={form.contractorId} onChange={(e) => setForm({ ...form, contractorId: e.target.value })}>
              {contractors.filter((c) => c.status === "Active").map((c) => (
                <option key={c.id} value={c.id}>{c.company} — {c.site}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Material / Item Name</label>
            <input className={inputClass} placeholder="e.g. OPC Cement 53 Grade" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantity</label>
              <input className={inputClass} type="number" placeholder="e.g. 300" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <select className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {["Bags", "Tons", "Meters", "Sheets", "Units", "Kgs", "Liters", "Truckloads", "Cubic Meters"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Estimated Cost (₹)</label>
              <input className={inputClass} placeholder="e.g. ₹1,32,000" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Urgency</label>
              <select className={inputClass} value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as MprUrgency })}>
                {(["Normal", "Urgent", "Critical"] as MprUrgency[]).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Remark / Reason</label>
            <textarea className={inputClass + " resize-none"} rows={2} placeholder="Why is this material needed? Any deadline?" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 h-10 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
          <button onClick={submit} className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">Raise MPR</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

function SubContractorsPage() {
  const [mprs, setMprs] = useState<MaterialProcurementRequest[]>(INITIAL_MPRS);
  const [filterStatus, setFilterStatus] = useState<MprStatus | "All">("All");
  const [selectedContractor, setSelectedContractor] = useState<string>("All");
  const [showRaiseMpr, setShowRaiseMpr] = useState(false);
  const [tab, setTab] = useState<"contractors" | "mprs">("mprs");

  const filtered = mprs.filter((m) => {
    const statusOk = filterStatus === "All" || m.status === filterStatus;
    const contractorOk = selectedContractor === "All" || m.contractorId === selectedContractor;
    return statusOk && contractorOk;
  });

  const advanceStatus = (id: string) => {
    setMprs((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const idx = MPR_WORKFLOW.indexOf(m.status);
        if (idx >= MPR_WORKFLOW.length - 1) return m;
        const next = MPR_WORKFLOW[idx + 1];
        toast.success(`MPR ${id} → ${next}`);
        return { ...m, status: next };
      })
    );
  };

  const handleExport = () => {
    exportToExcel(
      filtered.map((m) => ({
        "MPR ID": m.id,
        "Contractor": m.contractorName,
        "Site": m.site,
        "Item": m.item,
        "Quantity": `${m.quantity} ${m.unit}`,
        "Est. Cost": m.estimatedCost,
        "Urgency": m.urgency,
        "Status": m.status,
        "Raised On": m.raisedOn,
        "Remark": m.remark,
      })),
      `Kinetic_MPR_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}`,
      undefined,
      "Material Procurement Requests"
    );
    toast.success("MPR report exported to Excel");
  };

  const statusCounts = MPR_WORKFLOW.reduce((acc, s) => {
    acc[s] = mprs.filter((m) => m.status === s).length;
    return acc;
  }, {} as Record<MprStatus, number>);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        eyebrow="Sub-Contractors"
        title="Sub-Contractor Management"
        actions={
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <FileDown className="size-4" />
              Export Excel
            </button>
            <button
              onClick={() => setShowRaiseMpr(true)}
              className="h-10 px-5 bg-foreground text-background rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="size-4" />
              Raise MPR
            </button>
          </div>
        }
      />

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Contractors", value: String(CONTRACTORS.filter((c) => c.status === "Active").length), icon: <Users className="size-4" />, color: "accent" },
          { label: "Pending MPRs", value: String(statusCounts.Pending), icon: <Clock className="size-4" />, color: "warn" },
          { label: "Approved / In Transit", value: String(statusCounts.Approved + statusCounts.Dispatched), icon: <Truck className="size-4" />, color: "" },
          { label: "Delivered This Week", value: String(statusCounts.Delivered), icon: <CheckCircle2 className="size-4" />, color: "accent" },
        ].map((s, i) => (
          <div
            key={s.label}
            className="bg-[color:var(--surface)] p-5 rounded-xl border border-border animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`size-8 rounded-lg flex items-center justify-center ${s.color === "accent" ? "bg-primary/10 text-primary" : s.color === "warn" ? "bg-yellow-500/10 text-yellow-500" : "bg-secondary text-muted-foreground"}`}>
                {s.icon}
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 mb-6 w-fit">
        {(["mprs", "contractors"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-[color:var(--surface)] shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "mprs" ? "Material Procurement Requests" : "Contractor Profiles"}
          </button>
        ))}
      </div>

      {/* MPR Tab */}
      {tab === "mprs" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5 items-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="size-3.5" />
              <span>Filter:</span>
            </div>
            {(["All", ...MPR_WORKFLOW] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s as MprStatus | "All")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  filterStatus === s
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-[color:var(--surface)] text-muted-foreground hover:text-foreground"
                }`}
              >
                {s} {s !== "All" && `(${statusCounts[s as MprStatus]})`}
              </button>
            ))}
            <select
              className="ml-auto h-8 px-3 text-xs border border-border rounded-lg bg-[color:var(--surface)] text-foreground"
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
            >
              <option value="All">All Contractors</option>
              {CONTRACTORS.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </select>
          </div>

          {/* MPR Table */}
          <div className="bg-[color:var(--surface)] border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">MPR ID</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contractor / Site</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Material</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qty</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Cost</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Urgency</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raised</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{m.id}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-sm leading-tight">{m.contractorName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{m.site}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium">{m.item}</div>
                        {m.remark && (
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate" title={m.remark}>{m.remark}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-sm">{m.quantity} {m.unit}</td>
                      <td className="px-5 py-4 font-semibold">{m.estimatedCost}</td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ color: URGENCY_COLOR[m.urgency], background: `${URGENCY_COLOR[m.urgency]}18`, border: `1px solid ${URGENCY_COLOR[m.urgency]}30` }}
                        >
                          {m.urgency === "Critical" && <AlertTriangle className="size-3" />}
                          {m.urgency}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ color: STATUS_COLOR[m.status], background: `${STATUS_COLOR[m.status]}18`, border: `1px solid ${STATUS_COLOR[m.status]}30` }}
                        >
                          {m.status === "Delivered" ? <CheckCircle2 className="size-3" /> : m.status === "Dispatched" ? <Truck className="size-3" /> : m.status === "Approved" ? <Package className="size-3" /> : <Clock className="size-3" />}
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{m.raisedOn}</td>
                      <td className="px-5 py-4">
                        {m.status !== "Delivered" && (
                          <button
                            onClick={() => advanceStatus(m.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
                            title={`Advance to ${MPR_WORKFLOW[MPR_WORKFLOW.indexOf(m.status) + 1]}`}
                          >
                            Advance <ChevronRight className="size-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground text-sm">
                        No MPRs match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Contractors Tab */}
      {tab === "contractors" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {CONTRACTORS.map((c, i) => (
            <div
              key={c.id}
              className="bg-[color:var(--surface)] border border-border rounded-2xl p-5 hover:shadow-md transition-all animate-fade-up card-hover"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="size-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}88)`, boxShadow: `0 4px 14px ${c.color}44` }}
                >
                  {c.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm truncate">{c.company}</h3>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        color: c.status === "Active" ? "hsl(158,64%,42%)" : c.status === "Inactive" ? "hsl(40,90%,52%)" : "hsl(0,70%,55%)",
                        background: c.status === "Active" ? "hsl(158,64%,42%,0.12)" : c.status === "Inactive" ? "hsl(40,90%,52%,0.12)" : "hsl(0,70%,55%,0.12)",
                        border: `1px solid ${c.status === "Active" ? "hsl(158,64%,42%)" : "hsl(40,90%,52%)"}30`,
                      }}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.name}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Wrench className="size-3 shrink-0" />
                  <span>{c.trade}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-3 shrink-0" />
                  <span>{c.site}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-3 shrink-0" />
                  <span>{c.phone}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <div className="text-xs text-muted-foreground">Contract Value</div>
                  <div className="text-sm font-bold">{c.contractValue}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Open MPRs</div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: c.openMprs > 2 ? "hsl(40,90%,52%)" : c.openMprs > 0 ? "hsl(210,80%,58%)" : "hsl(158,64%,42%)" }}
                  >
                    {c.openMprs}
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedContractor(c.id); setTab("mprs"); }}
                  className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity flex items-center gap-1"
                >
                  View MPRs <ChevronRight className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raise MPR Modal */}
      {showRaiseMpr && (
        <RaiseMprModal
          contractors={CONTRACTORS}
          onClose={() => setShowRaiseMpr(false)}
          onRaise={(mpr) => setMprs((prev) => [mpr, ...prev])}
        />
      )}
    </div>
  );
}
