import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type DomainRecord } from "../lib/api";
import { copiedTeam, previousDay, saveWorkerBatch, workerId } from "../lib/workerAttendance";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

const endpoint = "/supervisor/labour/attendance";
export function WorkerAllocationDialog({
  projectId,
  day,
  projects,
  onClose,
  refresh,
}: {
  projectId: string;
  day: string;
  projects: { projectId: string; name: string }[];
  onClose: () => void;
  refresh: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const roster = useQuery({
    queryKey: ["allocation-preview", projectId, day],
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const read = (date: string) =>
        api.get<DomainRecord[]>(
          `${endpoint}?projectId=${encodeURIComponent(projectId)}&date=${date}&roster=true`,
        );
      const [current, previous] = await Promise.all([read(day), read(previousDay(day))]);
      return { current, previous };
    },
  });
  const rows = roster.data?.current ?? [];
  async function confirm() {
    if (busy || !Object.keys(selection).length) return;
    setBusy(true);
    setFailures([]);
    setMessage("");
    try {
      const chosen = rows.filter(
        (worker) =>
          selection[workerId(worker)] && !worker.allocationStarted && !saved.has(workerId(worker)),
      );
      const result = await saveWorkerBatch(chosen, (worker) =>
        api.post(endpoint, {
          operation: "allocate",
          projectId,
          date: day,
          workerId: workerId(worker),
          targetProjectId: selection[workerId(worker)],
          expectedVersion: worker.allocationVersion ?? 0,
        }),
      );
      const completed = new Set(result.succeeded.map(workerId));
      setSaved((previous) => new Set([...previous, ...completed]));
      setSelection((previous) =>
        Object.fromEntries(Object.entries(previous).filter(([id]) => !completed.has(id))),
      );
      setMessage(
        `${result.succeeded.length} allocation(s) confirmed. ${result.failed.length} failed.`,
      );
      setFailures(result.failed.map((failure) => `${failure.item.name}: ${failure.message}`));
      await refresh();
      await roster.refetch();
    } catch (error) {
      setFailures([
        error instanceof Error
          ? error.message
          : "Unable to refresh allocations. Reload before retrying.",
      ]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-w-4xl max-h-[85vh] overflow-y-auto"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Allocate workers for {day}</DialogTitle>
          <DialogDescription>
            Copy yesterday's team, choose workers and adjust their projects, then confirm the
            selected allocations. Attendance and payments must be recorded separately.
          </DialogDescription>
        </DialogHeader>
        {roster.isLoading && <p>Loading workers and yesterday's allocations...</p>}
        {roster.error && (
          <p role="alert" className="text-red-600">
            {roster.error.message}{" "}
            <button className="underline" onClick={() => roster.refetch()}>
              Retry
            </button>
          </p>
        )}
        {roster.data && !roster.error && (
          <>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={busy}
                className="border rounded-lg px-3 py-2 text-sm"
                onClick={() => {
                  const ids = copiedTeam(roster.data.previous, rows, projectId, day).filter(
                    (id) => !saved.has(id),
                  );
                  setSelection(Object.fromEntries(ids.map((id) => [id, projectId])));
                  setMessage(
                    `${ids.length} workers from ${previousDay(day)} selected. Today's confirmed allocations were skipped. Review before confirming.`,
                  );
                }}
              >
                Copy yesterday's team
              </button>
              <button
                disabled={busy}
                className="border rounded-lg px-3 py-2 text-sm"
                onClick={() => setSelection({})}
              >
                Clear selection
              </button>
              <span className="text-sm self-center">{Object.keys(selection).length} selected</span>
            </div>
            {message && (
              <p role="status" className="text-sm">
                {message}
              </p>
            )}
            {!!failures.length && (
              <ul role="alert" className="text-sm text-red-600 list-disc pl-5">
                {failures.map((failure, index) => (
                  <li key={index}>{failure}</li>
                ))}
              </ul>
            )}
            <label className="grid gap-1 text-sm">
              Find a worker
              <input
                className="border rounded-lg p-2 bg-background"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name"
              />
            </label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr>
                    {["Select", "Worker", "Assign to project", "Status"].map((label) => (
                      <th key={label} className="p-2 border-b">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((worker) =>
                      String(worker.name).toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((worker) => {
                      const id = workerId(worker);
                      const disabled = busy || !!worker.allocationStarted || saved.has(id);
                      return (
                        <tr key={id}>
                          <td className="p-2">
                            <input
                              type="checkbox"
                              aria-label={`Select ${worker.name}`}
                              disabled={disabled}
                              checked={!!selection[id]}
                              onChange={(event) =>
                                setSelection((previous) => {
                                  const next = { ...previous };
                                  if (event.target.checked) next[id] = projectId;
                                  else delete next[id];
                                  return next;
                                })
                              }
                            />
                          </td>
                          <td className="p-2">{String(worker.name)}</td>
                          <td className="p-2">
                            <select
                              className="border rounded-lg p-2 bg-background"
                              aria-label={`Project for ${worker.name}`}
                              value={selection[id] ?? projectId}
                              disabled={disabled || !selection[id]}
                              onChange={(event) =>
                                setSelection((previous) => ({
                                  ...previous,
                                  [id]: event.target.value,
                                }))
                              }
                            >
                              {projects.map((project) => (
                                <option key={project.projectId} value={project.projectId}>
                                  {project.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            {saved.has(id)
                              ? "Confirmed"
                              : worker.allocationStarted
                                ? "Attendance started - locked"
                                : worker.allocationDate === day
                                  ? `Assigned today: ${projects.find((project) => project.projectId === worker.allocatedProjectId)?.name ?? worker.allocatedProjectId}`
                                  : "Not allocated for this date"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {!rows.length && <p>Register workers before allocating them.</p>}
            <div className="flex justify-end gap-3">
              <button className="border rounded-lg px-4 py-2" disabled={busy} onClick={onClose}>
                Close
              </button>
              <button
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 disabled:opacity-40"
                disabled={busy || !Object.keys(selection).length}
                onClick={confirm}
              >
                {busy ? "Confirming allocations..." : "Confirm selected allocations"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
