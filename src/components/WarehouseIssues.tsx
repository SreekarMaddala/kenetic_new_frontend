import { WorkflowLedger } from "./WorkflowLedger";
import { api, type InventoryItem } from "../lib/api";
import { useProject } from "../lib/ProjectContext";
import { useQuery } from "@tanstack/react-query";
import { materialSelectionFields } from "../lib/materialSelection";

export function WarehouseIssues({
  readOnly = false,
  category = "",
  itemId = "",
  location = "",
}: {
  readOnly?: boolean;
  category?: string;
  itemId?: string;
  location?: string;
}) {
  const { projectId, project, projects } = useProject();
  const stock = useQuery({
    queryKey: ["warehouse-issue-stock"],
    queryFn: () => api.get<InventoryItem[]>("/inventory"),
    enabled: !readOnly,
  });
  return (
    <WorkflowLedger
      title="Material movements"
      description="Track warehouse issues, project usage, and returns. Every movement is linked to a project and updates the shared material balance."
      endpoint="/warehouse/issue-vouchers"
      idKey="warehouseEventId"
      createLabel="Record movement"
      fields={
        readOnly
          ? undefined
          : [
              ...materialSelectionFields(stock.data ?? []),
              {
                key: "targetProjectId",
                label: "Project location",
                required: true,
                defaultValue: projectId,
                readOnly: !!projectId,
                options: projectId
                  ? [{ value: projectId, label: project?.name ?? "Current project" }]
                  : projects.map((p) => ({ value: p.projectId, label: p.name })),
              },
              {
                key: "movementType",
                label: "Movement",
                required: true,
                options: [
                  { value: "issue", label: "Central warehouse to project" },
                  { value: "usage", label: "Used at project" },
                  { value: "return", label: "Project to central warehouse" },
                ],
              },
              { key: "qty", label: "Quantity", type: "number", min: 0.01, required: true },
              { key: "issuedTo", label: "Received / recorded by", required: true },
              { key: "date", label: "Date", type: "date", required: true },
            ]
      }
      columns={[
        { key: "date", label: "Date" },
        { key: "category", label: "Category" },
        { key: "item", label: "Material" },
        { key: "movementLabel", label: "Movement" },
        { key: "qty", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "projectName", label: "Project location" },
        { key: "issuedTo", label: "Recorded by" },
      ]}
      transform={(rows) =>
        rows
          .filter(
            (r) =>
              (!projectId || r.targetProjectId === projectId) &&
              (!location ||
                (location === "central"
                  ? r.movementType !== "usage"
                  : r.targetProjectId === location)) &&
              (!itemId || r.itemId === itemId) &&
              (!category ||
                (r.category ??
                  stock.data?.find((i) => i.itemId === r.itemId)?.category ??
                  "General") === category),
          )
          .map((r) => ({
            ...r,
            category:
              r.category ?? stock.data?.find((i) => i.itemId === r.itemId)?.category ?? "General",
            movementLabel:
              r.movementType === "usage"
                ? "Used at project"
                : r.movementType === "return"
                  ? "Returned to warehouse"
                  : "Issued to project",
            projectName:
              projects.find((p) => p.projectId === r.targetProjectId)?.name ?? r.targetProjectId,
          }))
      }
      onCreate={(body) => {
        const item = stock.data?.find((item) => item.itemId === body.itemId);
        if (!item || (item.category || "General") !== body.category)
          throw new Error("Select a material from its category.");
        const { itemId: _itemId, ...movement } = body;
        return api.post("/warehouse/issue-vouchers", {
          ...movement,
          item: item.name,
          unit: item.unit,
          targetProjectId: projectId ?? body.targetProjectId,
        });
      }}
    />
  );
}
