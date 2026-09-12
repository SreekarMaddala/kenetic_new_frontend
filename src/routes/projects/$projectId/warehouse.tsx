import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger, type Field } from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useProject } from "../../../lib/ProjectContext";
export const Route = createFileRoute("/projects/$projectId/warehouse")({ component: Page });
function Page() {
  const { projects } = useProject();
  const fields: Field[] = [
    { key: "item", label: "Material (use the catalog name)", required: true },
    { key: "unit", label: "Unit (use the catalog unit)", required: true },
    { key: "qty", label: "Quantity", type: "number", min: 0.01, required: true },
  ];
  const columns = [
    { key: "date", label: "Date" },
    { key: "item", label: "Material" },
    { key: "unit", label: "Unit" },
    { key: "qty", label: "Quantity" },
  ];
  return (
    <>
      <WorkflowLedger
        title="Central Warehouse Stock"
        endpoint="/supervisor/materials/stock"
        idKey="itemId"
        columns={[
          { key: "name", label: "Material" },
          { key: "unit", label: "Unit" },
          { key: "quantity", label: "Available" },
        ]}
      />
      <WorkflowLedger
        title="Goods Received"
        endpoint="/warehouse/grn"
        idKey="warehouseEventId"
        fields={[
          ...fields,
          { key: "vendor", label: "Vendor", required: true },
          { key: "rate", label: "Unit rate", type: "number", required: true },
        ]}
        columns={[
          ...columns,
          { key: "vendor", label: "Vendor" },
          { key: "amount", label: "Value" },
        ]}
        onCreate={(body) => api.post("/warehouse/grn", body)}
      />
      <WorkflowLedger
        title="Issue Stock to Project"
        description="Issuing stock atomically reduces central stock and increases the destination project's stock. Requests are approved separately; approval alone does not move stock."
        endpoint="/warehouse/issue-vouchers"
        idKey="warehouseEventId"
        fields={[
          ...fields,
          {
            key: "targetProjectId",
            label: "Destination project",
            required: true,
            options: projects.map((p) => ({ value: p.projectId, label: p.name })),
          },
          { key: "issuedTo", label: "Received by", required: true },
        ]}
        columns={[
          ...columns,
          { key: "projectName", label: "Destination" },
          { key: "issuedTo", label: "Received by" },
        ]}
        transform={(rows) =>
          rows.map((r) => ({
            ...r,
            projectName:
              projects.find((p) => p.projectId === r.targetProjectId)?.name ?? r.targetProjectId,
          }))
        }
        onCreate={(body) => api.post("/warehouse/issue-vouchers", body)}
      />
    </>
  );
}
