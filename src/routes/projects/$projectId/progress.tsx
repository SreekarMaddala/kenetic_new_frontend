import { createFileRoute } from "@tanstack/react-router";
import {
  WorkflowLedger,
  reviewActions,
  recordUrl,
  type Field,
} from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/progress")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/projects/${projectId}/milestones`;

  return (
    <WorkflowLedger
      title="Schedule & Milestones"
      endpoint={endpoint}
      idKey="milestoneId"
      fields={[
        { key: "title", label: "Milestone", required: true },
        { key: "targetDate", label: "Target date", type: "date", required: true },
        { key: "owner", label: "Owner", required: true },
        { key: "progress", label: "Completion (%)", type: "number", required: true },
      ]}
      columns={[
        { key: "title", label: "Milestone" },
        { key: "targetDate", label: "Target date" },
        { key: "owner", label: "Owner" },
        { key: "progress", label: "Completion (%)" },
        { key: "status", label: "Status" },
      ]}
      defaults={{ status: "Pending" }}
      actions={[
        {
          label: "Start",
          visible: (r) => r.status === "Pending",
          run: (r) => api.put(recordUrl(endpoint, r.milestoneId), { status: "In Progress" }),
        },
        {
          label: "Complete",
          visible: (r) => r.status !== "Completed",
          run: (r) =>
            api.put(recordUrl(endpoint, r.milestoneId), { status: "Completed", progress: 100 }),
        },
      ]}
    />
  );
}
