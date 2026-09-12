import { useQuery } from "@tanstack/react-query";
import { employeeApi } from "../../../lib/api";
import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger } from "../../../components/WorkflowLedger";
import { api, type DomainRecord } from "../../../lib/api";
export const Route = createFileRoute("/projects/$projectId/payroll")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const endpoint = `/projects/${projectId}/payroll`;
  const employees = useQuery({ queryKey: ["employees"], queryFn: employeeApi.list });
  return (
    <>
      <WorkflowLedger
        title="Staff Salary Profiles"
        description="Enter monthly salary components and deductions. Changes apply to future generated cycles; existing snapshots stay unchanged."
        endpoint={`${endpoint}/staff`}
        idKey="employeeId"
        fields={[
          {
            key: "employeeId",
            label: "Employee",
            required: true,
            options: (employees.data ?? [])
              .filter((e) => e.status === "Active")
              .map((e) => ({ value: e.employeeId, label: e.name })),
          },
          ...(["basic", "hra", "conveyance", "medical", "pf", "esi", "tds"] as const).map(
            (key) => ({ key, label: key.toUpperCase(), type: "number" as const, required: true }),
          ),
        ]}
        columns={[
          { key: "name", label: "Employee" },
          { key: "basic", label: "Basic" },
          { key: "hra", label: "HRA" },
          { key: "pf", label: "PF" },
          { key: "esi", label: "ESI" },
          { key: "tds", label: "TDS" },
        ]}
      />
      <WorkflowLedger
        title="Payroll Cycles"
        actions={[
          {
            label: "Reopen for corrections",
            visible: (r) => r.status === "Pending",
            run: (r) => api.delete(`${endpoint}/${r.cycleId}`),
          },
        ]}
        description="Generate a monthly snapshot from saved labour attendance, deductions and staff salary profiles. A night shift earns one additional daily rate. Generated months are locked. Review the wage details before recording an external payment."
        endpoint={endpoint}
        idKey="cycleId"
        fields={[{ key: "month", label: "Payroll month", type: "month", required: true }]}
        columns={[
          { key: "month", label: "Month" },
          { key: "amount", label: "Net wages" },
          { key: "status", label: "Status" },
          { key: "paymentReference", label: "Payment reference" },
        ]}
      />
      <WorkflowLedger
        title="Payroll Wage Details"
        endpoint={endpoint}
        idKey="id"
        transform={(rows) =>
          rows.flatMap((c) =>
            ((c.staff as DomainRecord[]) ?? []).map((s) => ({
              ...s,
              id: `${c.cycleId}-${s.labourId}`,
              month: c.month,
            })),
          )
        }
        columns={[
          { key: "month", label: "Month" },
          { key: "name", label: "Worker" },
          { key: "daysPresent", label: "Days" },
          { key: "nightShifts", label: "Night shifts" },
          { key: "gross", label: "Gross" },
          { key: "deductions", label: "Deductions" },
          { key: "net", label: "Net" },
        ]}
      />
      <WorkflowLedger
        title="Record Payroll Payment"
        description="This records a payment already made outside the app; it does not send money. The month must have a generated payroll cycle."
        endpoint={endpoint}
        idKey="cycleId"
        fields={[
          { key: "month", label: "Payroll month", type: "month", required: true },
          { key: "reference", label: "External payment reference", required: true },
        ]}
        onCreate={(body) => api.post(`${endpoint}/disburse`, body)}
        transform={(rows) => rows.filter((r) => r.status === "Paid")}
        columns={[
          { key: "month", label: "Month" },
          { key: "amount", label: "Amount" },
          { key: "paymentReference", label: "Reference" },
          { key: "paidAt", label: "Recorded at" },
        ]}
      />
    </>
  );
}
