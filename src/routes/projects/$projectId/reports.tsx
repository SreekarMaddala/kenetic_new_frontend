import { createFileRoute } from "@tanstack/react-router";
import {
  WorkflowLedger,
  reviewActions,
  recordUrl,
  type Field,
} from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/reports")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/supervisor/dpr?projectId=${encodeURIComponent(projectId)}`;

  return (
    <WorkflowLedger
      title="Daily Progress Reports"
      endpoint={endpoint}
      idKey="dprId"
      fields={[
        { key: "summary", label: "Work completed", type: "textarea", required: true },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "labourCount", label: "Workers present", type: "number" },
        { key: "weather", label: "Weather" },
      ]}
      columns={[
        { key: "date", label: "Date" },
        { key: "summary", label: "Work completed" },
        { key: "supervisorId", label: "Supervisor" },
        { key: "status", label: "Review status" },
      ]}
      defaults={{ projectId }}
      actions={admin ? reviewActions(endpoint, "dprId") : []}
    />
  );
}
