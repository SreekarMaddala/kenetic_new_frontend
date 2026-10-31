import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  Download,
  UserCheck,
  UserPlus,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { api, projectApi, type DomainRecord } from "../../../lib/api";
import { exportToExcel } from "../../../lib/excel";
import { toast } from "sonner";
import { WorkerAllocationDialog } from "../../../components/WorkerAllocationDialog";
import { WorkerProfile } from "../../../components/WorkerProfile";
import { GangAttendancePanel } from "../../../components/GangAttendancePanel";
import { saveWorkerBatch, workerId } from "../../../lib/workerAttendance";
import "../../../styles/attendance.css";

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
    <div className="attendance-page">
      <header className="attendance-header">
        <div className="attendance-heading">
          <span className="attendance-icon">
            <UsersRound size={25} />
          </span>
          <div>
            <span className="attendance-eyebrow">PEOPLE &amp; OPERATIONS</span>
            <h1>Daily Site Attendance</h1>
            <p>Track your teams. Record attendance. Keep daily wages clear.</p>
          </div>
        </div>
        <label className="attendance-date">
          <span>
            <CalendarDays size={13} /> Attendance date
          </span>
          <input
            type="date"
            className={input}
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
      </header>
      <div className="attendance-content">
        {day ? (
          <AttendanceDay key={`${projectId}-${day}`} projectId={projectId} day={day} />
        ) : (
          <p>Select an attendance date.</p>
        )}
      </div>
    </div>
  );
}
function AttendanceDay({ projectId, day }: { projectId: string; day: string }) {
  const user = useAuth().user;
  const admin = user?.role === "operations_admin" || user?.role === "super_admin";
  const canRecordAttendance = user?.role === "supervisor";
  const qc = useQueryClient();
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [profile, setProfile] = useState<DomainRecord | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("Present");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const projects = useQuery({ queryKey: ["projects"], queryFn: projectApi.list });
  const query = useInfiniteQuery({
    queryKey: ["labour", projectId, day, admin ? "allocation" : "attendance"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.page<DomainRecord>(
        `/supervisor/labour/attendance?projectId=${encodeURIComponent(projectId)}&date=${day}${admin ? "&roster=true" : ""}`,
        pageParam,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 60000,
  });
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["labour"] }),
      qc.invalidateQueries({ queryKey: ["worker-profile"] }),
      qc.invalidateQueries({ queryKey: ["employee-analytics"] }),
      qc.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
      qc.invalidateQueries({ queryKey: ["projects"] }),
      qc.invalidateQueries({ queryKey: ["project", projectId] }),
      qc.invalidateQueries({ queryKey: ["payroll-cycle", projectId] }),
      qc.invalidateQueries({ queryKey: ["gang-attendance", projectId, day] }),
      qc.invalidateQueries({ queryKey: ["posted-spending", projectId] }),
      qc.invalidateQueries({ queryKey: ["executive-report"] }),
    ]);
  }
  const workers = query.data?.pages.flatMap((page) => page.items) ?? [];
  const siteWorkers = workers.filter((worker) => worker.allocatedProjectId === projectId);
  const eligible = siteWorkers.filter(
    (worker) => worker.allocationConfirmed && !worker.attendanceRecorded,
  );
  async function saveSelectedAttendance() {
    if (!canRecordAttendance || bulkBusy) return;
    setBulkBusy(true);
    setBulkErrors([]);
    try {
      const chosen = eligible.filter((worker) => selected.has(workerId(worker)));
      const result = await saveWorkerBatch(chosen, (worker) =>
        api.post("/supervisor/labour/attendance", {
          projectId,
          date: day,
          workerId: workerId(worker),
          operation: "attendance",
          status: bulkStatus,
          paymentStatus: "Not paid",
          nightShift: false,
          expectedVersion: worker.attendanceVersion ?? 0,
        }),
      );
      setSelected(new Set(result.failed.map((failure) => workerId(failure.item))));
      setBulkErrors(result.failed.map((failure) => `${failure.item.name}: ${failure.message}`));
      toast.success(`${result.succeeded.length} attendance record(s) saved.`);
      await refresh();
    } catch (error) {
      setBulkErrors([
        error instanceof Error
          ? error.message
          : "Unable to refresh attendance. Reload before retrying.",
      ]);
    } finally {
      setBulkBusy(false);
    }
  }
  const present = siteWorkers.filter((worker) => worker.status === "Present");
  const halfDay = siteWorkers.filter((worker) => worker.status === "Half Day");
  const wages = siteWorkers.reduce(
    (sum, worker) =>
      sum +
      Number(
        worker.dailyWage ??
          (worker.status === "Half Day"
            ? Number(worker.rate) * 0.5
            : worker.status === "Present"
              ? worker.rate
              : 0),
      ),
    0,
  );
  const paid = siteWorkers
    .filter((worker) => worker.paymentStatus === "Paid")
    .reduce((sum, worker) => sum + Number(worker.dailyWage ?? worker.rate), 0);
  return (
    <>
      <div className="attendance-toolbar">
        <p>
          {admin
            ? "Assign gangs below. Supervisors record how many people worked; gang advances are deducted when you prepare payroll. Use worker allocation for individual workers."
            : "Enter how many people worked in each gang below. Your admin manages gang advances and payments. Individual workers are listed separately."}
        </p>
        {admin && (
          <button
            className="attendance-allocate"
            disabled={bulkBusy || !projects.data?.length}
            onClick={() => setAllocationOpen(true)}
          >
            <UserPlus size={16} aria-hidden="true" />
            <span>Allocate workers / copy yesterday</span>
          </button>
        )}
      </div>
      {allocationOpen && (
        <WorkerAllocationDialog
          projectId={projectId}
          day={day}
          projects={projects.data ?? []}
          refresh={refresh}
          onClose={() => setAllocationOpen(false)}
        />
      )}
      {profile && (
        <WorkerProfile
          id={workerId(profile)}
          name={String(profile.name)}
          projectId={projectId}
          day={day}
          onClose={() => setProfile(null)}
        />
      )}
      {!query.error && !query.isLoading && !!workers.length && (
        <section className="attendance-metrics" aria-label="Individual worker summary">
          {[
            {
              label: "Workers present",
              value: `${present.length} / ${siteWorkers.length}`,
              note: "Individual workers at this site",
              icon: UserCheck,
            },
            {
              label: "Half days",
              value: `${halfDay.length}`,
              note: "Individual workers on a half day",
              icon: Clock3,
            },
            {
              label: "Wages paid today",
              value: money(paid),
              note: "Individual worker payments",
              icon: Wallet,
            },
            {
              label: "Wages unpaid today",
              value: money(wages - paid),
              note: "Individual wages still to pay",
              icon: CalendarDays,
            },
          ].map(({ label, value, note, icon: Icon }) => (
            <article key={label}>
              <span className="attendance-metric-icon">
                <Icon size={20} />
              </span>
              <div>
                <p>{label}</p>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            </article>
          ))}
        </section>
      )}
      <GangAttendancePanel
        projectId={projectId}
        day={day}
        admin={admin}
        canRecordAttendance={canRecordAttendance}
        blocked={bulkBusy}
        setBusy={setBulkBusy}
        refresh={refresh}
      />
      {query.error ? (
        <div role="alert" className="text-red-600">
          Unable to load attendance: {query.error.message}{" "}
          <button className={input} onClick={() => query.refetch()}>
            Retry
          </button>
        </div>
      ) : query.isLoading ? (
        <p>Loading workers...</p>
      ) : workers.length ? (
        <>
          {query.hasNextPage && (
            <div className="flex justify-between items-center gap-4 text-sm">
              <p>Attendance counts and export cover {workers.length} loaded workers.</p>
              <button
                className={button}
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? "Loading…" : "Load more workers"}
              </button>
            </div>
          )}

          <details open={!workers.some((worker) => worker.gangId)} className="attendance-records">
            <summary>Individual workers &amp; member corrections</summary>
            {canRecordAttendance && (
              <div className="rounded-xl border p-4 space-y-3">
                <p className="text-sm">
                  Select unmarked workers below and save their attendance together. Bulk saves leave
                  wages unpaid and night shifts off; use individual rows for exceptions.
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    className={input}
                    disabled={bulkBusy || !eligible.length}
                    onClick={() => setSelected(new Set(eligible.map(workerId)))}
                  >
                    Select loaded unmarked workers
                  </button>
                  <button
                    className={input}
                    disabled={bulkBusy}
                    onClick={() => setSelected(new Set())}
                  >
                    Clear selection
                  </button>
                  <select
                    aria-label="Attendance for selected workers"
                    className={input}
                    value={bulkStatus}
                    disabled={bulkBusy}
                    onChange={(event) => setBulkStatus(event.target.value)}
                  >
                    {["Present", "Half Day", "Absent"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <button
                    className={button}
                    disabled={
                      bulkBusy || !eligible.some((worker) => selected.has(workerId(worker)))
                    }
                    onClick={saveSelectedAttendance}
                  >
                    {bulkBusy
                      ? "Saving attendance..."
                      : `Save selected (${eligible.filter((worker) => selected.has(workerId(worker))).length})`}
                  </button>
                </div>
                {!!bulkErrors.length && (
                  <ul role="alert" className="text-red-600 text-sm list-disc pl-5">
                    {bulkErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="attendance-records-heading">
              <h2 className="font-semibold">
                {admin ? "Worker Allocation & Attendance Records" : "Daily Attendance & Payment"}
              </h2>
              <button
                className="attendance-export"
                disabled={!siteWorkers.length}
                onClick={() =>
                  exportToExcel(
                    siteWorkers.map((worker) => ({
                      Name: worker.name,
                      Date: day,
                      Attendance: worker.attendanceRecorded ? worker.status : "Not marked",
                      Payment: worker.paymentStatus,
                      Wage: worker.dailyWage,
                      Unpaid: worker.paymentStatus !== "Paid" ? worker.dailyWage : 0,
                    })),
                    `attendance-${projectId}-${day}`,
                  )
                }
              >
                <Download size={14} /> Export attendance
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="attendance-table w-full text-sm text-left">
                <thead className="bg-secondary">
                  <tr>
                    {[
                      "Select",
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
                      canRecordAttendance={canRecordAttendance}
                      projects={projects.data ?? []}
                      projectId={projectId}
                      day={day}
                      refresh={refresh}
                      openProfile={() => setProfile(worker)}
                      blocked={bulkBusy}
                      selected={selected.has(workerId(worker))}
                      onSelect={(checked) =>
                        setSelected((previous) => {
                          const next = new Set(previous);
                          if (checked) next.add(workerId(worker));
                          else next.delete(workerId(worker));
                          return next;
                        })
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {!workers.length && (
              <p className="p-6 text-muted-foreground">
                {admin
                  ? "No workers registered. Add workers from the Workers page to begin allocation."
                  : "No workers allocated to this project. Ask your admin to allocate workers."}
              </p>
            )}
          </details>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No individual worker records for this view. Gang attendance is managed above.
        </p>
      )}
      {projects.error && (
        <p role="alert" className="text-red-600">
          Unable to load project choices: {projects.error.message}
        </p>
      )}
      {admin && (
        <p className="text-sm text-muted-foreground">
          Register workers from the{" "}
          <Link to="/workers" className="text-primary underline">
            Workers page
          </Link>
          , then allocate them here.
        </p>
      )}
    </>
  );
}
function WorkerRow({
  worker,
  admin,
  canRecordAttendance,
  projects,
  projectId,
  day,
  refresh,
  openProfile,
  blocked,
  selected,
  onSelect,
}: {
  worker: DomainRecord;
  admin: boolean;
  canRecordAttendance: boolean;
  projects: { projectId: string; name: string }[];
  projectId: string;
  day: string;
  refresh: () => Promise<void>;
  openProfile: () => void;
  blocked: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [draft, setDraft] = useState<{
    status: string;
    paymentStatus: string;
    nightShift: boolean;
  } | null>(null);
  const allocation = target ?? String(worker.allocatedProjectId ?? projectId);
  const allocationUnchanged =
    !!worker.allocationConfirmed && allocation === worker.allocatedProjectId;
  const status = draft?.status ?? String(worker.status ?? "Absent");
  const payment = draft?.paymentStatus ?? String(worker.paymentStatus ?? "Not paid");
  const nightShift = draft?.nightShift ?? Boolean(worker.nightShift);
  const enabled = canRecordAttendance && !!worker.allocationConfirmed && !blocked;
  const save = useMutation({
    mutationFn: (operation: "allocate" | "attendance") => {
      if (operation === "attendance" && !canRecordAttendance)
        throw new Error("Only supervisors can record attendance.");
      return api.post("/supervisor/labour/attendance", {
        projectId,
        date: day,
        labourAttendanceId: worker.labourAttendanceId,
        operation,
        ...(operation === "allocate"
          ? { targetProjectId: allocation, expectedVersion: worker.allocationVersion ?? 0 }
          : {
              status,
              paymentStatus: payment,
              nightShift,
              expectedVersion: worker.attendanceVersion ?? 0,
              correctionReason: correctionReason.trim(),
            }),
      });
    },
    onSuccess: async (_, operation) => {
      setDraft(null);
      setTarget(null);
      setCorrectionReason("");
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
      <td className="p-4">
        {canRecordAttendance && (
          <input
            type="checkbox"
            aria-label={`Select attendance for ${worker.name}`}
            checked={selected}
            disabled={!enabled || !!worker.attendanceRecorded || save.isPending}
            onChange={(event) => onSelect(event.target.checked)}
          />
        )}
      </td>
      <td className="p-4 font-semibold">
        <button className="text-primary underline underline-offset-4" onClick={openProfile}>
          {String(worker.name)}
        </button>
      </td>
      <td className="p-4 whitespace-nowrap">{money(Number(worker.rate))}</td>
      <td className="p-4">
        <div className="flex gap-2 items-center">
          {admin ? (
            <>
              <select
                aria-label={`Project for ${worker.name}`}
                className={input}
                value={allocation}
                disabled={blocked || save.isPending || !!worker.allocationStarted}
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
              {allocationUnchanged ? (
                <span role="status" className="text-sm font-semibold text-primary">
                  Assigned
                </span>
              ) : (
                <button
                  className={button}
                  disabled={blocked || save.isPending || !!worker.allocationStarted}
                  onClick={() => save.mutate("allocate")}
                >
                  {save.isPending
                    ? "Assigning..."
                    : worker.allocationConfirmed
                      ? "Reassign"
                      : "Assign"}
                </button>
              )}
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
        {canRecordAttendance ? (
          <>
            <div className="inline-flex rounded-full border border-border p-1 gap-1">
              {["Present", "Half Day", "Absent"].map((value) => (
                <button
                  key={value}
                  aria-pressed={status === value}
                  disabled={!enabled || save.isPending}
                  onClick={() =>
                    setDraft({
                      status: value,
                      paymentStatus: value === "Absent" ? "Not paid" : payment,
                      nightShift: value === "Absent" ? false : nightShift,
                    })
                  }
                  className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40 ${status === value ? (value === "Present" ? "bg-emerald-600 text-white" : value === "Half Day" ? "bg-amber-600 text-white" : "bg-slate-600 text-white") : "text-muted-foreground"}`}
                >
                  {value}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <input
                type="checkbox"
                checked={nightShift}
                disabled={!enabled || status === "Absent" || save.isPending}
                onChange={(event) =>
                  setDraft({ status, paymentStatus: payment, nightShift: event.target.checked })
                }
              />
              Night shift (2× wage)
            </label>
            {!worker.attendanceRecorded && (
              <p className="text-xs text-muted-foreground mt-1">Not saved yet</p>
            )}
          </>
        ) : (
          <span>
            {worker.attendanceRecorded ? String(worker.status) : "Not marked"}
            {worker.nightShift ? " · Night shift" : ""}
          </span>
        )}
      </td>
      <td className="p-4">
        {canRecordAttendance ? (
          <select
            aria-label={`Payment for ${worker.name}`}
            className={input}
            disabled={!enabled || status === "Absent" || save.isPending}
            value={payment}
            onChange={(event) =>
              setDraft({ status, paymentStatus: event.target.value, nightShift })
            }
          >
            <option>Not paid</option>
            <option>Paid</option>
          </select>
        ) : (
          <span>{String(worker.paymentStatus ?? "Not paid")}</span>
        )}
      </td>
      <td className="p-4 whitespace-nowrap font-semibold">
        {money(
          !canRecordAttendance
            ? worker.paymentStatus === "Paid"
              ? 0
              : Number(worker.dailyWage ?? 0)
            : enabled && payment !== "Paid"
              ? Number(worker.rate) *
                (status === "Half Day" ? 0.5 : status === "Present" ? 1 : 0) *
                (nightShift && status !== "Absent" ? 2 : 1)
              : 0,
        )}
      </td>
      <td className="p-4">
        {canRecordAttendance && (
          <>
            {worker.paymentStatus === "Paid" && (
              <label className="grid gap-1 text-xs mb-2">
                Reason for changing a paid wage
                <input
                  className={input}
                  value={correctionReason}
                  maxLength={500}
                  disabled={save.isPending}
                  onChange={(event) => setCorrectionReason(event.target.value)}
                />
              </label>
            )}
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
          </>
        )}
      </td>
    </tr>
  );
}
