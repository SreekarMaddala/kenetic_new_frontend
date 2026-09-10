import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, MoreHorizontal, Mail, Phone, Plus, Star, ShieldCheck, Briefcase } from "lucide-react";
import { vendorApi, type Vendor } from "../lib/api";

export const Route = createFileRoute("/vendors")({
  component: VendorsPage,
});

function MetricCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`p-4 rounded-xl border border-border bg-[color:var(--surface)] flex items-center gap-4`}>
      <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-foreground">{value}</div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function VendorsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => vendorApi.list(),
    retry: 1,
  });

  const filteredVendors = vendors.filter(ven => {
    const matchSearch = ven.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || ven.type === typeFilter;
    return matchSearch && matchType;
  });

  const types = ["All", ...Array.from(new Set(vendors.map(v => v.type)))];

  if (isLoading) return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-4 animate-fade-up">
      {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Vendor & Supplier Registry"
        eyebrow="Global Workspace"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="size-4" /> Onboard Vendor
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Total Vendors" value={vendors.length} icon={<Briefcase className="size-5" />} color="bg-blue-500/10 text-blue-600" />
        <MetricCard label="Preferred Partners" value={vendors.filter(v => v.badge === "Preferred").length} icon={<ShieldCheck className="size-5" />} color="bg-emerald-500/10 text-emerald-600" />
        <MetricCard label="Avg Rating" value={vendors.length > 0 ? (vendors.reduce((a, b) => a + (b.rating ?? 0), 0) / vendors.length).toFixed(1) : "—"} icon={<Star className="size-5" />} color="bg-amber-500/10 text-amber-600" />
        <MetricCard label="Blacklisted" value={vendors.filter(v => v.status === "Blacklisted").length} icon={<ShieldCheck className="size-5" />} color="bg-red-500/10 text-red-600" />
      </div>

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vendors..."
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
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium">Vendor / Supplier</th>
                <th className="px-6 py-4 font-medium">Category & Rating</th>
                <th className="px-6 py-4 font-medium">Contact Details</th>
                <th className="px-6 py-4 font-medium">Contracts</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVendors.map((ven) => (
                <tr key={ven.vendorId} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0 border border-orange-500/20">
                        {ven.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {ven.name}
                          {ven.badge === "Preferred" && <ShieldCheck className="size-3.5 text-emerald-500" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">{ven.vendorId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-xs">{ven.type}</div>
                    <div className="mt-1"><StarRating value={ven.rating} /></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail className="size-3" /> {ven.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="size-3" /> {ven.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-foreground">
                    {ven.activeContracts ?? 0} Active
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ven.status === "Active" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                      ven.status === "Under Review" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                      "bg-red-500/10 text-red-600 border border-red-500/20"
                    }`}>
                      {ven.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVendors.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No vendors found matching the filters.
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
