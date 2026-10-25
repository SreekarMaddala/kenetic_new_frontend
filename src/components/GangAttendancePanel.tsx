import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type DomainRecord } from "../lib/api";
import { gangAttendancePlan, gangSummaries, type GangAction } from "../lib/gangAttendance";
import { saveWorkerBatch } from "../lib/workerAttendance";
import { exportToExcel } from "../lib/excel";
import { ProjectGangOnboarding } from "./GangProjectOnboarding";

const input = "rounded-lg border border-border bg-background px-3 py-2 text-sm";
const button =
  "rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-40";
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
type Props = {
  projectId: string;
  day: string;
  admin: boolean;
  canRecordAttendance: boolean;
  blocked: boolean;
  setBusy: (busy: boolean) => void;
  refresh: () => Promise<void>;
};

export function GangAttendancePanel(props: Props) {
  const { projectId, day, admin, blocked } = props;
  // api.get follows all pages. A gang action must never use just the members
  // visible in the separately paginated individual attendance table.
  const query = useQuery({
    queryKey: ["gang-attendance", projectId, day, admin ? "allocation" : "attendance"],
    staleTime: 60000,
    queryFn: () =>
      api.get<DomainRecord[]>(
        `/supervisor/labour/attendance?projectId=${encodeURIComponent(projectId)}&date=${day}${admin ? "&roster=true" : ""}`,
      ),
  });
  const groups = gangSummaries(query.data ?? [], projectId);
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
      aria-label="Gang attendance and wages"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">Gang attendance &amp; daily wages</h2>
          <p className="text-sm text-muted-foreground">
            Apply attendance to all members together. Wages use each member's own daily rate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={input}
            disabled={blocked || query.isFetching}
            onClick={() => query.refetch()}
          >
            Refresh gangs
          </button>
          <button
            className={input}
            disabled={blocked || query.isFetching || query.isError || !groups.length}
            onClick={() =>
              exportToExcel(
                groups.map((group) => ({
                  Gang: group.name,
                  Date: day,
                  "Members at this project": group.assigned,
                  "Attendance recorded": group.recorded,
                  Present: group.present,
                  "Half day": group.halfDays,
                  Absent: group.absent,
                  "Total wages (INR)": group.wages,
                  "Paid (INR)": group.paid,
                  "Unpaid (INR)": group.unpaid,
                })),
                `gang-attendance-${projectId}-${day}`,
              )
            }
          >
            Export gang wages
          </button>
        </div>
      </div>
      {admin && <ProjectGangOnboarding projectId={projectId} day={day} blocked={blocked} refresh={props.refresh} />}
      {query.isPending ? (
        <p>Loading all gang members...</p>
      ) : query.isError ? (
        <p role="alert">
          Unable to load gang members: {query.error.message}{" "}
          <button
            className={input}
            disabled={blocked || query.isFetching}
            onClick={() => query.refetch()}
          >
            Retry gangs
          </button>
        </p>
      ) : groups.length ? (
        groups.map((group) => (
          <GangAttendanceCard
            key={group.id}
            {...props}
            group={group}
            blocked={blocked || query.isFetching || query.isError}
          />
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          {admin
            ? "No gang labourers yet. Use the form above to onboard them directly to this project."
            : "No gang members assigned to this project for this date. Ask your admin to allocate the gang."}
        </p>
      )}
    </section>
  );
}

export function GangAttendanceCard({
  group,
  ...props
}: Props & { group: ReturnType<typeof gangSummaries>[number] }) {
  const { projectId, day, admin, canRecordAttendance, blocked, setBusy, refresh } = props;
  const [status, setStatus] = useState("Present");
  const [nightShift, setNightShift] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setLocalBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const disabled = blocked || busy;
  const allConfirmed = group.members.every(
    (member) => member.allocationConfirmed && member.allocatedProjectId === projectId,
  );
  async function save(action: GangAction) {
    if (disabled || (action === "allocate" ? !admin : !canRecordAttendance)) return;
    setErrors([]);
    setMessage("");
    let plan;
    try {
      plan = gangAttendancePlan(group.members, {
        projectId,
        day,
        action,
        status,
        nightShift,
        correctionReason: reason,
      });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unable to prepare gang action."]);
      return;
    }
    if (!plan.length) {
      setMessage("All members are already up to date.");
      return;
    }
    setLocalBusy(true);
    setBusy(true);
    try {
      // Each member transaction updates shared monthly/spending totals. Save
      // sequentially to avoid this gang's own requests contending on those rows.
      const result = await saveWorkerBatch(
        plan,
        ({ payload }) => api.post("/supervisor/labour/attendance", payload),
        1,
      );
      const verb =
        action === "allocate" ? "allocated" : action === "pay" ? "marked paid" : "attendance saved";
      const summary = `${result.succeeded.length} of ${plan.length} members ${verb}.${result.failed.length ? ` ${result.failed.length} failed; review the names below before retrying.` : ""}`;
      setMessage(summary);
      setErrors(result.failed.map(({ item, message }) => `${item.worker.name}: ${message}`));
      if (result.succeeded.length && !result.failed.length)
        toast.success(`${group.name}: ${summary}`);
      await refresh();
    } catch (error) {
      setErrors((previous) => [
        ...previous,
        error instanceof Error
          ? error.message
          : "Unable to refresh the gang. Refresh before retrying.",
      ]);
    } finally {
      setLocalBusy(false);
      setBusy(false);
    }
  }
  return (
    <article
      className="rounded-xl border border-border p-4 space-y-4"
      aria-label={`Gang ${group.name}`}
    >
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="font-semibold">{group.name}</h3>
          <p className="text-sm text-muted-foreground">
            {group.assigned} at this project · {group.members.length} members in this view ·{" "}
            {group.recorded} attendance saved
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <span>
            Total wages <strong className="block">{money(group.wages)}</strong>
          </span>
          <span>
            Paid <strong className="block">{money(group.paid)}</strong>
          </span>
          <span>
            Unpaid <strong className="block">{money(group.unpaid)}</strong>
          </span>
        </div>
      </div>
      {admin && (
        <button
          className={button}
          disabled={disabled || allConfirmed}
          onClick={() => save("allocate")}
        >
          {allConfirmed
            ? "Gang allocation confirmed"
            : `Allocate all ${group.members.length} members here`}
        </button>
      )}
      {canRecordAttendance && (
        <>
          {!allConfirmed && (
            <p className="text-sm text-amber-700">
              Ask the admin to confirm every member's allocation for this date first.
            </p>
          )}
          <fieldset disabled={disabled || !allConfirmed} className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              Gang attendance
              <select
                className={input}
                aria-label={`Attendance for ${group.name}`}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  if (event.target.value === "Absent") setNightShift(false);
                }}
              >
                {["Present", "Half Day", "Absent"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm py-2">
              <input
                type="checkbox"
                checked={nightShift}
                disabled={status === "Absent"}
                onChange={(event) => setNightShift(event.target.checked)}
              />
              Night shift (2× wage)
            </label>
            <button className={button} onClick={() => save("attendance")}>
              Save gang attendance
            </button>
            <button
              className={button}
              disabled={group.recorded !== group.assigned || !group.unpaid}
              onClick={() => save("pay")}
            >
              Mark gang wages paid — {money(group.unpaid)}
            </button>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            Mark wages paid after paying the gang outside this app. Attendance changes preserve
            payments already recorded; paying uses each member's saved attendance.
          </p>
          {group.members.some((member) => member.paymentStatus === "Paid") && (
            <label className="grid gap-1 text-sm max-w-xl">
              Reason for changing already paid wages (only for corrections)
              <input
                className={input}
                value={reason}
                disabled={disabled}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
        </>
      )}
      {busy && <p role="status">Saving gang members...</p>}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {!!errors.length && (
        <ul role="alert" className="text-sm text-red-600 list-disc pl-5">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      <details>
        <summary className="cursor-pointer text-sm">Members and wage breakdown</summary>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left mt-3">
            <thead>
              <tr>
                {["Labourer", "Daily rate", "Attendance", "Wages today", "Payment"].map((label) => (
                  <th className="p-2" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.members.map((member) => (
                <tr key={String(member.workerId ?? member.labourAttendanceId)} className="border-t">
                  <td className="p-2">{String(member.name)}</td>
                  <td className="p-2">{money(Number(member.rate))}</td>
                  <td className="p-2">
                    {member.allocatedProjectId !== projectId
                      ? "Allocated elsewhere"
                      : member.attendanceRecorded
                        ? String(member.status)
                        : "Not marked"}
                    {member.nightShift ? " · Night shift" : ""}
                  </td>
                  <td className="p-2">{money(Number(member.dailyWage ?? 0))}</td>
                  <td className="p-2">{String(member.paymentStatus ?? "Not paid")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}
