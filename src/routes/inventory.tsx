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
  return (
    <div>
      {/* ── Hero Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, hsl(22 90% 48%) 0%, hsl(32 95% 55%) 50%, hsl(14 85% 42%) 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* decorative circles */}
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "220px", height: "220px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "180px", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", top: "10px", left: "40%", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div className="p-6 pb-5 max-w-7xl mx-auto" style={{ position: "relative", zIndex: 1 }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {/* warehouse icon badge */}
              <div style={{
                width: "56px", height: "56px", borderRadius: "16px",
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.25)",
                flexShrink: 0,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "white", letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-display)" }}>
                  Central Warehouse
                </h1>
                <p style={{ marginTop: "4px", fontSize: "0.8125rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                  One material catalog and warehouse across{" "}
                  <span style={{ color: "rgba(255,255,255,1)", fontWeight: 600 }}>all projects</span>.
                  {" "}Select a category, material, and location to view records.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => openCreate("catalog")}
                style={{
                  borderRadius: "12px",
                  border: "1.5px solid rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.14)",
                  backdropFilter: "blur(8px)",
                  padding: "10px 18px",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "white",
                  cursor: "pointer",
                  transition: "background 0.2s, transform 0.15s",
                  display: "flex", alignItems: "center", gap: "7px",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Register material
              </button>
              <button
                type="button"
                onClick={() => openCreate("receipts")}
                style={{
                  borderRadius: "12px",
                  background: "white",
                  padding: "10px 18px",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "hsl(22 90% 40%)",
                  cursor: "pointer",
                  border: "none",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                  transition: "box-shadow 0.2s, transform 0.15s",
                  display: "flex", alignItems: "center", gap: "7px",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.22)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Add stock quantity
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter & Tab Card ── */}
      <div className="max-w-7xl mx-auto px-6">
        {/* info banner */}
        <div style={{
          marginTop: "16px",
          borderRadius: "14px",
          border: "1px solid hsl(22 90% 48% / 0.18)",
          background: "linear-gradient(135deg, hsl(22 90% 98%) 0%, hsl(32 95% 97%) 100%)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
        }}>
          <div style={{ marginTop: "1px", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(22 90% 48%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p style={{ fontSize: "0.8rem", color: "hsl(220 10% 40%)", margin: 0, lineHeight: 1.55 }}>
            <strong style={{ color: "hsl(22 90% 40%)", fontWeight: 700 }}>New material?</strong>{" "}
            Register its details first.{" "}
            <strong style={{ color: "hsl(22 90% 40%)", fontWeight: 700 }}>Adding quantity?</strong>{" "}
            Use <em>Add stock quantity</em> to record a warehouse receipt.
          </p>
        </div>

        {/* filter dropdowns */}
        <div style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
        }}>
          {/* Step 1 */}
          <div style={{
            borderRadius: "14px",
            border: "1.5px solid hsl(220 20% 88%)",
            background: "white",
            padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
            onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(22 90% 48%)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px hsl(22 90% 48% / 0.12)"; }}
            onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(220 20% 88%)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{
                width: "20px", height: "20px", borderRadius: "6px",
                background: "hsl(22 90% 48%)", color: "white",
                fontSize: "0.6875rem", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>1</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(220 10% 46%)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Material Category</span>
            </div>
            <select
              aria-label="Material category"
              style={{
                width: "100%", height: "38px", padding: "0 10px",
                borderRadius: "8px", border: "1px solid hsl(220 20% 90%)",
                background: "hsl(220 16% 97%)", fontSize: "0.875rem",
                color: "hsl(220 25% 10%)", outline: "none", cursor: "pointer",
              }}
              value={category}
              onChange={(e) => { setCategory(e.target.value); setItemId(""); }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          {/* Step 2 */}
          <div style={{
            borderRadius: "14px",
            border: "1.5px solid hsl(220 20% 88%)",
            background: "white",
            padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            transition: "border-color 0.2s, box-shadow 0.2s",
            opacity: category ? 1 : 0.7,
          }}
            onFocusCapture={e => { if (category) { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(22 90% 48%)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px hsl(22 90% 48% / 0.12)"; }}}
            onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(220 20% 88%)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{
                width: "20px", height: "20px", borderRadius: "6px",
                background: category ? "hsl(22 90% 48%)" : "hsl(220 10% 70%)", color: "white",
                fontSize: "0.6875rem", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "background 0.2s",
              }}>2</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(220 10% 46%)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Material</span>
            </div>
            <select
              aria-label="Material"
              style={{
                width: "100%", height: "38px", padding: "0 10px",
                borderRadius: "8px", border: "1px solid hsl(220 20% 90%)",
                background: "hsl(220 16% 97%)", fontSize: "0.875rem",
                color: "hsl(220 25% 10%)", outline: "none", cursor: category ? "pointer" : "not-allowed",
              }}
              value={itemId}
              disabled={!category}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">{category ? "All materials in category" : "Select a category first"}</option>
              {items.filter((i) => (i.category || "General") === category).map((i) => (
                <option key={i.itemId} value={i.itemId}>{i.name} ({i.unit})</option>
              ))}
            </select>
          </div>

          {/* Step 3 */}
          <div style={{
            borderRadius: "14px",
            border: "1.5px solid hsl(220 20% 88%)",
            background: "white",
            padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
            onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(22 90% 48%)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px hsl(22 90% 48% / 0.12)"; }}
            onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(220 20% 88%)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{
                width: "20px", height: "20px", borderRadius: "6px",
                background: "hsl(22 90% 48%)", color: "white",
                fontSize: "0.6875rem", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>3</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(220 10% 46%)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Location</span>
            </div>
            <select
              aria-label="Location"
              style={{
                width: "100%", height: "38px", padding: "0 10px",
                borderRadius: "8px", border: "1px solid hsl(220 20% 90%)",
                background: "hsl(220 16% 97%)", fontSize: "0.875rem",
                color: "hsl(220 25% 10%)", outline: "none", cursor: "pointer",
              }}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">All locations</option>
              <option value="central">Central warehouse</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {stock.isError && (
          <p role="alert" style={{ color: "hsl(0 72% 50%)", fontSize: "0.875rem", marginTop: "8px" }}>
            Unable to load material selections. Refresh to try again.
          </p>
        )}

        {/* tab navigation */}
        <div style={{
          marginTop: "16px",
          marginBottom: "0",
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          padding: "5px",
          borderRadius: "14px",
          background: "hsl(220 16% 94%)",
          width: "fit-content",
        }} role="tablist" aria-label="Warehouse views">
          {([
            ["stock",     "📦", "Stock by location"],
            ["movements", "📊", "Tracking"],
            ["receipts",  "📥", "Add stock / receipts"],
            ["catalog",   "📋", "Material catalog"],
          ] as [string, string, string][]).map(([value, emoji, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => { setTab(value); setCreateRequest(0); }}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                background: tab === value ? "white" : "transparent",
                color: tab === value ? "hsl(22 90% 44%)" : "hsl(220 10% 50%)",
                boxShadow: tab === value ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
                transform: tab === value ? "scale(1.02)" : "scale(1)",
              }}
            >
              <span style={{ fontSize: "0.9em" }}>{emoji}</span>
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
