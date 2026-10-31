import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WorkflowLedger } from "../../../components/WorkflowLedger";
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
  const stock = useQuery({
    queryKey: ["warehouse-issue-stock"],
    queryFn: () => api.get<InventoryItem[]>("/inventory"),
    enabled: isAdmin,
  });
  const fields = materialSelectionFields(stock.data ?? []).map((field) =>
    field.key !== "itemId"
      ? field
      : {
          ...field,
          helperText: (values: Record<string, string>) => {
            if (stock.isError) return "Unable to load warehouse stock. Refresh and try again.";
            if (stock.isPending) return "Loading warehouse stock...";
            const item = stock.data?.find((item) => item.itemId === values.itemId);
            if (!item)
              return "Select a category, then a material to see the warehouse quantity available.";
            if (item.centralStock == null)
              return "Warehouse balance unavailable. Refresh and try again.";
            if (Number(item.centralStock) === 0)
              return "No warehouse stock available. Add stock quantity in the central warehouse first.";
            return (
              String(item.centralStock) +
              " " +
              (item.unit ?? "units") +
              " available in the central warehouse."
            );
          },
        },
  );
  return (
    <WorkflowLedger
      title="Project Materials"
      eyebrow={project?.name ?? "Current project"}
      description="Materials received, used, returned, and remaining at this project."
      showSummary={false}
      endpoint={"/supervisor/materials/stock?projectId=" + encodeURIComponent(projectId)}
      idKey="itemId"
      createLabel="Allocate to this project"
      submitLabel="Allocate material"
      createDescription={
        "Allocate central warehouse stock to " +
        (project?.name ?? "this project") +
        ". The current project is selected automatically."
      }
      emptyDescription={
        isAdmin
          ? "No materials allocated yet. Use Allocate to this project to add material from the central warehouse."
          : "No materials allocated yet. An administrator can allocate warehouse material to this project."
      }
      fields={
        isAdmin
          ? [
              ...fields,
              {
                key: "qty",
                label: "Quantity to allocate",
                type: "number",
                min: 0.01,
                required: true,
              },
              { key: "issuedTo", label: "Received by", required: true },
              { key: "date", label: "Allocation date", type: "date", required: true },
            ]
          : undefined
      }
      columns={[
        { key: "category", label: "Category" },
        { key: "name", label: "Material" },
        { key: "receivedQty", label: "Received" },
        { key: "usedQty", label: "Used" },
        { key: "returnedQty", label: "Returned" },
        { key: "quantity", label: "Remaining" },
        { key: "unit", label: "Unit" },
      ]}
      onCreate={(body) => {
        if (!isAdmin) throw new Error("Only administrators can allocate materials.");
        const item = stock.data?.find((item) => item.itemId === body.itemId);
        if (!item || item.status === "Inactive" || (item.category || "General") !== body.category)
          throw new Error("Select an active material from its category.");
        const qty = Number(body.qty);
        if (!Number.isFinite(qty) || qty <= 0)
          throw new Error("Enter a quantity greater than zero.");
        if (item.centralStock == null)
          throw new Error("Warehouse balance unavailable. Refresh and try again.");
        if (qty > Number(item.centralStock))
          throw new Error(
            "The central warehouse has " +
              item.centralStock +
              " " +
              (item.unit ?? "units") +
              " available. Add warehouse stock first or reduce the quantity.",
          );
        return api.post("/warehouse/issue-vouchers", {
          requestId: body.requestId,
          targetProjectId: projectId,
          movementType: "issue",
          category: item.category || "General",
          item: item.name,
          unit: item.unit,
          qty,
          issuedTo: body.issuedTo,
          date: body.date,
        });
      }}
    />
  );
}
