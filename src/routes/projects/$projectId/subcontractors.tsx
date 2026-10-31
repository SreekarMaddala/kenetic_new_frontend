import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger, reviewActions, recordUrl } from "../../../components/WorkflowLedger";
import { api, type DomainRecord } from "../../../lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAuth } from "../../../contexts/AuthContext";
import { SubcontractorPaymentLedger } from "../../../components/FinanceLedgers";

export const Route = createFileRoute("/projects/$projectId/subcontractors")({
  component: Page,
});

function Page() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "operations_admin" || user?.role === "super_admin";
  const endpoint = `/projects/${projectId}/subcontractors`;
  // Selectors return arrays; ledger queries cache paginated InfiniteData.
  // Keep their keys separate even when they read the same endpoint.
  const registry = useQuery({
    queryKey: ["subcontractor-options", "/subcontractors"],
    enabled: isAdmin,
    queryFn: () => api.get<DomainRecord[]>("/subcontractors"),
  });
  const assignments = useQuery({
    queryKey: ["subcontractor-options", endpoint],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });
  const contractors = (assignments.data ?? []).filter((r) => r.type !== "Procurement");
  const available = (registry.data ?? []).filter(
    (r) => r.status === "Active" && !contractors.some((a) => a.registryId === r.subcontractorId),
  );

  return (
    <div>
      {isAdmin && (
        <>
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
            editFields={[
              { key: "scopeOfWork", label: "Scope of work", type: "textarea", required: true },
              { key: "contractValue", label: "Contract value (INR)", type: "number", min: 0 },
              { key: "startDate", label: "Start date", type: "date" },
              { key: "endDate", label: "End date", type: "date" },
            ]}
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
          <SubcontractorPaymentLedger projectId={projectId} />
        </>
      )}
      <WorkflowLedger
        title="Procurement Requests"
        description={
          isSupervisor
            ? "Submit material procurement requirements for this project. The administrator reviews your requests."
            : "Review requests submitted by site supervisors. Approved requests can be reversed with a recorded reason."
        }
        createLabel="Submit procurement request"
        submitLabel="Submit request"
        endpoint={endpoint}
        idKey="subcontractorId"
        defaults={{ type: "Procurement", status: "Pending" }}
        transform={(rows) => rows.filter((r) => r.type === "Procurement")}
        fields={
          isSupervisor
            ? [
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
              ]
            : undefined
        }
        columns={[
          { key: "name", label: "Material" },
          { key: "contractorName", label: "Contractor" },
          { key: "quantity", label: "Quantity" },
          { key: "unit", label: "Unit" },
          { key: "requiredDate", label: "Required by" },
          { key: "status", label: "Status" },
          { key: "reversalReason", label: "Reversal reason" },
        ]}
        actions={
          isAdmin
            ? [
                ...reviewActions(endpoint, "subcontractorId"),
                {
                  label: "Reverse",
                  visible: (row) => row.status === "Approved",
                  run: async (row) => {
                    const reason = window
                      .prompt("Reason for reversing this procurement request:")
                      ?.trim();
                    if (!reason) return false;
                    return api.post(recordUrl(endpoint, row.subcontractorId) + "/reverse", {
                      reason,
                      expectedVersion: Number(row.version ?? 0),
                      requestId: crypto.randomUUID(),
                    });
                  },
                },
              ]
            : []
        }
      />
    </div>
  );
}
