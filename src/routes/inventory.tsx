import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger } from "../components/WorkflowLedger";
export const Route = createFileRoute("/inventory")({ component: Page });
function Page() {
  return (
    <WorkflowLedger
      title="Inventory Catalog"
      description="Stock quantities come from warehouse receipts and issues. Use a consistent material name and unit for each catalog item."
      endpoint="/inventory"
      idKey="itemId"
      fields={[
        { key: "name", label: "Material", required: true },
        { key: "unit", label: "Unit", required: true },
        { key: "category", label: "Category", required: true },
        { key: "reorderLevel", label: "Reorder threshold", type: "number", required: true },
      ]}
      columns={[
        { key: "name", label: "Material" },
        { key: "category", label: "Category" },
        { key: "unit", label: "Unit" },
        { key: "centralStock", label: "Central stock" },
        { key: "deployedStock", label: "Project stock" },
        { key: "totalStock", label: "Total stock" },
      ]}
    />
  );
}
