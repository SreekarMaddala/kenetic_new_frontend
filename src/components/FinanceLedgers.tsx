import { WorkflowLedger, reviewActions, type Field } from "./WorkflowLedger";
import { useProject } from "../lib/ProjectContext";
import { useQuery } from "@tanstack/react-query";
import { vendorApi, api, type DomainRecord, type InventoryItem } from "../lib/api";

export function PaymentLedger() {
  const { projectId, projects } = useProject();
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: vendorApi.list });
  const materials = useQuery({
    queryKey: ["material-catalog"],
    queryFn: () => api.get<InventoryItem[]>("/inventory?catalog=true"),
  });
  const endpoint = `/projects/${projectId}/payments`;
  const bills = useQuery({
    queryKey: ["bills", projectId],
    queryFn: () => api.get<DomainRecord[]>(`/projects/${projectId}/bills`),
    enabled: !!projectId,
  });
  const fields: Field[] = [
    {
      key: "vendorId",
      label: "Vendor",
      required: true,
      options: (vendors.data ?? []).map((v) => ({ value: v.vendorId, label: v.name })),
    },
    {
      key: "materialId",
      label: "Material supplied",
      required: true,
      dependsOn: "vendorId",
      optionsByValue: Object.fromEntries(
        (vendors.data ?? []).map((vendor) => [
          vendor.vendorId,
          (materials.data ?? [])
            .filter((item) => vendor.materialIds?.includes(item.itemId))
            .map((item) => ({ value: item.itemId, label: `${item.name} (${item.unit})` })),
        ]),
      ),
      helperText:
        materials.isError || vendors.isError
          ? "Unable to load vendor materials. Refresh and try again."
          : "Select a vendor first. Assign materials to the vendor in Vendors if the list is empty.",
    },
    ...(projectId
      ? [
          {
            key: "billId",
            label: "Approved bill (optional)",
            options: (bills.data ?? [])
              .filter((b) => b.status === "Approved")
              .map((b) => ({ value: String(b.billId), label: String(b.billNumber) })),
          },
        ]
      : []),
    { key: "amount", label: "Amount paid", type: "number", min: 0.01, required: true },
    { key: "date", label: "Payment date", type: "date", required: true },
    {
      key: "mode",
      label: "Payment mode",
      required: true,
      options: ["NEFT", "RTGS", "Cheque", "Cash", "UPI"].map((value) => ({ value, label: value })),
    },
    { key: "reference", label: "Transaction / receipt reference", required: true },
    { key: "description", label: "Remarks", type: "textarea" },
  ];
  if (!projectId) return null;

  return (
    <WorkflowLedger
      title="Vendor Payments"
      description="Record payments made outside this app. Approved payments contribute to project spending; this action does not initiate a bank transfer."
      endpoint={endpoint}
      idKey="paymentId"
      fields={fields}
      onCreate={(body) =>
        api.post(endpoint, {
          ...body,
          projectId,
        })
      }
      columns={[
        { key: "date", label: "Date" },
        { key: "vendorName", label: "Vendor" },
        { key: "material", label: "Material" },
        { key: "materialUnit", label: "Unit" },
        { key: "projectName", label: "Project" },
        { key: "amount", label: "Amount" },
        { key: "mode", label: "Mode" },
        { key: "reference", label: "Reference" },
        { key: "description", label: "Remarks" },
        { key: "status", label: "Status" },
      ]}
      transform={(rows) =>
        rows.map((r) => ({
          ...r,
          projectName: projects.find((p) => p.projectId === r.projectId)?.name ?? r.projectId,
        }))
      }
      actions={reviewActions(endpoint, "paymentId")}
    />
  );
}
export function GlobalExpenseLedger() {
  const { projects } = useProject();
  return (
    <WorkflowLedger
      title="Global Expenses"
      endpoint="/expenses"
      idKey="expenseId"
      fields={[
        {
          key: "projectId",
          label: "Project",
          required: true,
          options: projects.map((p) => ({ value: p.projectId, label: p.name })),
        },
        { key: "description", label: "Description", required: true },
        { key: "category", label: "Category", required: true },
        { key: "amount", label: "Amount", type: "number", min: 0.01, required: true },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "submittedBy", label: "Paid by", required: true },
      ]}
      columns={[
        { key: "date", label: "Date" },
        { key: "projectName", label: "Project" },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
      ]}
      transform={(rows) =>
        rows.map((r) => ({
          ...r,
          projectName: projects.find((p) => p.projectId === r.projectId)?.name ?? r.projectId,
        }))
      }
      actions={reviewActions("/expenses", "expenseId")}
    />
  );
}
