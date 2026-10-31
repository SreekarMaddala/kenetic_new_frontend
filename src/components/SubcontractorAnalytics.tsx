import { useState } from "react";
import { exportToExcel } from "../lib/excel";

type Totals = {
  contractValue: number;
  advancesPaid: number;
  workPayments: number;
  unclassifiedPaid: number;
  totalPaid: number;
  pendingPayments: number;
};
type Payment = {
  paymentId: string;
  date: string;
  amount: number;
  paymentType: string;
  status: string;
  mode: string;
  reference: string;
  description: string;
};
type ProjectData = Totals & {
  projectId: string;
  projectName: string;
  scopeOfWork: string;
  assignmentStatus: string;
  startDate: string;
  endDate: string;
  payments: Payment[];
};
export type SubcontractorAnalysis = Totals & {
  subcontractorId: string;
  name: string;
  contactPerson: string;
  trade: string;
  status: string;
  projectCount: number;
  projects: ProjectData[];
};

const money = (amount: number) =>
  amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function SubcontractorAnalytics({ report }: { report: SubcontractorAnalysis }) {
  const [projectId, setProjectId] = useState("");
  const projects = report.projects.filter((p) => !projectId || p.projectId === projectId);
  const total = (key: keyof Totals) => projects.reduce((sum, p) => sum + p[key], 0);
  const payments = projects
    .flatMap((p) =>
      p.payments.map((payment) => ({
        ...payment,
        projectName: p.projectName,
        projectId: p.projectId,
      })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const exportRows = projects.map((p) => ({
    Subcontractor: report.name,
    Project: p.projectName,
    Scope: p.scopeOfWork,
    "Contract value (INR)": p.contractValue,
    "Advances paid (INR)": p.advancesPaid,
    "Work payments (INR)": p.workPayments,
    "Older unclassified payments (INR)": p.unclassifiedPaid,
    "Total paid (INR)": p.totalPaid,
    "Pending payments (INR)": p.pendingPayments,
  }));
  return (
    <section
      className="p-6 max-w-7xl mx-auto space-y-5"
      aria-label="Subcontractor project analysis"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">{report.name} - project analysis</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.contactPerson} {report.trade && " / " + report.trade}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filter subcontractor projects"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">All projects</option>
            {report.projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.projectName}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!projects.length}
            onClick={() => exportToExcel(exportRows, report.name + " - Project Analysis")}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
          >
            Export project analysis
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Projects", String(projects.length)],
          ["Contract value", money(total("contractValue"))],
          ["Advances paid", money(total("advancesPaid"))],
          ["Total paid (includes advances)", money(total("totalPaid"))],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-[color:var(--surface)] p-4"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        All-time paid totals include approved payments only. Advances are included in total paid.
        Pending and reversed entries do not increase paid totals. Older payments without a category
        remain unclassified.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-[color:var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {[
                "Project",
                "Work scope",
                "Assignment",
                "Contract value",
                "Advances paid",
                "Work payments",
                "Unclassified paid",
                "Total paid",
                "Pending payments",
                "",
              ].map((heading) => (
                <th key={heading} className="p-3 whitespace-nowrap">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.projectId} className="border-b border-border last:border-0">
                <td className="p-3 font-semibold">{p.projectName}</td>
                <td className="p-3 min-w-40">{p.scopeOfWork || "-"}</td>
                <td className="p-3">{p.assignmentStatus}</td>
                <td className="p-3 whitespace-nowrap">{money(p.contractValue)}</td>
                <td className="p-3 whitespace-nowrap">{money(p.advancesPaid)}</td>
                <td className="p-3 whitespace-nowrap">{money(p.workPayments)}</td>
                <td className="p-3 whitespace-nowrap">{money(p.unclassifiedPaid)}</td>
                <td className="p-3 whitespace-nowrap font-semibold">{money(p.totalPaid)}</td>
                <td className="p-3 whitespace-nowrap">{money(p.pendingPayments)}</td>
                <td className="p-3">
                  <a
                    className="text-primary font-semibold whitespace-nowrap"
                    href={"/projects/" + encodeURIComponent(p.projectId) + "/subcontractors"}
                  >
                    Open project
                  </a>
                </td>
              </tr>
            ))}
            {!projects.length && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-muted-foreground">
                  No projects assigned to this subcontractor yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h3 className="font-semibold">Project payment history</h3>
      <div className="overflow-x-auto rounded-xl border border-border bg-[color:var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {[
                "Date",
                "Project",
                "Category",
                "Amount",
                "Status",
                "Mode",
                "Reference",
                "Remarks",
              ].map((heading) => (
                <th key={heading} className="p-3 whitespace-nowrap">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.projectId + p.paymentId} className="border-b border-border last:border-0">
                <td className="p-3 whitespace-nowrap">{p.date || "-"}</td>
                <td className="p-3">{p.projectName}</td>
                <td className="p-3">
                  {p.paymentType === "Advance"
                    ? "Advance"
                    : p.paymentType === "Payment"
                      ? "Work payment"
                      : "Unclassified"}
                </td>
                <td className="p-3 whitespace-nowrap">{money(p.amount)}</td>
                <td className="p-3">{p.status}</td>
                <td className="p-3">{p.mode}</td>
                <td className="p-3">{p.reference || "-"}</td>
                <td className="p-3">{p.description || "-"}</td>
              </tr>
            ))}
            {!payments.length && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No payments recorded for the selected projects. Record advances and work payments
                  inside the project.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
