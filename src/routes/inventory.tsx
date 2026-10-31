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
  const [createRequest, setCreateRequest] = useState(0);
  const openCreate = (view: "catalog" | "receipts") => {
    setTab(view);
    if (view === "receipts") setLocation("central");
    setCreateRequest((request) => request + 1);
  };
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Central Warehouse</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              One material catalog and warehouse across all projects. Select a category, material,
              and location to view its records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openCreate("catalog")}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
            >
              Register new material
            </button>
            <button
              type="button"
              onClick={() => openCreate("receipts")}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Add stock quantity
            </button>
          </div>
        </div>
        <p className="rounded-xl border border-border bg-[color:var(--surface)] p-3 text-sm text-muted-foreground">
          <strong className="text-foreground">New material?</strong> Register its details first.{" "}
          <strong className="text-foreground">Adding quantity?</strong> Use Add stock quantity to
          record a warehouse receipt.
        </p>
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
            ["receipts", "Add stock / receipts"],
            ["catalog", "Material catalog"],
          ].map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => {
                setTab(value);
                setCreateRequest(0);
              }}
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
          createLabel="Add stock quantity"
          createRequest={createRequest}
          submitLabel="Add quantity to warehouse"
          createDescription="Choose a registered material and enter the quantity received. Saving adds that quantity to the central warehouse stock. To add more later, record another receipt."
          fields={[
            ...materialSelectionFields(items),
            {
              key: "location",
              label: "Location",
              readOnly: true,
              defaultValue: "Central warehouse",
            },
            {
              key: "qty",
              label: "Quantity to add",
              type: "number",
              min: 0.01,
              required: true,
              placeholder: "e.g. 100",
              helperText: "Enter the quantity in the unit shown beside the selected material.",
            },
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
          description="Register material details here. To add or increase stock, use Add stock quantity."
          endpoint="/inventory"
          idKey="itemId"
          createLabel="Register material"
          createRequest={createRequest}
          submitLabel="Save material details"
          createDescription="This form registers the material details only. After saving, click Add stock quantity to enter the quantity received at the central warehouse."
          fields={[
            { key: "category", label: "Material category", required: true },
            { key: "name", label: "Material name", required: true },
            {
              key: "unit",
              label: "Unit",
              required: true,
              placeholder: "e.g. bags, kg, pcs",
              helperText:
                "The measurement unit used for every receipt and movement of this material.",
            },
            {
              key: "reorderLevel",
              label: "Low-stock alert level",
              type: "number",
              helperText: "Optional alert threshold. This does not add stock quantity.",
            },
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
