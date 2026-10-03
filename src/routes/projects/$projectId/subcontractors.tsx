import { createFileRoute } from "@tanstack/react-router";
import { ProjectBoq } from "../../../components/ProjectBoq";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs";
import { WorkflowLedger, reviewActions, recordUrl } from "../../../components/WorkflowLedger";
import { api, type DomainRecord } from "../../../lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
export const Route = createFileRoute("/projects/$projectId/subcontractors")({
  component: Page,
  validateSearch: (search: Record<string, unknown>): { tab: "contractors" | "boq" } => ({
    tab: search.tab === "boq" ? "boq" : "contractors",
  }),
});
function Page() {
  const { projectId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const endpoint = `/projects/${projectId}/subcontractors`;
  const registry = useQuery({
    queryKey: ["ledger", "/subcontractors"],
    queryFn: () => api.get<DomainRecord[]>("/subcontractors"),
  });
  const assignments = useQuery({
    queryKey: ["ledger", endpoint],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });
  const contractors = (assignments.data ?? []).filter((r) => r.type !== "Procurement");
  const available = (registry.data ?? []).filter(
    (r) => r.status === "Active" && !contractors.some((a) => a.registryId === r.subcontractorId),
  );
  return (
    <Tabs
      value={tab}
      onValueChange={(value) =>
        navigate({ search: { tab: value === "boq" ? "boq" : "contractors" } })
      }
    >
      <TabsList aria-label="Subcontractor sections" className="mb-6">
        <TabsTrigger value="contractors">Subcontractors</TabsTrigger>
        <TabsTrigger value="boq">BOQ</TabsTrigger>
      </TabsList>
      <TabsContent value="contractors">
        <p className="mb-4 text-sm text-muted-foreground">
          Onboard companies in the{" "}
          <Link to="/subcontractors" className="text-primary underline">
            global subcontractor registry
          </Link>
          , then assign their work here.
        </p>
        {(registry.isError || assignments.isError) && (
          <p role="alert" className="mb-4 text-destructive">
            Unable to load subcontractor choices.{" "}
            <button
              onClick={() => {
                registry.refetch();
                assignments.refetch();
              }}
              className="underline"
            >
              Retry
            </button>
          </p>
        )}
        <WorkflowLedger
          title="Assigned Subcontractors"
          description="Select an onboarded subcontractor and define their scope, contract value, and work dates for this project."
          createLabel="Assign subcontractor"
          endpoint={endpoint}
          idKey="subcontractorId"
          defaults={{ type: "Contractor", status: "Active" }}
          transform={(rows) => rows.filter((r) => r.type !== "Procurement")}
          fields={[
            {
              key: "registryId",
              label: "Subcontractor",
              required: true,
              options:
                registry.isError ||
                assignments.isError ||
                registry.isPending ||
                assignments.isPending
                  ? []
                  : available.map((r) => ({
                      value: String(r.subcontractorId),
                      label: `${r.name} - ${r.trade}`,
                    })),
              helperText:
                registry.isPending || assignments.isPending
                  ? "Loading subcontractors..."
                  : "Only active, unassigned subcontractors are available. Onboard a company in the global registry first.",
            },
            { key: "scopeOfWork", label: "Scope of work", type: "textarea", required: true },
            {
              key: "contractValue",
              label: "Contract value (₹ INR)",
              type: "number",
              min: 0,
              helperText: "Enter the contract value in Indian rupees (INR).",
            },
            { key: "startDate", label: "Start date", type: "date" },
            { key: "endDate", label: "End date", type: "date" },
          ]}
          columns={[
            { key: "name", label: "Company" },
            { key: "contactPerson", label: "Contact" },
            { key: "phone", label: "Phone" },
            { key: "trade", label: "Trade" },
            { key: "scopeOfWork", label: "Scope of work" },
            { key: "contractValue", label: "Contract value (₹ INR)" },
            { key: "startDate", label: "Start" },
            { key: "endDate", label: "End" },
            { key: "status", label: "Status" },
          ]}
          actions={["Active", "Inactive"].map((status) => ({
            label: status === "Active" ? "Activate" : "Deactivate",
            visible: (row) => row.status !== status,
            run: (row) => api.patch(recordUrl(endpoint, row.subcontractorId), { status }),
          }))}
        />
        <WorkflowLedger
          title="Procurement Requests"
          endpoint={endpoint}
          idKey="subcontractorId"
          defaults={{ type: "Procurement", status: "Pending" }}
          transform={(rows) => rows.filter((r) => r.type === "Procurement")}
          fields={[
            { key: "name", label: "Material", required: true },
            {
              key: "contractorId",
              label: "Assigned subcontractor",
              required: true,
              options: assignments.isError
                ? []
                : contractors
                    .filter((r) => r.status === "Active")
                    .map((r) => ({ value: String(r.subcontractorId), label: String(r.name) })),
            },
            { key: "quantity", label: "Quantity", type: "number", min: 0.01, required: true },
            { key: "unit", label: "Unit", required: true },
            { key: "requiredDate", label: "Required date", type: "date", required: true },
            { key: "description", label: "Details", type: "textarea" },
          ]}
          columns={[
            { key: "name", label: "Material" },
            { key: "contractorName", label: "Contractor" },
            { key: "quantity", label: "Quantity" },
            { key: "unit", label: "Unit" },
            { key: "status", label: "Status" },
          ]}
          actions={reviewActions(endpoint, "subcontractorId")}
        />
      </TabsContent>
      <TabsContent value="boq">
        <ProjectBoq projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
