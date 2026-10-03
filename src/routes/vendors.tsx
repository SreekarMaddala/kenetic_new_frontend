import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Plus,
  Star,
  ShieldCheck,
  Briefcase,
  X,
  History,
} from "lucide-react";
import { vendorApi, api, type Vendor, type CreateVendorBody, type InventoryItem } from "../lib/api";

export const Route = createFileRoute("/vendors")({
  component: VendorsPage,
});

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className={`p-4 rounded-xl border border-border bg-[color:var(--surface)] flex items-center gap-4`}
    >
      <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-display font-bold text-foreground">{value}</div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

function StarRating({ value = 0 }: { value?: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3 ${star <= rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const materials = useQuery({
    queryKey: ["material-catalog"],
    queryFn: () => api.get<InventoryItem[]>("/inventory?catalog=true"),
  });
  const [historyVendor, setHistoryVendor] = useState<Vendor | null>(null);
  // Onboard Vendor form state
  const [name, setName] = useState("");
  const [type, setType] = useState("Materials & Supplies");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [materialIds, setMaterialIds] = useState<string[]>([]);

  const { data: rawVendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => vendorApi.list(),
    retry: 1,
  });

  const createVendorMutation = useMutation({
    mutationFn: (body: CreateVendorBody) =>
      editingVendor ? vendorApi.update(editingVendor.vendorId, body) : vendorApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(
        editingVendor ? "Vendor updated successfully." : "Vendor onboarded successfully.",
      );
      setShowModal(false);
      setEditingVendor(null);
      setName("");
      setEmail("");
      setPhone("");
      setMaterialIds([]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const vendors: Vendor[] = (Array.isArray(rawVendors) ? rawVendors : []).map(
    (v: any, idx: number) => ({
      vendorId: v.vendorId || v.recordId || `VEN-${idx + 1}`,
      name: v.name || `Vendor ${idx + 1}`,
      type: v.type || v.category || "Supplier",
      status: v.status || "Active",
      rating: typeof v.rating === "number" ? v.rating : 0,
      email: v.email || "—",
      phone: v.phone || "—",
      materialsSupplied: Array.isArray(v.materialIds)
        ? v.materialsSupplied || "—"
        : v.materialsSupplied || v.materials || "—",
      materialIds: v.materialIds ?? [],
      badge: v.badge || (v.status === "Active" ? "Standard" : "Under Review"),
      activeContracts: typeof v.activeContracts === "number" ? v.activeContracts : 0,
    }),
  );

  const filteredVendors = vendors.filter((ven) => {
    const venName = ven.name || "";
    const venType = ven.type || "";
    const matchSearch = venName.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || venType === typeFilter;
    return matchSearch && matchType;
  });

  const types = ["All", ...Array.from(new Set(vendors.map((v) => v.type || "Supplier")))];

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (createVendorMutation.isPending) return;
    if (!name || !email) {
      toast.error("Please enter Vendor Name and Email.");
      return;
    }
    createVendorMutation.mutate({
      name,
      type,
      email,
      phone,
      materialIds,
    });
  };

  if (isLoading)
    return (
      <div className="p-8 max-w-7xl mx-auto w-full space-y-4 animate-fade-up">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />
        ))}
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Vendor & Supplier Registry"
        eyebrow="Global Workspace"
        actions={
          <button
            onClick={() => {
              setEditingVendor(null);
              setName("");
              setEmail("");
              setPhone("");
              setType("Materials & Supplies");
              setMaterialIds([]);
              setShowModal(true);
            }}
            className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="size-4" /> Onboard Vendor
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Vendors"
          value={vendors.length}
          icon={<Briefcase className="size-5" />}
          color="bg-blue-500/10 text-blue-600"
        />
        <MetricCard
          label="Preferred Partners"
          value={vendors.filter((v) => v.badge === "Preferred").length}
          icon={<ShieldCheck className="size-5" />}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <MetricCard
          label="Avg Rating"
          value={
            vendors.length > 0
              ? (vendors.reduce((a, b) => a + (b.rating ?? 0), 0) / vendors.length).toFixed(1)
              : "—"
          }
          icon={<Star className="size-5" />}
          color="bg-amber-500/10 text-amber-600"
        />
        <MetricCard
          label="Blacklisted"
          value={vendors.filter((v) => v.status === "Blacklisted").length}
          icon={<ShieldCheck className="size-5" />}
          color="bg-red-500/10 text-red-600"
        />
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
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
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
                <th className="px-6 py-4 font-medium">Materials Supplied</th>
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
                          {ven.badge === "Preferred" && (
                            <ShieldCheck className="size-3.5 text-emerald-500" />
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {ven.vendorId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-xs">{ven.type}</div>
                    <div className="mt-1">
                      <StarRating value={ven.rating} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {ven.materialsSupplied === "—" ? "—" : ven.materialsSupplied}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="size-3" /> {ven.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3" /> {ven.phone}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-foreground">
                    {ven.activeContracts ?? 0} Active
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ven.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : ven.status === "Under Review"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            : "bg-red-500/10 text-red-600 border border-red-500/20"
                      }`}
                    >
                      {ven.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      title="View vendor details"
                      onClick={() => setHistoryVendor(ven)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <History className="size-4" />
                    </button>
                    <button
                      title="Edit vendor and materials"
                      aria-label={`Edit ${ven.name}`}
                      onClick={() => {
                        setEditingVendor(ven);
                        setName(ven.name);
                        setType(ven.type);
                        setEmail(ven.email === "—" ? "" : ven.email);
                        setPhone(ven.phone === "—" ? "" : ven.phone);
                        setMaterialIds(ven.materialIds ?? []);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-all"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVendors.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No vendors found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {historyVendor && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-xl border border-border bg-[color:var(--surface)] shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Vendor details
                </p>
                <h2 className="text-xl font-semibold">{historyVendor.name}</h2>
              </div>
              <button onClick={() => setHistoryVendor(null)} aria-label="Close vendor details">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard
                  label="Contracts"
                  value={historyVendor.activeContracts ?? 0}
                  icon={<Briefcase className="size-5" />}
                  color="bg-blue-500/10 text-blue-600"
                />
                <MetricCard
                  label="Status"
                  value={historyVendor.status ?? "Unknown"}
                  icon={<ShieldCheck className="size-5" />}
                  color="bg-emerald-500/10 text-emerald-600"
                />
                <MetricCard
                  label="Materials"
                  value={historyVendor.materialsSupplied ?? "—"}
                  icon={<Briefcase className="size-5" />}
                  color="bg-orange-500/10 text-orange-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateVendor}
            className="bg-background border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-fade-up"
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <h3 className="font-semibold text-sm">
                {editingVendor ? "Edit Vendor / Supplier" : "Onboard New Vendor / Supplier"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">
                  Vendor Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Cement Ltd."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 bg-secondary/20 border border-border rounded-md text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">
                  Category / Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-9 px-3 bg-secondary/20 border border-border rounded-md text-xs focus:outline-none focus:border-primary"
                >
                  <option value="Materials & Supplies">Materials & Supplies</option>
                  <option value="Cement & Aggregate">Cement & Aggregate</option>
                  <option value="Steel & Metals">Steel & Metals</option>
                  <option value="Logistics & Fleet">Logistics & Fleet</option>
                  <option value="Equipment Rental">Equipment Rental</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sales@ultratech.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 px-3 bg-secondary/20 border border-border rounded-md text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98123 45678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-9 px-3 bg-secondary/20 border border-border rounded-md text-xs focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">
                  Materials Supplied
                </label>
                <select
                  aria-label="Add supplied material"
                  value=""
                  disabled={materials.isPending || materials.isError}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) setMaterialIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
                  }}
                  className="w-full h-9 px-3 bg-secondary/20 border border-border rounded-md text-xs focus:outline-none focus:border-primary"
                >
                  <option value="">
                    {materials.isPending ? "Loading materials..." : "Select a material to add"}
                  </option>
                  {(materials.data ?? [])
                    .filter((item) => !materialIds.includes(item.itemId))
                    .map((item) => (
                      <option key={item.itemId} value={item.itemId}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                </select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {materialIds.map((id) => {
                    const item = materials.data?.find((m) => m.itemId === id);
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-label={`Remove ${item?.name ?? id}`}
                        onClick={() => setMaterialIds((ids) => ids.filter((value) => value !== id))}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1"
                      >
                        {item ? `${item.name} (${item.unit})` : id}
                        <X className="size-3" />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-muted-foreground">
                  {materials.isError ? (
                    "Unable to load materials. Refresh and try again."
                  ) : (
                    "Select the available materials this vendor supplies."
                  )}
                </p>
                {editingVendor &&
                  !editingVendor.materialIds?.length &&
                  editingVendor.materialsSupplied !== "—" && (
                    <p className="mt-2 text-muted-foreground">
                      Previous material text: {editingVendor.materialsSupplied}. Select matching
                      catalog materials to replace it.
                    </p>
                  )}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-3 bg-secondary/10">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium hover:bg-secondary border border-transparent rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createVendorMutation.isPending}
                className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
              >
                {createVendorMutation.isPending
                  ? "Saving..."
                  : editingVendor
                    ? "Save Vendor"
                    : "Onboard Vendor"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
