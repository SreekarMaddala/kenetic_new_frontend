import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger } from "../components/WorkflowLedger";
export const Route = createFileRoute("/inventory")({ component: InventoryCatalog });
function InventoryCatalog() {
  return (
    <WorkflowLedger
      title="Inventory Catalog"
      description="Register materials before assigning them to vendors or recording vendor payments. Stock balances are maintained through goods receipts and issue vouchers."
      endpoint="/inventory?catalog=true"
      idKey="itemId"
      createLabel="Register material"
      fields={[
        { key: "name", label: "Material name", required: true },
        { key: "unit", label: "Unit", required: true },
        { key: "category", label: "Category", required: true },
        { key: "reorderLevel", label: "Reorder level", type: "number" },
      ]}
      defaults={{ status: "Active" }}
      columns={[
        { key: "name", label: "Material" },
        { key: "unit", label: "Unit" },
        { key: "category", label: "Category" },
        { key: "reorderLevel", label: "Reorder level" },
      ]}
    />
  );
}
