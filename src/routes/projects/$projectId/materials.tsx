import { api } from "../../../lib/api";
import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger, reviewActions } from "../../../components/WorkflowLedger";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/materials")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/supervisor/materials/indents?projectId=${encodeURIComponent(projectId)}`;
  return (
    <>
      <WorkflowLedger
        title="Project Stock"
        endpoint={`/supervisor/materials/stock?projectId=${encodeURIComponent(projectId)}`}
        idKey="itemId"
        columns={[
          { key: "name", label: "Material" },
          { key: "unit", label: "Unit" },
          { key: "quantity", label: "Stock" },
        ]}
      />
      <WorkflowLedger
        title="Material Requests"
        description="Submit a request for administrator review. After approval, the administrator can issue stock from the warehouse and update both stock balances."
        endpoint={endpoint}
        idKey="materialId"
        defaults={{ projectId, status: "pending" }}
        fields={[
          { key: "materialName", label: "Material", required: true },
          { key: "quantity", label: "Quantity", type: "number", min: 0.01, required: true },
          { key: "unit", label: "Unit", required: true },
          { key: "requiredDate", label: "Required date", type: "date", required: true },
          { key: "remarks", label: "Remarks", type: "textarea" },
        ]}
        columns={[
          { key: "materialName", label: "Material" },
          { key: "quantity", label: "Quantity" },
          { key: "unit", label: "Unit" },
          { key: "requiredDate", label: "Required by" },
          { key: "status", label: "Status" },
        ]}
        actions={
          admin
            ? [
                ...reviewActions(endpoint, "materialId", true),
                {
                  label: "Issue from warehouse",
                  visible: (r) => String(r.status).toLowerCase() === "approved",
                  run: (r) =>
                    api.post("/warehouse/issue-vouchers", {
                      targetProjectId: projectId,
                      item: r.materialName,
                      unit: r.unit,
                      qty: r.quantity,
                      indentId: r.materialId,
                      requestId: `indent-${r.materialId}`,
                    }),
                },
              ]
            : []
        }
      />
      <WorkflowLedger
        title="Material Issues"
        endpoint={`/projects/${projectId}/issues`}
        idKey="issueId"
        defaults={{ category: "Materials", status: "Open" }}
        fields={[
          { key: "title", label: "Issue", required: true },
          { key: "description", label: "Details", required: true, type: "textarea" },
        ]}
        transform={(rows) => rows.filter((r) => r.category === "Materials")}
        columns={[
          { key: "title", label: "Issue" },
          { key: "description", label: "Details" },
          { key: "status", label: "Status" },
        ]}
      />
    </>
  );
}
