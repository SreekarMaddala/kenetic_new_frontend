import type { DomainRecord } from "./api";
import { workerId } from "./workerAttendance.ts";

export function gangSummaries(workers: DomainRecord[], projectId: string) {
  const groups = new Map<string, { id: string; name: string; members: DomainRecord[] }>();
  for (const worker of workers) {
    if (!worker.gangId) continue;
    const id = String(worker.gangId);
    if (!groups.has(id))
      groups.set(id, { id, name: String(worker.gangName ?? "Gang"), members: [] });
    groups.get(id)!.members.push(worker);
  }
  return [...groups.values()].map((group) => {
    const assigned = group.members.filter((member) => member.allocatedProjectId === projectId);
    const recorded = assigned.filter((member) => member.attendanceRecorded);
    const wages =
      recorded.reduce((sum, member) => sum + Math.round(Number(member.dailyWage ?? 0) * 100), 0) /
      100;
    const paid =
      recorded
        .filter((member) => member.paymentStatus === "Paid")
        .reduce((sum, member) => sum + Math.round(Number(member.dailyWage ?? 0) * 100), 0) / 100;
    return {
      ...group,
      assigned: assigned.length,
      recorded: recorded.length,
      wages,
      paid,
      unpaid: Math.round((wages - paid) * 100) / 100,
      present: recorded.filter((member) => member.status === "Present").length,
      halfDays: recorded.filter((member) => member.status === "Half Day").length,
      absent: recorded.filter((member) => member.status === "Absent").length,
    };
  });
}

export type GangAction = "allocate" | "attendance" | "pay";
export type GangOptions = {
  projectId: string;
  day: string;
  action: GangAction;
  status?: string;
  nightShift?: boolean;
  correctionReason?: string;
};

// Build the entire plan before posting any member, so missing allocations,
// unsaved attendance or a missing paid-wage correction reason cannot be skipped.
export function gangAttendancePlan(members: DomainRecord[], options: GangOptions) {
  if (
    !members.length ||
    !members[0].gangId ||
    members.some((member) => member.gangId !== members[0].gangId)
  ) {
    throw new Error("Choose members of one gang.");
  }
  const { projectId, day, action } = options;
  if (action === "attendance" && !["Present", "Half Day", "Absent"].includes(options.status ?? ""))
    throw new Error("Choose gang attendance first.");
  const reason = options.correctionReason?.trim() ?? "";
  if (reason.length > 500) throw new Error("Correction reason must be at most 500 characters.");
  const plan: { worker: DomainRecord; payload: DomainRecord }[] = [];
  for (const member of members) {
    const base = { projectId, date: day, workerId: workerId(member) };
    if (action === "allocate") {
      if (member.allocationConfirmed && member.allocatedProjectId === projectId) continue;
      if (member.allocationStarted)
        throw new Error(`${member.name}: attendance has started; this member cannot be moved.`);
      plan.push({
        worker: member,
        payload: {
          ...base,
          operation: "allocate",
          targetProjectId: projectId,
          expectedVersion: member.allocationVersion ?? 0,
        },
      });
      continue;
    }
    if (!member.allocationConfirmed || member.allocatedProjectId !== projectId)
      throw new Error(
        `${member.name}: the admin must confirm this date's project allocation first.`,
      );
    if (action === "pay" && !member.attendanceRecorded)
      throw new Error(`${member.name}: save attendance before paying gang wages.`);
    if (action === "pay" && (member.status === "Absent" || member.paymentStatus === "Paid"))
      continue;
    const status = action === "pay" ? String(member.status) : options.status!;
    const nightShift =
      status === "Absent" ? false : action === "pay" ? !!member.nightShift : !!options.nightShift;
    const paymentStatus =
      status === "Absent"
        ? "Not paid"
        : action === "pay"
          ? "Paid"
          : String(member.paymentStatus ?? "Not paid");
    if (
      member.paymentStatus === "Paid" &&
      (member.status !== status ||
        !!member.nightShift !== nightShift ||
        member.paymentStatus !== paymentStatus) &&
      !reason
    )
      throw new Error(`${member.name}: enter a correction reason before changing a paid wage.`);
    plan.push({
      worker: member,
      payload: {
        ...base,
        operation: "attendance",
        status,
        nightShift,
        paymentStatus,
        expectedVersion: member.attendanceVersion ?? 0,
        ...(reason ? { correctionReason: reason } : {}),
      },
    });
  }
  return plan;
}
