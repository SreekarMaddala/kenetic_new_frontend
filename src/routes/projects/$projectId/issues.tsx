import { createFileRoute } from "@tanstack/react-router";
import {
  WorkflowLedger,
  reviewActions,
  recordUrl,
  type Field,
} from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/issues")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/projects/${projectId}/issues`;

  return (
    <WorkflowLedger
      title="Issues & Snag List"
      endpoint={endpoint}
      idKey="issueId"
      fields={[
        { key: "title", label: "Issue", required: true },
        { key: "description", label: "Details", type: "textarea", required: true },
        {
          key: "priority",
          label: "Priority",
          required: true,
          options: ["Low", "Medium", "High", "Critical"].map((value) => ({ value, label: value })),
        },
      ]}
      columns={[
        { key: "title", label: "Issue" },
        { key: "description", label: "Details" },
        { key: "priority", label: "Priority" },
        { key: "status", label: "Status" },
        { key: "createdAt", label: "Created" },
      ]}
      defaults={{ status: "Open" }}
      actions={
        admin
          ? ["In Progress", "Resolved"].map((status) => ({
              label: status,
              visible: (r) => r.status !== status,
              run: (r) => api.patch(recordUrl(endpoint, r.issueId), { status }),
            }))
          : []
      }
    />
  );
}
