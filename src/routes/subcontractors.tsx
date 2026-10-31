import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger, recordUrl, type LedgerAction } from "../components/WorkflowLedger";
import { api } from "../lib/api";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SubcontractorAnalytics,
  type SubcontractorAnalysis,
} from "../components/SubcontractorAnalytics";

export const Route = createFileRoute("/subcontractors")({ component: Page });

function Page() {
  const [selected, setSelected] = useState("");
  const analysis = useQuery({
    queryKey: ["subcontractor-analytics"],
    queryFn: () => api.get<SubcontractorAnalysis[]>("/subcontractors/analytics"),
    refetchInterval: 60000,
  });
  const report = analysis.data?.find((profile) => profile.subcontractorId === selected);
  const profiles = new Map(
    (analysis.data ?? []).map((profile) => [profile.subcontractorId, profile]),
  );
  return (
    <>
      <WorkflowLedger
        title="Subcontractor Analytics"
        eyebrow="Global Workspace"
        showSummary={false}
        showMonthFilter={false}
        description="View each subcontractor across all projects. Select View analysis for project-wise advances, work payments, work scope, and payment history. Record payments inside the project."
        endpoint="/subcontractors"
        idKey="subcontractorId"
        createLabel="Onboard subcontractor"
        onRefresh={() => {
          analysis.refetch();
        }}
        transform={(rows) =>
          rows.map((row) => {
            const profile = profiles.get(String(row.subcontractorId));
            const fallback = analysis.isError
              ? "Unavailable"
              : analysis.isPending
                ? "Loading..."
                : 0;
            return {
              ...row,
              projectCount: profile?.projectCount ?? fallback,
              advancesPaid: profile?.advancesPaid ?? fallback,
              totalPaid: profile?.totalPaid ?? fallback,
            };
          })
        }
        editFields={[
          { key: "name", label: "Company", required: true },
          { key: "contactPerson", label: "Contact person", required: true },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "trade", label: "Trade", required: true },
          { key: "address", label: "Address", type: "textarea" },
        ]}
        defaults={{ type: "Contractor", status: "Active" }}
        fields={[
          { key: "name", label: "Company", required: true },
          { key: "contactPerson", label: "Contact person", required: true },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "trade", label: "Trade", required: true },
          { key: "address", label: "Address", type: "textarea" },
        ]}
        columns={[
          { key: "name", label: "Company" },
          { key: "contactPerson", label: "Contact" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "trade", label: "Trade" },
          { key: "projectCount", label: "Projects" },
          { key: "advancesPaid", label: "Advances paid (INR)" },
          { key: "totalPaid", label: "Total paid (INR, includes advances)" },
          { key: "status", label: "Status" },
        ]}
        actions={[
          {
            label: "View analysis",
            run: async (row) => {
              setSelected(String(row.subcontractorId));
              return false;
            },
          },
          ...["Active", "Inactive"].map<LedgerAction>((status) => ({
            label: status === "Active" ? "Activate" : "Deactivate",
            visible: (row) => row.status !== status,
            run: (row) => api.patch(recordUrl("/subcontractors", row.subcontractorId), { status }),
          })),
        ]}
      />
      {analysis.isError && (
        <p role="alert" className="p-6 max-w-7xl mx-auto text-destructive">
          Unable to load subcontractor analysis. Use Refresh to try again.
        </p>
      )}
      {selected && analysis.isPending && (
        <p className="p-6 max-w-7xl mx-auto text-muted-foreground">Loading project analysis...</p>
      )}
      {report && <SubcontractorAnalytics key={report.subcontractorId} report={report} />}
    </>
  );
}
