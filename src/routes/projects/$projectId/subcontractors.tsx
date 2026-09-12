import { createFileRoute } from "@tanstack/react-router";
import {
  WorkflowLedger,
  reviewActions,
  recordUrl,
  type Field,
} from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/subcontractors")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const endpoint = `/projects/${projectId}/subcontractors`;
  return (
    <>
      <WorkflowLedger
        title="Subcontractors"
        endpoint={endpoint}
        idKey="subcontractorId"
        defaults={{ type: "Contractor", status: "Active" }}
        transform={(rows) => rows.filter((r) => r.type !== "Procurement")}
        fields={[
          { key: "name", label: "Company", required: true },
          { key: "contactPerson", label: "Contact person", required: true },
          { key: "phone", label: "Phone" },
          { key: "trade", label: "Trade", required: true },
        ]}
        columns={[
          { key: "name", label: "Company" },
          { key: "contactPerson", label: "Contact" },
          { key: "phone", label: "Phone" },
          { key: "trade", label: "Trade" },
        ]}
      />
      <WorkflowLedger
        title="Procurement Requests"
        endpoint={endpoint}
        idKey="subcontractorId"
        defaults={{ type: "Procurement", status: "Pending" }}
        transform={(rows) => rows.filter((r) => r.type === "Procurement")}
        fields={[
          { key: "name", label: "Material", required: true },
          { key: "contractorName", label: "Contractor", required: true },
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
    </>
  );
}
