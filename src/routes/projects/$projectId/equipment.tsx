import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { Cog, Search, Filter, Plus, Wrench, Settings, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { siteControlApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/equipment")({
  component: EquipmentPage,
});

function EquipmentPage() {
  const { projectId } = Route.useParams();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const { data: rawEquipment = [] } = useQuery({
    queryKey: ["equipment", projectId],
    queryFn: () => siteControlApi.listEquipment(projectId),
  });
  const equipment = rawEquipment.map((item) => ({
    id: String(item.equipmentId ?? ""),
    name: String(item.name ?? "Unnamed equipment"),
    type: String(item.type ?? "Other"),
    status: String(item.status ?? "Active"),
    operator: String(item.operator ?? "—"),
    fuelLevel: String(item.fuelLevel ?? "—"),
    hours: String(item.hours ?? "—"),
    nextService: String(item.nextService ?? "—"),
  }));

  const filteredEquipment = equipment.filter((eq) => {
    const matchSearch =
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.id.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || eq.type === typeFilter;
    return matchSearch && matchType;
  });

  const types = ["All", ...Array.from(new Set(equipment.map((e) => e.type)))];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Plant & Machinery"
        eyebrow="Asset Management"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="size-4" /> Request Equipment
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active on Site",
            value: equipment.filter((e) => e.status === "Active").length,
            icon: <Cog className="size-5" />,
            color: "bg-emerald-500/10 text-emerald-600",
          },
          {
            label: "In Maintenance",
            value: equipment.filter((e) => e.status === "In Maintenance").length,
            icon: <Wrench className="size-5" />,
            color: "bg-orange-500/10 text-orange-600",
          },
          {
            label: "Idle / Standby",
            value: equipment.filter((e) => e.status === "Idle").length,
            icon: <Settings className="size-5" />,
            color: "bg-blue-500/10 text-blue-600",
          },
          {
            label: "Total Assets",
            value: equipment.length,
            icon: <Cog className="size-5" />,
            color: "bg-purple-500/10 text-purple-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl border border-border bg-[color:var(--surface)] flex items-center gap-4"
          >
            <div className={`size-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-display font-bold text-foreground">{stat.value}</div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID or name..."
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
                <th className="px-6 py-4 font-medium">Equipment Name & ID</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Operator</th>
                <th className="px-6 py-4 font-medium">Usage / Mileage</th>
                <th className="px-6 py-4 font-medium">Next Service</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEquipment.map((eq) => (
                <tr
                  key={eq.id}
                  className="hover:bg-secondary/20 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary text-muted-foreground shrink-0 border border-border/50">
                        <Cog className="size-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground line-clamp-1">{eq.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          {eq.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-secondary text-muted-foreground">
                      {eq.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground">{eq.operator}</td>
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{eq.hours}</td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground">
                    {eq.nextService}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        eq.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : eq.status === "In Maintenance"
                            ? "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                            : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                      }`}
                    >
                      {eq.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEquipment.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No equipment found matching the criteria.
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
