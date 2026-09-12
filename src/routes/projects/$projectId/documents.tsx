import { createFileRoute } from "@tanstack/react-router";
import {
  WorkflowLedger,
  reviewActions,
  recordUrl,
  type Field,
} from "../../../components/WorkflowLedger";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/documents")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/projects/${projectId}/documents`;

  return (
    <WorkflowLedger
      title="Project Documents"
      endpoint={endpoint}
      idKey="documentId"
      fields={[
        { key: "title", label: "Title", required: true },
        { key: "category", label: "Category", required: true },
        { key: "revision", label: "Revision" },
        { key: "file", label: "File (up to 20 MB)", type: "file", required: true },
      ]}
      columns={[
        { key: "title", label: "Title" },
        { key: "category", label: "Category" },
        { key: "revision", label: "Revision" },
        { key: "filename", label: "File" },
        { key: "createdAt", label: "Uploaded" },
      ]}
      upload
      createLabel="Upload file"
      actions={[
        {
          label: "Download",
          visible: (r) => !!r.storageKey,
          run: async (r) => {
            const result = await api.get<{ url: string }>(
              `${recordUrl(endpoint, r.documentId)}/download`,
            );
            window.location.assign(result.url);
          },
        },
      ]}
    />
  );
}
