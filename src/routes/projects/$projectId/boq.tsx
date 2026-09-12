import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger, reviewActions } from "../../../components/WorkflowLedger";
export const Route = createFileRoute("/projects/$projectId/boq")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  return (
    <>
      <WorkflowLedger
        title="Bill of Quantities"
        endpoint={`/projects/${projectId}/boq`}
        idKey="boqId"
        fields={[
          { key: "code", label: "Item code", required: true },
          { key: "description", label: "Description", required: true },
          { key: "category", label: "Category", required: true },
          { key: "unit", label: "Unit", required: true },
          {
            key: "budgetedQty",
            label: "Budget quantity",
            type: "number",
            min: 0.01,
            required: true,
          },
          { key: "rate", label: "Unit rate", type: "number", required: true },
        ]}
        transform={(rows) =>
          rows.map((r) => ({ ...r, amount: Number(r.budgetedQty ?? 0) * Number(r.rate ?? 0) }))
        }
        columns={[
          { key: "code", label: "Code" },
          { key: "description", label: "Description" },
          { key: "unit", label: "Unit" },
          { key: "budgetedQty", label: "Quantity" },
          { key: "rate", label: "Rate" },
          { key: "amount", label: "Amount" },
        ]}
      />
      <WorkflowLedger
        title="Running Account Bills"
        endpoint={`/projects/${projectId}/bills`}
        idKey="billId"
        defaults={{ type: "RA" }}
        fields={[
          { key: "billNumber", label: "RA bill number", required: true },
          { key: "clientOrContractor", label: "Contractor", required: true },
          { key: "periodFrom", label: "Period from", type: "date", required: true },
          { key: "periodTo", label: "Period to", type: "date", required: true },
          { key: "grossAmount", label: "Bill amount", type: "number", min: 0.01, required: true },
        ]}
        transform={(rows) => rows.filter((r) => r.type === "RA")}
        columns={[
          { key: "billNumber", label: "Bill" },
          { key: "clientOrContractor", label: "Contractor" },
          { key: "periodFrom", label: "From" },
          { key: "periodTo", label: "To" },
          { key: "grossAmount", label: "Amount" },
          { key: "status", label: "Review status" },
        ]}
        actions={reviewActions(`/projects/${projectId}/bills`, "billId")}
      />
    </>
  );
}
