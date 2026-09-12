import { WorkflowLedger, reviewActions, type Field } from "./WorkflowLedger";
import { useProject } from "../lib/ProjectContext";
import { useQuery } from "@tanstack/react-query";
import { vendorApi, api, type DomainRecord } from "../lib/api";

export function PaymentLedger() {
  const { projectId, projects } = useProject();
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: vendorApi.list });
  const endpoint = projectId ? `/projects/${projectId}/payments` : "/payments";
  const bills = useQuery({
    queryKey: ["bills", projectId],
    queryFn: () => api.get<DomainRecord[]>(`/projects/${projectId}/bills`),
    enabled: !!projectId,
  });
  const fields: Field[] = [
    ...(!projectId
      ? [
          {
            key: "projectId",
            label: "Project",
            required: true,
            options: projects.map((p) => ({ value: p.projectId, label: p.name })),
          },
        ]
      : []),
    {
      key: "vendorId",
      label: "Vendor",
      required: true,
      options: (vendors.data ?? []).map((v) => ({ value: v.vendorId, label: v.name })),
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
          projectId: projectId || body.projectId,
          vendorName: vendors.data?.find((v) => v.vendorId === body.vendorId)?.name,
        })
      }
      columns={[
        { key: "date", label: "Date" },
        { key: "vendorName", label: "Vendor" },
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
