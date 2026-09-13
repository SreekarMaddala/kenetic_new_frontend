import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { api, projectApi, type DomainRecord } from "../../../lib/api";
import { PageHeader } from "../../../components/AppShell";
import { exportToExcel } from "../../../lib/excel";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$projectId/labour")({ component: Page });
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
const input = "rounded-lg border border-border bg-background px-3 py-2 text-sm";
const button =
  "rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-40";
function Page() {
  const { projectId } = Route.useParams();
  const [day, setDay] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <PageHeader
        title="Daily Site Attendance"
        eyebrow="Worker allocation & daily wages"
        actions={
          <label className="grid gap-1 text-xs">
            Attendance date
            <input
              type="date"
              className={input}
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </label>
        }
      />
      {day ? (
        <AttendanceDay key={`${projectId}-${day}`} projectId={projectId} day={day} />
      ) : (
        <p>Select an attendance date.</p>
      )}
    </div>
  );
}
function AttendanceDay({ projectId, day }: { projectId: string; day: string }) {
  const user = useAuth().user;
  const admin = user?.role === "operations_admin" || user?.role === "super_admin";
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("800");
  const projects = useQuery({ queryKey: ["projects"], queryFn: projectApi.list });
  const query = useQuery({
    queryKey: ["labour", projectId, day, admin ? "allocation" : "attendance"],
    queryFn: () =>
      api.get<DomainRecord[]>(
        `/supervisor/labour/attendance?projectId=${encodeURIComponent(projectId)}&date=${day}${admin ? "&roster=true" : ""}`,
      ),
    refetchInterval: 15000,
  });
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["labour"] }),
      qc.invalidateQueries({ queryKey: ["employee-analytics"] }),
      qc.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
      qc.invalidateQueries({ queryKey: ["projects"] }),
      qc.invalidateQueries({ queryKey: ["project", projectId] }),
      qc.invalidateQueries({ queryKey: ["payroll-cycle", projectId] }),
    ]);
  }
  const register = useMutation({
    mutationFn: () =>
      api.post("/supervisor/labour/attendance", {
        projectId,
        date: day,
        operation: "register",
        name: newName.trim(),
        rate: Number(newRate),
      }),
    onSuccess: async () => {
      setNewName("");
      await refresh();
      toast.success("Worker registered. Confirm the project allocation with Enter.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const workers = query.data ?? [];
  const siteWorkers = workers.filter((worker) => worker.allocatedProjectId === projectId);
  const present = siteWorkers.filter((worker) => worker.status === "Present");
  const wages = present.reduce((sum, worker) => sum + Number(worker.dailyWage ?? worker.rate), 0);
  const paid = present
    .filter((worker) => worker.paymentStatus === "Paid")
    .reduce((sum, worker) => sum + Number(worker.dailyWage ?? worker.rate), 0);
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {admin
          ? "Choose each worker’s project and click Enter to confirm allocation for this date. The latest allocation is selected by default. After confirmation, you or the project supervisor can save attendance and payment status."
          : "The admin must confirm your workers’ allocations for this date before you can save attendance. Mark Present or Absent, then Paid or Not paid for the daily wage."}
      </p>
      {query.error ? (
        <div role="alert" className="text-red-600">
          Unable to load attendance: {query.error.message}{" "}
          <button className={input} onClick={() => query.refetch()}>
            Retry
          </button>
        </div>
      ) : query.isLoading ? (
        <p>Loading workers...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Present at this project", `${present.length} / ${siteWorkers.length}`],
              ["Paid today", money(paid)],
              ["Unpaid wages today", money(wages - paid)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs uppercase text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-2">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 flex flex-wrap justify-between gap-3 items-center">
              <h2 className="font-semibold">
                {admin ? "Worker Allocation & Attendance" : "Daily Attendance & Payment"}
              </h2>
              <button
                className={input}
                disabled={!siteWorkers.length}
                onClick={() =>
                  exportToExcel(
                    siteWorkers.map((worker) => ({
                      Name: worker.name,
                      Date: day,
                      Attendance: worker.attendanceRecorded ? worker.status : "Not marked",
                      Payment: worker.paymentStatus,
                      Wage: worker.dailyWage,
                      Unpaid:
                        worker.status === "Present" && worker.paymentStatus !== "Paid"
                          ? worker.dailyWage
                          : 0,
                    })),
                    `attendance-${projectId}-${day}`,
                  )
                }
              >
                Export attendance
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary">
                  <tr>
                    {[
                      "Worker",
                      "Daily wage",
                      "Project allocation",
                      "Attendance",
                      "Payment",
                      "Unpaid today",
                      "Save",
                    ].map((label) => (
                      <th className="p-4 whitespace-nowrap" key={label}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => (
                    <WorkerRow
                      key={String(worker.labourAttendanceId)}
                      worker={worker}
                      admin={admin}
                      projects={projects.data ?? []}
                      projectId={projectId}
                      day={day}
                      refresh={refresh}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {!workers.length && (
              <p className="p-6 text-muted-foreground">
                {admin
                  ? "Register a worker to begin allocation."
                  : "No workers allocated to this project. Ask your admin to allocate workers."}
              </p>
            )}
          </div>
        </>
      )}
      {projects.error && (
        <p role="alert" className="text-red-600">
          Unable to load project choices: {projects.error.message}
        </p>
      )}
      {admin && (
        <form
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            register.mutate();
          }}
        >
          <h2 className="font-semibold">Register Worker</h2>
          <div className="flex flex-wrap items-end gap-4">
            <label className="grid gap-2 text-sm">
              Worker name
              <input
                required
                maxLength={128}
                className={input}
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Daily wage (₹)
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className={input}
                value={newRate}
                onChange={(event) => setNewRate(event.target.value)}
              />
            </label>
            <button className={button} disabled={register.isPending}>
              {register.isPending ? "Registering..." : "Register worker"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
function WorkerRow({
  worker,
  admin,
  projects,
  projectId,
  day,
  refresh,
}: {
  worker: DomainRecord;
  admin: boolean;
  projects: { projectId: string; name: string }[];
  projectId: string;
  day: string;
  refresh: () => Promise<void>;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ status: string; paymentStatus: string } | null>(null);
  const allocation = target ?? String(worker.allocatedProjectId ?? projectId);
  const status = draft?.status ?? String(worker.status ?? "Absent");
  const payment = draft?.paymentStatus ?? String(worker.paymentStatus ?? "Not paid");
  const enabled = !!worker.allocationConfirmed;
  const save = useMutation({
    mutationFn: (operation: "allocate" | "attendance") =>
      api.post("/supervisor/labour/attendance", {
        projectId,
        date: day,
        labourAttendanceId: worker.labourAttendanceId,
        operation,
        ...(operation === "allocate"
          ? { targetProjectId: allocation }
          : { status, paymentStatus: payment }),
      }),
    onSuccess: async (_, operation) => {
      setDraft(null);
      setTarget(null);
      await refresh();
      toast.success(
        operation === "allocate"
          ? "Allocation confirmed. Attendance is now available at the selected project."
          : "Attendance and payment saved.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <tr className="border-t border-border">
      <td className="p-4 font-semibold">{String(worker.name)}</td>
      <td className="p-4 whitespace-nowrap">{money(Number(worker.rate))}</td>
      <td className="p-4">
        <div className="flex gap-2 items-center">
          {admin ? (
            <>
              <select
                aria-label={`Project for ${worker.name}`}
                className={input}
                value={allocation}
                disabled={save.isPending || !!worker.allocationStarted}
                onChange={(event) => setTarget(event.target.value)}
              >
                {!projects.some((project) => project.projectId === allocation) && (
                  <option value={allocation}>{allocation}</option>
                )}
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                className={button}
                disabled={save.isPending || !!worker.allocationStarted}
                onClick={() => save.mutate("allocate")}
              >
                Enter
              </button>
            </>
          ) : (
            <span>
              {projects.find((project) => project.projectId === allocation)?.name ?? allocation}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {worker.allocationDate === day
            ? "Confirmed for this date"
            : "Awaiting admin confirmation"}
          {worker.allocationStarted ? " · Attendance started" : ""}
        </p>
      </td>
      <td className="p-4">
        <div className="inline-flex rounded-full border border-border p-1 gap-1">
          {["Present", "Absent"].map((value) => (
            <button
              key={value}
              aria-pressed={status === value}
              disabled={!enabled || save.isPending}
              onClick={() =>
                setDraft({
                  status: value,
                  paymentStatus: value === "Absent" ? "Not paid" : payment,
                })
              }
              className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40 ${status === value ? (value === "Present" ? "bg-emerald-600 text-white" : "bg-slate-600 text-white") : "text-muted-foreground"}`}
            >
              {value}
            </button>
          ))}
        </div>
        {!worker.attendanceRecorded && (
          <p className="text-xs text-muted-foreground mt-1">Not saved yet</p>
        )}
      </td>
      <td className="p-4">
        <select
          aria-label={`Payment for ${worker.name}`}
          className={input}
          disabled={!enabled || status !== "Present" || save.isPending}
          value={payment}
          onChange={(event) => setDraft({ status, paymentStatus: event.target.value })}
        >
          <option>Not paid</option>
          <option>Paid</option>
        </select>
      </td>
      <td className="p-4 whitespace-nowrap font-semibold">
        {money(enabled && status === "Present" && payment !== "Paid" ? Number(worker.rate) : 0)}
      </td>
      <td className="p-4">
        <button
          className={button}
          disabled={!enabled || save.isPending}
          onClick={() => save.mutate("attendance")}
        >
          {save.isPending ? "Saving..." : "Save"}
        </button>
        {save.error && (
          <p role="alert" className="text-xs text-red-600 mt-2">
            {save.error.message}
          </p>
        )}
      </td>
    </tr>
  );
}
