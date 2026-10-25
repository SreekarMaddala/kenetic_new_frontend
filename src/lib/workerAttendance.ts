import type { DomainRecord } from "./api";

export const workerId = (worker: DomainRecord) =>
  String(worker.workerId ?? worker.labourAttendanceId);

export function previousDay(day: string): string {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function copiedTeam(
  previous: DomainRecord[],
  current: DomainRecord[],
  projectId: string,
  day: string,
): string[] {
  const yesterday = previousDay(day);
  const eligible = new Set(
    current
      .filter((worker) => worker.allocationDate !== day && !worker.allocationStarted)
      .map(workerId),
  );
  return previous
    .filter(
      (worker) =>
        worker.allocationDate === yesterday &&
        worker.allocatedProjectId === projectId &&
        eligible.has(workerId(worker)),
    )
    .map(workerId);
}

export async function saveWorkerBatch<T>(
  items: T[],
  save: (item: T) => Promise<unknown>,
  concurrency = 4,
) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
    throw new Error("Batch concurrency must be between one and four.");
  const succeeded: T[] = [];
  const failed: { item: T; message: string }[] = [];
  for (let index = 0; index < items.length; index += concurrency) {
    const group = items.slice(index, index + concurrency);
    const results = await Promise.allSettled(
      group.map((item) => Promise.resolve().then(() => save(item))),
    );
    results.forEach((result, offset) => {
      if (result.status === "fulfilled") succeeded.push(group[offset]);
      else
        failed.push({
          item: group[offset],
          message: result.reason instanceof Error ? result.reason.message : "Unable to save worker",
        });
    });
  }
  return { succeeded, failed };
}
