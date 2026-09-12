import { createFileRoute } from "@tanstack/react-router";
import {
  WorkflowLedger,
  reviewActions,
  recordUrl,
  type Field,
} from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/expenses")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/projects/${projectId}/expenses`;

  return (
    <WorkflowLedger
      title="Project Expenses"
      endpoint={endpoint}
      idKey="expenseId"
      fields={[
        { key: "description", label: "Description", required: true },
        { key: "category", label: "Category", required: true },
        { key: "amount", label: "Amount", type: "number", min: 0.01, required: true },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "submittedBy", label: "Paid by", required: true },
      ]}
      columns={[
        { key: "date", label: "Date" },
        { key: "description", label: "Description" },
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount" },
        { key: "submittedBy", label: "Paid by" },
        { key: "status", label: "Status" },
      ]}
      actions={reviewActions(endpoint, "expenseId")}
    />
  );
}
