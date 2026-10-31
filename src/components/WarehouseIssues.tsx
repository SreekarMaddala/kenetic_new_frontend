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
  const availability = (values: Record<string, string>) => {
    const item = stock.data?.find((item) => item.itemId === values.itemId);
    if (!item) return undefined;
    return values.movementType === "usage" || values.movementType === "return"
      ? (item.projectBalances?.find(
          (balance) => balance.projectId === (projectId ?? values.targetProjectId),
        )?.quantity ?? 0)
      : item.centralStock;
  };
  const selectionFields = materialSelectionFields(stock.data ?? []).map((field) =>
    field.key !== "itemId"
      ? field
      : {
          ...field,
          helperText: (values: Record<string, string>) => {
            if (stock.isError) return "Unable to load stock. Refresh and try again.";
            if (stock.isPending) return "Loading material balances...";
            const item = stock.data?.find((item) => item.itemId === values.itemId);
            if (!item)
              return "Select a category, then a material. Its available quantity will appear here.";
            const amount = availability(values);
            if (amount == null)
              return "Stock balance unavailable. Refresh before recording a movement.";
            const source =
              values.movementType === "usage" || values.movementType === "return"
                ? "this project"
                : "the central warehouse";
            if (Number(amount) === 0)
              return source === "this project"
                ? "No remaining material at this project to use or return."
                : "No stock in the central warehouse. Record a warehouse receipt before issuing this material.";
            return `${Number(amount).toLocaleString("en-IN")} ${item.unit ?? "units"} available in ${source}.`;
          },
        },
  );
  return (
    <WorkflowLedger
      title="Material movements"
      description={
        projectId
          ? `Material movements for ${project?.name ?? "this project"}. The current project is linked automatically.`
          : "Track warehouse issues, project usage, and returns. Every movement is linked to a project and updates the shared material balance."
      }
      endpoint="/warehouse/issue-vouchers"
      idKey="warehouseEventId"
      createLabel="Record movement"
      defaults={projectId ? { targetProjectId: projectId } : undefined}
      fields={
        readOnly
          ? undefined
          : [
              ...selectionFields,
              ...(!projectId
                ? [
                    {
                      key: "targetProjectId",
                      label: "Project location",
                      required: true,
                      options: projects.map((p) => ({ value: p.projectId, label: p.name })),
                    },
                  ]
                : []),
              {
                key: "movementType",
                label: "Movement",
                required: true,
                defaultValue: "issue",
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
        const targetProjectId = projectId ?? body.targetProjectId;
        if (!targetProjectId) throw new Error("Select the destination project.");
        const qty = Number(body.qty);
        if (!Number.isFinite(qty) || qty <= 0)
          throw new Error("Enter a quantity greater than zero.");
        const amount = availability({
          itemId: item.itemId,
          movementType: String(body.movementType ?? "issue"),
          targetProjectId: String(targetProjectId),
        });
        if (amount == null) throw new Error("Stock balance unavailable. Refresh and try again.");
        if (qty > Number(amount)) {
          const source =
            body.movementType === "usage" || body.movementType === "return"
              ? "This project"
              : "The central warehouse";
          throw new Error(
            `${source} has ${amount} ${item.unit ?? "units"} available; you entered ${qty}. ${source === "The central warehouse" ? "Record a warehouse receipt first or reduce the quantity." : "Reduce the quantity to the remaining project balance."}`,
          );
        }
        const { itemId: _itemId, ...movement } = body;
        return api.post("/warehouse/issue-vouchers", {
          ...movement,
          item: item.name,
          unit: item.unit,
          targetProjectId,
        });
      }}
    />
  );
}
