import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger, recordUrl } from "../components/WorkflowLedger";
import { api } from "../lib/api";

export const Route = createFileRoute("/subcontractors")({ component: Page });

function Page() {
  return (
    <WorkflowLedger
      title="Subcontractor Registry"
      description="Onboard subcontractors here first. Open a project to assign a subcontractor, define their work scope, and manage procurement requests."
      endpoint="/subcontractors"
      idKey="subcontractorId"
      createLabel="Onboard subcontractor"
      defaults={{ type: "Contractor", status: "Active" }}
      fields={[
        { key: "name", label: "Company", required: true },
        { key: "contactPerson", label: "Contact person", required: true },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "trade", label: "Trade", required: true },
        { key: "address", label: "Address", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "Company" },
        { key: "contactPerson", label: "Contact" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "trade", label: "Trade" },
        { key: "status", label: "Status" },
      ]}
      actions={["Active", "Inactive"].map((status) => ({
        label: status === "Active" ? "Activate" : "Deactivate",
        visible: (row) => row.status !== status,
        run: (row) => api.patch(recordUrl("/subcontractors", row.subcontractorId), { status }),
      }))}
    />
  );
}
