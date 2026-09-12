import { createFileRoute } from "@tanstack/react-router";
import {
  WorkflowLedger,
  reviewActions,
  recordUrl,
  type Field,
} from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/inspections")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/projects/${projectId}/inspections`;

  return (
    <WorkflowLedger
      title="Inspections"
      endpoint={endpoint}
      idKey="inspectionId"
      fields={
        admin
          ? [
              { key: "title", label: "Inspection", required: true },
              { key: "type", label: "Type", required: true },
              { key: "inspector", label: "Inspector", required: true },
              { key: "date", label: "Scheduled date", type: "date", required: true },
              { key: "notes", label: "Notes", type: "textarea" },
            ]
          : undefined
      }
      columns={[
        { key: "title", label: "Inspection" },
        { key: "inspector", label: "Inspector" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status" },
        { key: "notes", label: "Notes" },
      ]}
      defaults={{ status: "Pending" }}
      actions={
        admin
          ? ["Passed", "Failed"].map((status) => ({
              label: status,
              visible: (r) => r.status === "Pending",
              run: (r) => api.patch(recordUrl(endpoint, r.inspectionId), { status }),
            }))
          : []
      }
    />
  );
}
