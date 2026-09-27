import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/AppShell";
import { useAuth } from "../contexts/AuthContext";
import { employeeApi, orgApi, type Employee, type CreateEmployeeBody } from "../lib/api";
import { ROLE_LABELS, type AppRole } from "../lib/permissions";
import { toast } from "sonner";
import { Mail, ShieldOff, ShieldCheck } from "lucide-react";
import {
  RegistryTable,
  RecordIdentity,
  RecordStatus,
  RecordActions,
  type RegistryColumn,
} from "../components/RegistryTable";
import { DropdownMenuItem } from "../components/ui/dropdown-menu";

export const Route = createFileRoute("/employees")({ component: EmployeesPage });
function EmployeesPage() {
  const { user } = useAuth();
  const platform = user?.role === "super_admin";
  const qc = useQueryClient();
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
    // Account creation already sends the Cognito invitation. Resending here
    // replaces the temporary credentials from the first email.
    mutationFn: (body: CreateEmployeeBody) => employeeApi.create(body),
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
  const organizationName = (employee: Employee) =>
    organizations.data?.find((org) => org.orgId === employee.orgId)?.name ??
    employee.orgId ??
    "Not assigned";
  const columns: RegistryColumn<Employee>[] = [
    {
      key: "name",
      label: "Account",
      value: (employee) => employee.name,
      render: (employee) => <RecordIdentity name={employee.name} detail={employee.email} />,
    },
    {
      key: "role",
      label: "Role",
      value: (employee) => ROLE_LABELS[employee.role as AppRole] ?? employee.role,
      render: (employee) => (
        <span className="record-plan">
          {ROLE_LABELS[employee.role as AppRole] ?? employee.role}
        </span>
      ),
    },
    {
      key: "organization",
      label: "Organization",
      value: organizationName,
      render: (employee) => (
        <span className="block max-w-52 truncate" title={organizationName(employee)}>
          {organizationName(employee)}
        </span>
      ),
    },
    {
      key: "invitation",
      label: "Invitation",
      value: (employee) => employee.invitationStatus ?? "",
      render: (employee) => employee.invitationStatus || "Not recorded",
    },
    {
      key: "status",
      label: "Status",
      value: (employee) => employee.status,
      render: (employee) => <RecordStatus status={employee.status} />,
    },
    {
      key: "actions",
      label: "",
      render: (employee) => {
        const manageable =
          employee.role !== "super_admin" &&
          employee.employeeId !== user?.sub &&
          (platform || employee.role === "supervisor");
        return (
          <RecordActions name={employee.name} id={employee.employeeId}>
            {manageable && (
              <>
                <DropdownMenuItem
                  disabled={manage.isPending || employee.status !== "Active"}
                  onSelect={() => manage.mutate({ employee, action: "invite" })}
                >
                  <Mail size={14} />
                  Resend invitation
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={manage.isPending}
                  className={employee.status === "Active" ? "record-danger" : ""}
                  onSelect={() =>
                    manage.mutate({
                      employee,
                      action: employee.status === "Active" ? "Disabled" : "Active",
                    })
                  }
                >
                  {employee.status === "Active" ? (
                    <ShieldOff size={14} />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  {employee.status === "Active" ? "Disable account" : "Enable account"}
                </DropdownMenuItem>
              </>
            )}
          </RecordActions>
        );
      },
    },
  ];
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
            <select className={input} disabled value={form.role}>
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
      <RegistryTable
        title="User accounts"
        description="Manage team access, roles, and invitations."
        rows={employees.data ?? []}
        columns={columns}
        rowKey={(employee) => employee.employeeId}
        searchText={(employee) =>
          `${employee.name} ${employee.email} ${employee.orgId ?? ""} ${organizationName(employee)} ${ROLE_LABELS[employee.role as AppRole] ?? employee.role}`
        }
        status={(employee) => employee.status}
        statuses={["Active", "Disabled"]}
        loading={employees.isLoading}
        error={employees.error?.message}
        onRetry={() => employees.refetch()}
      />
    </div>
  );
}
