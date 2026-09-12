import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  FolderKanban,
  ShieldCheck,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { orgApi, type Organization } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "Organizations — Kinetic" },
      { name: "description", content: "Platform organization management and governance control." },
    ],
  }),
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: "",
    type: "Enterprise Developer",
    plan: "Enterprise Plan",
    taxId: "",
  });

  const {
    data: organizations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => orgApi.list(),
    retry: 1,
  });

  const statusMutation = useMutation({
    mutationFn: ({ orgId, status }: { orgId: string; status: string }) =>
      orgApi.updateStatus(orgId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization status updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; type: string; plan: string; taxId?: string }) =>
      orgApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization registered successfully.");
      setShowAddModal(false);
      setNewOrg({ name: "", type: "Enterprise Developer", plan: "Enterprise Plan", taxId: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.orgId.toLowerCase().includes(search.toLowerCase()) ||
      (o.taxId ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrg.name) return;
    createMutation.mutate({
      name: newOrg.name,
      type: newOrg.type,
      plan: newOrg.plan,
      taxId: newOrg.taxId || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
        <div className="h-8 w-64 bg-secondary rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        eyebrow="Platform Governance"
        title="Organizations Registry"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="h-10 px-6 bg-foreground text-background rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            + Register Organization
          </button>
        }
      />

      {/* Metrics Row */}
      {error && (
        <p role="alert" className="text-red-600 mb-4">
          {error.message}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard label="Total Organizations" value={organizations.length} suffix="Active" />
        <MetricCard
          label="Total Connected Sites"
          value={organizations.reduce((acc, o) => acc + (o.activeProjectsCount ?? 0), 0)}
          suffix="Across India"
        />
        <MetricCard
          label="Registered Users"
          value={organizations.reduce((acc, o) => acc + (o.activeUsersCount ?? 0), 0)}
          suffix="Live Now"
        />
        <MetricCard label="Platform Plan Ratio" value="100%" suffix="Premium / Enterprise" />
      </div>

      {/* Filter and Table container */}
      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:border-primary/50"
            />
            <svg
              className="absolute left-3 top-3 size-4 text-muted-foreground"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5 L14 14" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Showing {filtered.length} of {organizations.length} accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-xs font-mono text-muted-foreground uppercase">
                <th className="p-4 pl-6">Org ID</th>
                <th className="p-4">Organization Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Tax ID (GSTIN)</th>
                <th className="p-4 text-center">Sites</th>
                <th className="p-4 text-center">Users</th>
                <th className="p-4">Billing Plan</th>
                <th className="p-4 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((org) => (
                <tr key={org.orgId} className="hover:bg-secondary/20 transition-colors text-sm">
                  <td className="p-4 pl-6 font-mono text-xs text-muted-foreground">{org.orgId}</td>
                  <td className="p-4 font-semibold text-foreground">{org.name}</td>
                  <td className="p-4 text-muted-foreground text-xs">{org.type}</td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">
                    {org.taxId ?? "—"}
                  </td>
                  <td className="p-4 text-center font-mono font-medium">
                    {org.activeProjectsCount ?? 0}
                  </td>
                  <td className="p-4 text-center font-mono font-medium text-muted-foreground">
                    {org.activeUsersCount ?? 0}
                  </td>
                  <td className="p-4 text-xs font-medium text-primary/80">{org.plan}</td>
                  <td className="p-4 pr-6">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent/10 text-accent">
                      <span className="size-1 rounded-full bg-accent" />
                      {org.status}
                    </span>
                    {org.orgId !== user?.orgId && (
                      <button
                        disabled={statusMutation.isPending}
                        className="block mt-2 text-xs text-primary"
                        onClick={() =>
                          statusMutation.mutate({
                            orgId: org.orgId,
                            status: org.status === "Active" ? "Suspended" : "Active",
                          })
                        }
                      >
                        {org.status === "Active" ? "Suspend access" : "Activate access"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="bg-[color:var(--surface)] border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden relative z-10 animate-scale-in">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-secondary/30">
              <h3 className="font-display font-semibold">Register New Organization</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddOrg} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1.5">
                  Company Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Shapoorji Pallonji"
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase mb-1.5">
                    Org Type
                  </label>
                  <select
                    value={newOrg.type}
                    onChange={(e) => setNewOrg({ ...newOrg, type: e.target.value })}
                    className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value="Enterprise Developer">Enterprise Developer</option>
                    <option value="Premium Developer">Premium Developer</option>
                    <option value="Infrastructure Contractor">Infrastructure Contractor</option>
                    <option value="Residential Developer">Residential Developer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase mb-1.5">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="27AAACU1234J1Z5"
                    value={newOrg.taxId}
                    onChange={(e) => setNewOrg({ ...newOrg, taxId: e.target.value })}
                    className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1.5">
                  Platform Plan
                </label>
                <select
                  value={newOrg.plan}
                  onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                >
                  <option value="Enterprise Plan">Enterprise Plan</option>
                  <option value="Premium Plan">Premium Plan</option>
                  <option value="Standard Plan">Standard Plan</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-medium hover:bg-secondary/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-foreground text-background rounded-lg text-xs font-medium hover:bg-zinc-800"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix: string;
}) {
  return (
    <div className="p-5 bg-[color:var(--surface)] border border-border rounded-xl shadow-sm">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold font-display tracking-tight mt-1.5 mb-1 text-foreground">
        {value}
      </p>
      <span className="text-[9.5px] font-medium text-accent">{suffix}</span>
    </div>
  );
}
