import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, ShieldOff, ShieldCheck } from "lucide-react";
import {
  RegistryTable,
  RecordIdentity,
  RecordStatus,
  RecordActions,
  type RegistryColumn,
} from "../components/RegistryTable";
import { DropdownMenuItem } from "../components/ui/dropdown-menu";
import { orgApi, type Organization } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "Organizations — Kenetic" },
      { name: "description", content: "Platform organization management and governance control." },
    ],
  }),
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: "",
    type: "Enterprise Developer",
    plan: "Enterprise Plan",
    taxId: "",
    adminName: "",
    adminEmail: "",
  });

  const {
    data: organizations = [],
    isLoading,
    error,
    refetch,
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
    mutationFn: (body: {
      name: string;
      type: string;
      plan: string;
      taxId?: string;
      adminName?: string;
      adminEmail?: string;
    }) => orgApi.create(body),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      if (result.provisioningWarning) toast.warning(result.provisioningWarning);
      else toast.success("Organization & Operations Admin registered successfully.");
      setShowAddModal(false);
      setNewOrg({
        name: "",
        type: "Enterprise Developer",
        plan: "Enterprise Plan",
        taxId: "",
        adminName: "",
        adminEmail: "",
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns: RegistryColumn<Organization>[] = [
    {
      key: "name",
      label: "Organization",
      value: (org) => org.name,
      render: (org) => (
        <RecordIdentity
          name={org.name}
          detail={org.orgId}
          icon={<Building2 size={17} strokeWidth={1.5} />}
        />
      ),
    },
    {
      key: "type",
      label: "Type",
      value: (org) => org.type ?? "",
      render: (org) => org.type || "Not specified",
    },
    {
      key: "taxId",
      label: "GSTIN",
      value: (org) => org.taxId ?? "",
      render: (org) => <span className="text-xs font-mono">{org.taxId || "Not provided"}</span>,
    },
    {
      key: "sites",
      label: "Sites",
      numeric: true,
      value: (org) => org.activeProjectsCount ?? 0,
      render: (org) => org.activeProjectsCount ?? 0,
    },
    {
      key: "users",
      label: "Users",
      numeric: true,
      value: (org) => org.activeUsersCount ?? 0,
      render: (org) => org.activeUsersCount ?? 0,
    },
    {
      key: "plan",
      label: "Plan",
      value: (org) => org.plan ?? "",
      render: (org) =>
        org.plan ? (
          <span className="record-plan">{org.plan}</span>
        ) : (
          <span className="text-muted-foreground">Not assigned</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      value: (org) => org.status,
      render: (org) => <RecordStatus status={org.status} />,
    },
    {
      key: "actions",
      label: "",
      render: (org) => (
        <RecordActions name={org.name} id={org.orgId}>
          {org.orgId !== user?.orgId && (
            <DropdownMenuItem
              disabled={statusMutation.isPending}
              className={org.status === "Active" ? "record-danger" : ""}
              onSelect={() =>
                statusMutation.mutate({
                  orgId: org.orgId,
                  status: org.status === "Active" ? "Suspended" : "Active",
                })
              }
            >
              {org.status === "Active" ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
              {org.status === "Active" ? "Suspend access" : "Activate access"}
            </DropdownMenuItem>
          )}
        </RecordActions>
      ),
    },
  ];

  const handleAddOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (createMutation.isPending) return;
    if (!newOrg.name || !newOrg.adminEmail) {
      toast.error("Organization Name and Admin Email are required.");
      return;
    }
    createMutation.mutate({
      name: newOrg.name,
      type: newOrg.type,
      plan: newOrg.plan,
      taxId: newOrg.taxId || undefined,
      adminName: newOrg.adminName || undefined,
      adminEmail: newOrg.adminEmail || undefined,
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        eyebrow="Platform administration"
        title="Organizations"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium inline-flex items-center gap-2 hover:opacity-90"
          >
            <Plus size={16} /> Add organization
          </button>
        }
      />

      <div className="registry-summary">
        <MetricCard
          label="Organizations"
          value={isLoading || error ? "-" : organizations.length}
          suffix="Total registered"
        />
        <MetricCard
          label="Active organizations"
          value={
            isLoading || error ? "-" : organizations.filter((org) => org.status === "Active").length
          }
          suffix="Workspace access enabled"
        />
        <MetricCard
          label="Connected sites"
          value={
            isLoading || error
              ? "-"
              : organizations.reduce((sum, org) => sum + (org.activeProjectsCount ?? 0), 0)
          }
          suffix="Across organizations"
        />
        <MetricCard
          label="Registered users"
          value={
            isLoading || error
              ? "-"
              : organizations.reduce((sum, org) => sum + (org.activeUsersCount ?? 0), 0)
          }
          suffix="Across organizations"
        />
      </div>
      <RegistryTable
        title="Organization directory"
        description="Manage organizations, plans, and workspace access."
        rows={organizations}
        columns={columns}
        rowKey={(org) => org.orgId}
        searchText={(org) =>
          `${org.name} ${org.orgId} ${org.taxId ?? ""} ${org.type ?? ""} ${org.plan ?? ""}`
        }
        status={(org) => org.status}
        statuses={["Active", "Suspended"]}
        loading={isLoading}
        error={error?.message}
        onRetry={() => refetch()}
      />

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
                    Operations Admin Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={newOrg.adminName}
                    onChange={(e) => setNewOrg({ ...newOrg, adminName: e.target.value })}
                    className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase mb-1.5">
                    Operations Admin Email *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="admin@company.com"
                    value={newOrg.adminEmail}
                    onChange={(e) => setNewOrg({ ...newOrg, adminEmail: e.target.value })}
                    className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
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
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-foreground text-background rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? "Registering..." : "Register"}
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
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{suffix}</small>
    </div>
  );
}
