import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { api, projectApi } from "../lib/api";
import { createAdvanceRequest } from "../lib/workerAdvance";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import "../styles/worker-advance.css";

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
export function WorkerAdvanceDialog({
  id,
  name,
  projectId,
  day,
  onClose,
}: {
  id: string;
  name: string;
  projectId?: string;
  day?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [project, setProject] = useState(projectId ?? "");
  const [date, setDate] = useState(day ?? new Date().toLocaleDateString("en-CA"));
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const request = useRef(createAdvanceRequest());
  const projects = useQuery({ queryKey: ["projects"], queryFn: projectApi.list });
  const profile = useQuery({
    queryKey: ["worker-profile", id, project, date.slice(0, 7)],
    enabled: !!project && /^\d{4}-\d{2}-\d{2}$/.test(date),
    queryFn: () =>
      api.get<{ recordedAdvances?: number; advancesLocked?: boolean }>(
        `/supervisor/labour/attendance/${encodeURIComponent(id)}?projectId=${encodeURIComponent(project)}&month=${date.slice(0, 7)}`,
      ),
  });
  const save = useMutation({
    mutationFn: () =>
      api.post(
        "/supervisor/labour/attendance",
        request.current({
          workerId: id,
          projectId: project,
          date,
          amount: Number(amount),
          description: reason,
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries();
      toast.success(`${money(Number(amount))} advance recorded for ${name}.`);
      onClose();
    },
  });
  const valid =
    !!project &&
    !!date &&
    !!reason.trim() &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent
        className="worker-advance-dialog"
        onEscapeKeyDown={(event) => {
          if (save.isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <span className="advance-icon">
            <HandCoins size={24} />
          </span>
          <DialogTitle>Record worker advance</DialogTitle>
          <DialogDescription>
            Record money given to {name} with a payment date and reason.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !save.isPending) save.mutate();
          }}
        >
          <fieldset disabled={save.isPending} className="advance-fields">
            <label>
              Project
              <select
                required
                value={project}
                onChange={(event) => setProject(event.target.value)}
                disabled={!!projectId}
              >
                <option value="">Choose a project</option>
                {projects.data?.map((item) => (
                  <option key={item.projectId} value={item.projectId}>
                    {item.name}
                  </option>
                ))}
                {projectId && !projects.data?.some((item) => item.projectId === projectId) && (
                  <option value={projectId}>Current project</option>
                )}
              </select>
            </label>
            <div className="advance-pair">
              <label>
                Amount (₹)
                <input
                  required
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 2,000"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              <label>
                Payment date
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
            </div>
            <label>
              Reason / reference
              <textarea
                required
                maxLength={4000}
                rows={2}
                placeholder="e.g. Personal advance paid by bank transfer"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          </fieldset>
          {profile.data && (
            <div className="advance-balance">
              <span>
                Outstanding advances this month
                <strong>{money(profile.data.recordedAdvances ?? 0)}</strong>
              </span>
            </div>
          )}
          <p className="advance-note">
            Record money already given to the worker. There is no advance amount limit.
            {profile.data?.advancesLocked
              ? " This month's payroll has already been generated. New advances are recorded separately and do not change that payroll."
              : " Outstanding advances are deducted when this project's payroll is generated for the selected month."}
          </p>
          {(projects.error || profile.error) && (
            <p role="alert" className="advance-error">
              {projects.error?.message ?? profile.error?.message}{" "}
              <button
                type="button"
                onClick={() => {
                  void projects.refetch();
                  void profile.refetch();
                }}
              >
                Retry
              </button>
            </p>
          )}
          {save.error && (
            <p role="alert" className="advance-error">
              {save.error.message}
            </p>
          )}
          <div className="advance-footer">
            <button type="button" disabled={save.isPending} onClick={onClose}>
              Cancel
            </button>
            <button className="advance-save" disabled={!valid || save.isPending}>
              {save.isPending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <HandCoins size={16} />
              )}
              {save.isPending ? "Recording…" : "Record advance"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
