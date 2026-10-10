import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type DomainRecord } from "../lib/api";
import { copiedTeam, previousDay, saveWorkerBatch, workerId } from "../lib/workerAttendance";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  CalendarDays,
  Check,
  CheckCheck,
  Copy,
  Info,
  LoaderCircle,
  Search,
  UsersRound,
} from "lucide-react";
import { RecordIdentity } from "./RegistryTable";
import "../styles/worker-allocation.css";

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
  const visibleRows = rows.filter((worker) =>
    String(worker.name).toLowerCase().includes(search.trim().toLowerCase()),
  );
  const selectableRows = visibleRows.filter(
    (worker) => !worker.allocationStarted && !saved.has(workerId(worker)),
  );
  const selectedCount = Object.keys(selection).length;
  const allVisibleSelected =
    selectableRows.length > 0 && selectableRows.every((worker) => !!selection[workerId(worker)]);
  const someVisibleSelected = selectableRows.some((worker) => !!selection[workerId(worker)]);
  const displayDate = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00`));
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
        className="worker-allocation-dialog"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader className="allocation-header">
          <span className="allocation-eyebrow">
            <UsersRound size={14} /> WORKFORCE PLANNING
          </span>
          <div className="allocation-title-row">
            <DialogTitle>Allocate workers</DialogTitle>
            <span className="allocation-date">
              <CalendarDays size={14} />
              {displayDate}
            </span>
          </div>
          <DialogDescription>
            Build today's team. Select workers, assign their projects and confirm the allocation.
          </DialogDescription>
        </DialogHeader>
        <div className="allocation-body" aria-busy={busy || roster.isLoading}>
          {roster.isLoading && (
            <div role="status" className="allocation-empty">
              <LoaderCircle className="allocation-spin" size={24} />
              <strong>Loading your workforce</strong>
              <p>Fetching workers and yesterday's allocations.</p>
            </div>
          )}
          {roster.error && (
            <div role="alert" className="allocation-notice allocation-error">
              {roster.error.message}{" "}
              <button
                className="allocation-secondary"
                disabled={roster.isFetching}
                onClick={() => roster.refetch()}
              >
                {roster.isFetching ? "Retrying..." : "Try again"}
              </button>
            </div>
          )}
          {roster.data && !roster.error && (
            <>
              <div className="allocation-team-toolbar">
                <div className="allocation-team-actions">
                  <button
                    disabled={busy}
                    className="allocation-copy"
                    onClick={() => {
                      const ids = copiedTeam(roster.data.previous, rows, projectId, day).filter(
                        (id) => !saved.has(id),
                      );
                      setSelection(Object.fromEntries(ids.map((id) => [id, projectId])));
                      setMessage(
                        ids.length
                          ? `${ids.length} worker${ids.length === 1 ? "" : "s"} selected from yesterday's team. Today's confirmed allocations were skipped. Review before confirming.`
                          : "No available workers to copy from yesterday's team. Choose workers from the directory below.",
                      );
                    }}
                  >
                    <Copy size={15} />
                    Copy yesterday's team
                  </button>
                  <button
                    disabled={busy || !selectedCount}
                    className="allocation-clear"
                    onClick={() => setSelection({})}
                  >
                    Clear selection
                  </button>
                </div>
                <span className="allocation-selection-count" role="status" aria-live="polite">
                  <CheckCheck size={15} />
                  {selectedCount} selected
                </span>
              </div>
              {message && (
                <p role="status" className="allocation-notice">
                  {message}
                </p>
              )}
              {!!failures.length && (
                <ul role="alert" className="allocation-notice allocation-error">
                  {failures.map((failure, index) => (
                    <li key={index}>{failure}</li>
                  ))}
                </ul>
              )}
              <div className="allocation-directory-toolbar">
                <div>
                  <h3>
                    Worker directory <span>{rows.length}</span>
                  </h3>
                  <p>Select workers to assign a project.</p>
                </div>
                <label className="allocation-search">
                  <Search size={16} aria-hidden="true" />
                  <span className="sr-only">Find a worker</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name"
                  />
                </label>
              </div>
              <div className="allocation-table-wrap">
                <table className="allocation-table">
                  <thead>
                    <tr>
                      <th className="allocation-check-cell">
                        <input
                          type="checkbox"
                          aria-label="Select all available workers in search results"
                          checked={allVisibleSelected}
                          ref={(node) => {
                            if (node)
                              node.indeterminate = someVisibleSelected && !allVisibleSelected;
                          }}
                          disabled={busy || !selectableRows.length}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSelection((previous) => {
                              const next = { ...previous };
                              for (const worker of selectableRows) {
                                const id = workerId(worker);
                                if (checked) next[id] = projectId;
                                else delete next[id];
                              }
                              return next;
                            });
                          }}
                        />
                      </th>
                      {["Worker", "Assign to project", "Allocation status"].map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((worker) => {
                      const id = workerId(worker);
                      const disabled = busy || !!worker.allocationStarted || saved.has(id);
                      return (
                        <tr key={id} data-selected={!!selection[id]}>
                          <td className="allocation-check-cell">
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
                          <td>
                            <RecordIdentity name={String(worker.name)} />
                          </td>
                          <td>
                            <select
                              className="allocation-project-select"
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
                          <td>
                            <span
                              className={`allocation-status ${worker.allocationStarted ? "allocation-status-locked" : saved.has(id) || worker.allocationDate === day ? "allocation-status-assigned" : ""}`}
                            >
                              {saved.has(id)
                                ? "Confirmed"
                                : worker.allocationStarted
                                  ? "Attendance started - locked"
                                  : worker.allocationDate === day
                                    ? `Assigned today: ${projects.find((project) => project.projectId === worker.allocatedProjectId)?.name ?? worker.allocatedProjectId}`
                                    : "Not allocated"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!visibleRows.length && (
                <div className="allocation-empty">
                  <UsersRound size={24} />
                  <strong>{rows.length ? "No matching workers" : "Your workforce is empty"}</strong>
                  <p>
                    {rows.length
                      ? "Try another name or clear your search."
                      : "Register workers in the Workers section before allocating them."}
                  </p>
                  {rows.length > 0 && (
                    <button className="allocation-secondary" onClick={() => setSearch("")}>
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <footer className="allocation-footer">
          <p>
            <Info size={15} />
            <span>Attendance and payments are recorded separately.</span>
          </p>
          <div className="allocation-footer-actions">
            <button className="allocation-secondary" disabled={busy} onClick={onClose}>
              Close
            </button>
            <button
              className="allocation-confirm"
              disabled={busy || !selectedCount || !roster.data || !!roster.error}
              onClick={confirm}
            >
              {busy ? <LoaderCircle size={16} className="allocation-spin" /> : <Check size={16} />}
              {busy ? "Confirming..." : `Confirm allocation${selectedCount === 1 ? "" : "s"}`}
              {!busy && <span>{selectedCount}</span>}
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
