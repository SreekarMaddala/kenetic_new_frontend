import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/AppShell";
import { useAuth } from "../contexts/AuthContext";
import { employeeApi, orgApi, type Employee, type CreateEmployeeBody } from "../lib/api";
import { ROLE_LABELS, type AppRole } from "../lib/permissions";
import { toast } from "sonner";

export const Route = createFileRoute("/employees")({ component: EmployeesPage });
function EmployeesPage() {
  const { user } = useAuth();
  const platform = user?.role === "super_admin";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateEmployeeBody>({
    name: "",
    email: "",
    role: platform ? "operations_admin" : "supervisor",
    orgId: platform ? "" : user?.orgId,
    department: "",
    phone: "",
    location: "",
  });
  const employees = useQuery({ queryKey: ["employees"], queryFn: employeeApi.list });
  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: orgApi.list,
    enabled: platform,
  });
  const create = useMutation({
    mutationFn: async (body: CreateEmployeeBody) => {
      const created = await employeeApi.create(body);
      if (created?.employeeId) {
        try {
          await employeeApi.invite(created.employeeId, created.orgId);
        } catch (e) {
          console.warn("Failed to auto-send invitation email:", e);
        }
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
      setForm({ ...form, name: "", email: "" });
      toast.success("Account created and invitation email sent successfully!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const manage = useMutation({
    mutationFn: ({
      employee,
      action,
    }: {
      employee: Employee;
      action: "invite" | "Active" | "Disabled";
    }) =>
      action === "invite"
        ? employeeApi.invite(employee.employeeId, employee.orgId)
        : employeeApi.update(employee.employeeId, { status: action }, employee.orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Account updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(form);
  }
  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <PageHeader
        title="User Accounts"
        eyebrow={platform ? "Platform administration" : "Organization administration"}
        actions={
          <button
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2"
            onClick={() => setOpen(!open)}
          >
            {open ? "Close" : "Create account"}
          </button>
        }
      />
      {open && (
        <form
          onSubmit={submit}
          className="rounded-xl border border-border bg-card p-6 grid gap-4 md:grid-cols-2"
        >
          <label className="text-sm space-y-2">
            Full name
            <input
              className={input}
              required
              maxLength={128}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="text-sm space-y-2">
            Email
            <input
              type="email"
              className={input}
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="text-sm space-y-2">
            Role
            <select
              className={input}
              disabled
              value={form.role}
            >
              {platform ? (
                <option value="operations_admin">Operations Admin</option>
              ) : (
                <option value="supervisor">Supervisor</option>
              )}
            </select>
          </label>
          {platform && (
            <label className="text-sm space-y-2">
              Organization
              <select
                className={input}
                required
                value={form.orgId}
                onChange={(e) => setForm({ ...form, orgId: e.target.value })}
              >
                <option value="">Choose an organization</option>
                {organizations.data
                  ?.filter((o) => o.status === "Active")
                  .map((o) => (
                    <option key={o.orgId} value={o.orgId}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {(["department", "phone", "location"] as const).map((field) => (
            <label key={field} className="text-sm space-y-2 capitalize">
              {field}
              <input
                className={input}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              />
            </label>
          ))}
          {organizations.error && (
            <p role="alert" className="text-red-600">
              {organizations.error.message}
            </p>
          )}
          {create.error && (
            <p role="alert" className="text-red-600">
              {create.error.message}
            </p>
          )}
          <div className="md:col-span-2">
            <button
              disabled={create.isPending}
              className="rounded-lg bg-primary text-primary-foreground px-5 py-2 disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      )}
      <input
        aria-label="Search accounts"
        className={input}
        placeholder="Search name, email or organization"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {employees.error && (
        <p role="alert" className="text-red-600">
          {employees.error.message}
        </p>
      )}
      {employees.isLoading ? (
        <p>Loading accounts…</p>
      ) : (
        <div className="overflow-auto border border-border rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary">
              <tr>
                {["Account", "Role", "Organization", "Status", "Actions"].map((h) => (
                  <th key={h} className="p-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.data
                ?.filter((e) =>
                  `${e.name} ${e.email} ${e.orgId}`.toLowerCase().includes(search.toLowerCase()),
                )
                .map((employee) => {
                  const manageable =
                    employee.role !== "super_admin" &&
                    employee.employeeId !== user?.sub &&
                    (platform || employee.role === "supervisor");
                  return (
                    <tr key={employee.employeeId} className="border-t border-border">
                      <td className="p-4">
                        <p className="font-semibold">{employee.name}</p>
                        <p className="text-muted-foreground">{employee.email}</p>
                      </td>
                      <td className="p-4">
                        {ROLE_LABELS[employee.role as AppRole] ?? employee.role}
                      </td>
                      <td className="p-4">
                        {organizations.data?.find((o) => o.orgId === employee.orgId)?.name ??
                          employee.orgId}
                      </td>
                      <td className="p-4">{employee.status}</td>
                      <td className="p-4">
                        {manageable && (
                          <div className="flex gap-3">
                            <button
                              disabled={manage.isPending || employee.status !== "Active"}
                              className="text-primary disabled:opacity-40"
                              onClick={() => manage.mutate({ employee, action: "invite" })}
                            >
                              {employee.invitationStatus === "Sent"
                                ? "Resend invitation"
                                : "Send invitation"}
                            </button>
                            <button
                              disabled={manage.isPending}
                              className="text-primary disabled:opacity-40"
                              onClick={() =>
                                manage.mutate({
                                  employee,
                                  action: employee.status === "Active" ? "Disabled" : "Active",
                                })
                              }
                            >
                              {employee.status === "Active" ? "Disable" : "Enable"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {employees.data?.length === 0 && (
            <p className="p-6 text-muted-foreground">No accounts yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
