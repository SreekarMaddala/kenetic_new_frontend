import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WorkflowLedger } from "../components/WorkflowLedger";
import { WarehouseIssues } from "../components/WarehouseIssues";
import { api, type InventoryItem } from "../lib/api";
import { useProject } from "../lib/ProjectContext";
import { materialSelectionFields } from "../lib/materialSelection";

export const Route = createFileRoute("/inventory")({ component: InventoryCatalog });

function InventoryCatalog() {
  const { projects } = useProject();
  const [category, setCategory] = useState("");
  const [itemId, setItemId] = useState("");
  const [location, setLocation] = useState("");
  const [tab, setTab] = useState("stock");
  const stock = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => api.get<InventoryItem[]>("/inventory"),
  });
  const items = stock.data ?? [];
  const categories = [...new Set(items.map((item) => item.category || "General"))].sort();
  const matches = (item: InventoryItem) =>
    (!category || (item.category || "General") === category) && (!itemId || item.itemId === itemId);
  const selectClass = "w-full h-11 px-3 rounded-xl border border-border bg-background text-sm";
  return (
    <div>
      <div className="p-6 pb-0 max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-3xl font-bold">Central Warehouse</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One material catalog and warehouse across all projects. Select a category, material, and
            location to view its records.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm font-medium">
            1. Material category
            <select
              aria-label="Material category"
              className={selectClass}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setItemId("");
              }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            2. Material
            <select
              aria-label="Material"
              className={selectClass}
              value={itemId}
              disabled={!category}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">
                {category ? "All materials in category" : "Select a category first"}
              </option>
              {items
                .filter((i) => (i.category || "General") === category)
                .map((i) => (
                  <option key={i.itemId} value={i.itemId}>
                    {i.name} ({i.unit})
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            3. Location
            <select
              aria-label="Location"
              className={selectClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">All locations</option>
              <option value="central">Central warehouse</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {stock.isError && (
          <p role="alert" className="text-destructive">
            Unable to load material selections. Refresh to try again.
          </p>
        )}
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Warehouse views">
          {[
            ["stock", "Stock by location"],
            ["movements", "Tracking"],
            ["receipts", "Warehouse receipts"],
            ["catalog", "Material catalog"],
          ].map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === value ? "bg-primary text-primary-foreground" : "border border-border"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "stock" && (
        <WorkflowLedger
          title="Stock by location"
          showSummary={false}
          eyebrow="Central warehouse & project material data"
          description="Project quantities come from warehouse movements. Received, used, returned, and remaining quantities are recorded for each project."
          endpoint="/inventory"
          idKey="locationKey"
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
            (rows as unknown as InventoryItem[]).filter(matches).flatMap((item) => [
              ...(!location || location === "central"
                ? [
                    {
                      ...item,
                      locationKey: item.itemId + "-central",
                      locationName: "Central warehouse",
                      receivedQty: "-",
                      usedQty: "-",
                      returnedQty: "-",
                      quantity: item.centralStock ?? 0,
                    },
                  ]
                : []),
              ...(item.projectBalances ?? [])
                .filter((b) => !location || location === b.projectId)
                .map((b) => ({
                  ...item,
                  ...b,
                  locationKey: item.itemId + "-" + b.projectId,
                  locationName:
                    projects.find((p) => p.projectId === b.projectId)?.name ?? b.projectId,
                })),
            ])
          }
        />
      )}
      {tab === "movements" && (
        <WarehouseIssues category={category} itemId={itemId} location={location} />
      )}
      {tab === "receipts" && (
        <WorkflowLedger
          title="Warehouse receipts"
          description="Receive registered materials into the central warehouse before issuing them to projects."
          endpoint="/warehouse/grn"
          idKey="warehouseEventId"
          createLabel="Receive material"
          fields={[
            ...materialSelectionFields(items),
            {
              key: "location",
              label: "Location",
              readOnly: true,
              defaultValue: "Central warehouse",
            },
            { key: "qty", label: "Quantity", type: "number", min: 0.01, required: true },
            { key: "rate", label: "Rate", type: "number" },
            { key: "vendor", label: "Supplier", required: true },
            { key: "date", label: "Date", type: "date", required: true },
          ]}
          columns={[
            { key: "date", label: "Date" },
            { key: "category", label: "Category" },
            { key: "item", label: "Material" },
            { key: "qty", label: "Quantity" },
            { key: "unit", label: "Unit" },
            { key: "vendor", label: "Supplier" },
            { key: "locationName", label: "Location" },
          ]}
          transform={(rows) =>
            rows
              .filter(
                (r) =>
                  (!itemId || r.itemId === itemId) &&
                  (!category ||
                    (r.category ??
                      items.find((i) => i.itemId === r.itemId)?.category ??
                      "General") === category) &&
                  (!location || (r.targetProjectId ?? "central") === location),
              )
              .map((r) => ({
                ...r,
                locationName: r.targetProjectId
                  ? (projects.find((p) => p.projectId === r.targetProjectId)?.name ??
                    r.targetProjectId)
                  : "Central warehouse",
              }))
          }
          onCreate={(body) => {
            const item = items.find((i) => i.itemId === body.itemId);
            if (!item || (item.category || "General") !== body.category)
              throw new Error("Select a registered material from its category.");
            const { itemId: _id, location: _location, ...receipt } = body;
            return api.post("/warehouse/grn", { ...receipt, item: item.name, unit: item.unit });
          }}
        />
      )}
      {tab === "catalog" && (
        <WorkflowLedger
          title="Universal material catalog"
          description="Register each material once. Locations and stock are maintained through warehouse receipts and movements."
          endpoint="/inventory"
          idKey="itemId"
          createLabel="Register material"
          fields={[
            { key: "category", label: "Material category", required: true },
            { key: "name", label: "Material name", required: true },
            { key: "unit", label: "Unit", required: true },
            { key: "reorderLevel", label: "Reorder level", type: "number" },
          ]}
          defaults={{ status: "Active" }}
          columns={[
            { key: "category", label: "Category" },
            { key: "name", label: "Material" },
            { key: "unit", label: "Unit" },
            { key: "centralStock", label: "Central warehouse" },
            { key: "deployedStock", label: "Held at projects" },
            { key: "totalStock", label: "Total remaining" },
          ]}
          transform={(rows) => rows.filter((r) => matches(r as unknown as InventoryItem))}
        />
      )}
    </div>
  );
}
