import { createFileRoute } from "@tanstack/react-router";
import {
  WorkflowLedger,
  reviewActions,
  recordUrl,
  type Field,
} from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/equipment")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/projects/${projectId}/equipment`;

  return (
    <WorkflowLedger
      title="Equipment Register"
      endpoint={endpoint}
      idKey="equipmentId"
      fields={
        admin
          ? [
              { key: "name", label: "Equipment", required: true },
              { key: "code", label: "Asset code", required: true },
              { key: "location", label: "Location", required: true },
              { key: "category", label: "Category", required: true },
            ]
          : undefined
      }
      columns={[
        { key: "name", label: "Equipment" },
        { key: "code", label: "Asset code" },
        { key: "location", label: "Location" },
        { key: "status", label: "Status" },
      ]}
      defaults={{ status: "Available" }}
      actions={
        admin
          ? ["Available", "Deployed", "Maintenance"].map((status) => ({
              label: status,
              visible: (r) => r.status !== status,
              run: (r) => api.put(recordUrl(endpoint, r.equipmentId), { status }),
            }))
          : []
      }
    />
  );
}
