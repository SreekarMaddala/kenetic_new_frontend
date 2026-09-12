import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Package, PackageOpen, Truck, Plus, PackageCheck } from "lucide-react";
import { inventoryApi, type InventoryItem } from "../lib/api";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
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

function InventoryPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.list(),
    retry: 1,
  });

  const filteredInventory = inventory.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.itemId.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categories = ["All", ...Array.from(new Set(inventory.map((i) => i.category)))];

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
        title="Global Inventory & Assets"
        eyebrow="Global Workspace"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="size-4" /> Add to Catalog
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Categories"
          value={categories.length - 1}
          icon={<Package className="size-5" />}
          color="bg-blue-500/10 text-blue-600"
        />
        <MetricCard
          label="Low Stock Items"
          value={inventory.filter((i) => i.status === "Low Stock").length}
          icon={<PackageOpen className="size-5" />}
          color="bg-orange-500/10 text-orange-600"
        />
        <MetricCard
          label="Heavy Equipment"
          value={inventory.filter((i) => i.category === "Heavy Equipment").length}
          icon={<Truck className="size-5" />}
          color="bg-purple-500/10 text-purple-600"
        />
        <MetricCard
          label="Total Est. Value"
          value="₹17.3Cr"
          icon={<PackageCheck className="size-5" />}
          color="bg-emerald-500/10 text-emerald-600"
        />
      </div>

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items or SKUs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto h-9 pl-9 pr-8 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50 appearance-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
                <th className="px-6 py-4 font-medium">Item & SKU</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Total Owned</th>
                <th className="px-6 py-4 font-medium">Deployed to Sites</th>
                <th className="px-6 py-4 font-medium">Est. Value</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInventory.map((item) => (
                <tr key={item.itemId} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <div className="size-8 rounded bg-secondary flex items-center justify-center shrink-0">
                        {item.category === "Heavy Equipment" ? (
                          <Truck className="size-4 text-muted-foreground" />
                        ) : (
                          <Package className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        {item.name}
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {item.itemId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-secondary text-muted-foreground">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">{item.totalStock}</td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {item.deployedStock ?? "—"}
                  </td>
                  <td className="px-6 py-4 font-medium text-muted-foreground">
                    {item.estimatedValue ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status === "In Stock" || item.status === "Available"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : item.status === "Low Stock"
                            ? "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                            : item.status === "Fully Deployed"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-gray-500/10 text-gray-600 border border-gray-500/20"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No items found matching the filters.
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
