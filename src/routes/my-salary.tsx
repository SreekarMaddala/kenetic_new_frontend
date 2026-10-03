import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { PageHeader } from "../components/AppShell";
import { useAuth } from "../contexts/AuthContext";
import { api, projectApi } from "../lib/api";

export const Route = createFileRoute("/my-salary")({ component: MySalaryPage });

type Salary = {
  profile: Record<string, number> | null;
  history: { month: string; status: string; gross: number; deductions: number; net: number }[];
};
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

function MySalaryPage() {
  const { user } = useAuth();
  const salary = useQuery({
    queryKey: ["my-salary", user?.orgId, user?.sub],
    enabled: !!user,
    queryFn: async () => {
      const projects = await projectApi.list();
      return Promise.all(
        projects.map(async (project) => ({
          project,
          ...(await api.get<Salary>(
            `/projects/${encodeURIComponent(project.projectId)}/payroll/me`,
          )),
        })),
      );
    },
  });
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader title="My Salary" eyebrow="Your earnings" />
      <p className="text-sm text-muted-foreground">
        Your monthly salary structure and recorded payments for each assigned project.
      </p>
      {salary.isPending && <p role="status">Loading your salary details...</p>}
      {salary.isError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5">
          Unable to load your salary details.{" "}
          <button className="text-primary underline" onClick={() => salary.refetch()}>
            Try again
          </button>
        </div>
      )}
      {salary.data?.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-muted-foreground">
          You have no assigned projects yet. Your salary will appear here once your administrator
          assigns a project and configures your salary.
        </div>
      )}
      {salary.data?.map(({ project, profile, history }) => {
        const gross = profile
          ? ["basic", "hra", "conveyance", "medical"].reduce(
              (sum, key) => sum + Number(profile[key] ?? 0),
              0,
            )
          : 0;
        const deductions = profile
          ? ["pf", "esi", "tds"].reduce((sum, key) => sum + Number(profile[key] ?? 0), 0)
          : 0;
        return (
          <section
            key={project.projectId}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="p-5 sm:p-6 border-b border-border flex items-center gap-3">
              <Wallet className="size-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">{project.name}</h2>
            </div>
            <div className="p-5 sm:p-6 space-y-6">
              {profile ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      ["Monthly gross", gross],
                      ["Deductions", deductions],
                      ["Monthly take-home", gross - deductions],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-secondary/40 p-4">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="mt-2 text-2xl font-semibold text-primary">
                          {money(Number(value))}
                        </p>
                      </div>
                    ))}
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      ["basic", "Basic salary"],
                      ["hra", "HRA"],
                      ["conveyance", "Conveyance"],
                      ["medical", "Medical"],
                      ["pf", "PF"],
                      ["esi", "ESI"],
                      ["tds", "TDS"],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="mt-1 text-sm font-medium">
                          {money(Number(profile[key] ?? 0))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your salary has not been configured for this project. Contact your Operations
                  Admin.
                </p>
              )}
              <div>
                <h3 className="font-semibold mb-3">Payment history</h3>
                {history.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-border">
                          {["Month", "Gross", "Deductions", "Take-home", "Status"].map((label) => (
                            <th key={label} className="py-3 pr-5 font-medium text-muted-foreground">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((row) => (
                          <tr key={row.month} className="border-b border-border last:border-0">
                            <td className="py-3 pr-5 whitespace-nowrap">
                              {new Date(`${row.month}-01T00:00:00`).toLocaleDateString("en-IN", {
                                month: "long",
                                year: "numeric",
                              })}
                            </td>
                            <td className="pr-5">{money(row.gross)}</td>
                            <td className="pr-5">{money(row.deductions)}</td>
                            <td className="pr-5 font-semibold">{money(row.net)}</td>
                            <td>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status === "Paid" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No payroll has been generated for you yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
