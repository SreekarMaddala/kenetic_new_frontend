import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WorkflowLedger, reviewActions } from "../../../components/WorkflowLedger";
import { WarehouseIssues } from "../../../components/WarehouseIssues";
import { api, type InventoryItem } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useProject } from "../../../lib/ProjectContext";
import { materialSelectionFields } from "../../../lib/materialSelection";

export const Route = createFileRoute("/projects/$projectId/materials")({
  component: MaterialsPage,
});

function MaterialsPage() {
  const { projectId } = Route.useParams();
  const { project } = useProject();
  const { user } = useAuth();
  const isAdmin = user?.role === "operations_admin" || user?.role === "super_admin";
  const scope = encodeURIComponent(projectId);
  const stockEndpoint = `/supervisor/materials/stock?projectId=${scope}`;
  const requestEndpoint = `/supervisor/materials/indents?projectId=${scope}`;
  const catalog = useQuery({
    queryKey: ["material-catalog", projectId],
    queryFn: () => api.get<InventoryItem[]>(stockEndpoint + "&catalog=true"),
  });
  return (
    <div>
      <div className="p-6 pb-0 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold">Project Materials</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {project?.name ?? "Project"} - material records linked to the central warehouse. Each
          material shows quantities received, used, returned, and remaining at this project.
        </p>
        {catalog.isError && (
          <p role="alert" className="mt-2 text-destructive">
            Unable to load the material catalog. Refresh to try again.
          </p>
        )}
      </div>
      <WorkflowLedger
        title="Project material data"
        showSummary={false}
        eyebrow="Project material tracking"
        description="These balances are maintained by warehouse receipts, issues, usage, and returns."
        endpoint={stockEndpoint}
        idKey="itemId"
        columns={[
          { key: "category", label: "Category" },
          { key: "name", label: "Material" },
          { key: "locationName", label: "Location" },
          { key: "receivedQty", label: "Received" },
          { key: "usedQty", label: "Used" },
          { key: "returnedQty", label: "Returned" },
          { key: "quantity", label: "Remaining" },
          { key: "unit", label: "Unit" },
        ]}
        transform={(rows) =>
          rows.map((r) => ({ ...r, locationName: project?.name ?? "Current project" }))
        }
      />
      <WorkflowLedger
        title="Material requests"
        endpoint={requestEndpoint}
        idKey="materialId"
        createLabel="Request material"
        fields={[
          ...materialSelectionFields(catalog.data ?? []),
          {
            key: "location",
            label: "Project location",
            readOnly: true,
            defaultValue: project?.name ?? "Current project",
          },
          { key: "quantity", label: "Quantity", type: "number", min: 0.01, required: true },
          { key: "requiredDate", label: "Required by", type: "date", required: true },
          { key: "remarks", label: "Remarks", type: "textarea" },
        ]}
        columns={[
          { key: "category", label: "Category" },
          { key: "materialName", label: "Material" },
          { key: "quantity", label: "Quantity" },
          { key: "unit", label: "Unit" },
          { key: "requiredDate", label: "Required by" },
          { key: "status", label: "Status" },
        ]}
        actions={
          isAdmin
            ? [
                ...reviewActions(requestEndpoint, "materialId", true),
                {
                  label: "Issue from warehouse",
                  visible: (r) => String(r.status).toLowerCase() === "approved",
                  run: (r) =>
                    api.post("/warehouse/issue-vouchers", {
                      targetProjectId: projectId,
                      item: r.materialName,
                      unit: r.unit,
                      qty: r.quantity,
                      indentId: r.materialId,
                      requestId: `indent-${r.materialId}`,
                    }),
                },
              ]
            : []
        }
        onCreate={(body) => {
          const item = catalog.data?.find((i) => i.itemId === body.itemId);
          if (!item || (item.category || "General") !== body.category)
            throw new Error("Select a registered material from its category.");
          const { itemId: _id, location: _location, ...request } = body;
          return api.post("/supervisor/materials/indents", {
            ...request,
            projectId,
            catalogItemId: item.itemId,
            materialName: item.name,
            unit: item.unit,
            status: "pending",
          });
        }}
      />
      {isAdmin && <WarehouseIssues readOnly />}
    </div>
  );
}
