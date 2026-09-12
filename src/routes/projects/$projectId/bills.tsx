import { InvoiceCapture } from "../../../components/InvoiceCapture";
import { createFileRoute } from "@tanstack/react-router";
import {
  WorkflowLedger,
  reviewActions,
  recordUrl,
  type Field,
} from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/bills")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/projects/${projectId}/bills`;

  return (
    <>
      <InvoiceCapture key={projectId} projectId={projectId} />
      <WorkflowLedger
        title="Vendor Bills"
        endpoint={endpoint}
        idKey="billId"
        fields={[
          { key: "billNumber", label: "Invoice / RA bill number", required: true },
          { key: "clientOrContractor", label: "Vendor / contractor", required: true },
          {
            key: "grossAmount",
            label: "Invoice amount",
            type: "number",
            min: 0.01,
            required: true,
          },
          { key: "date", label: "Invoice date", type: "date", required: true },
          {
            key: "type",
            label: "Bill type",
            required: true,
            options: [
              { value: "Vendor", label: "Vendor invoice" },
              { value: "RA", label: "RA bill" },
            ],
          },
          { key: "remarks", label: "Details", type: "textarea" },
        ]}
        columns={[
          { key: "billNumber", label: "Invoice" },
          { key: "clientOrContractor", label: "Vendor" },
          { key: "grossAmount", label: "Amount" },
          { key: "paidAmount", label: "Paid against bill" },
          { key: "date", label: "Date" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
        ]}
        description="Register and review invoices here. Attach invoice files in Project Documents. Record the actual payment in Payments after approval."
        actions={reviewActions(endpoint, "billId")}
      />
    </>
  );
}
