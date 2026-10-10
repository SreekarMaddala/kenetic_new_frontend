import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, projectApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { WorkerAdvanceDialog } from "./WorkerAdvanceDialog";
import { WorkerAdvanceList, type WorkerAdvance } from "./WorkerAdvanceList";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

type Profile = {
  worker: { workerId: string; name: string; type?: string; rate: number };
  recordedAdvances?: number;
  advances?: WorkerAdvance[];
  advancesHasMore?: boolean;
  attendance: {
    date: string;
    status: string;
    nightShift?: boolean;
    wage: number;
    paymentStatus: string;
  }[];
  summary: {
    daysPresent: number;
    grossWages: number;
    dailyPaid: number;
    payrollPaid: number;
    deductions: number;
    outstanding: number;
    payrollStatus: string;
  } | null;
};
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

export function WorkerProfile({
  id,
  name,
  projectId: fixedProjectId,
  day,
  onClose,
}: {
  id: string;
  name: string;
  projectId?: string;
  day?: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const admin = user?.role === "operations_admin" || user?.role === "super_admin";
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [project, setProject] = useState(fixedProjectId ?? "");
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return (
      day?.slice(0, 7) ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
    );
  });
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: projectApi.list,
    enabled: !fixedProjectId,
  });
  const profile = useQuery({
    queryKey: ["worker-profile", id, project, month],
    enabled: /^\d{4}-(0[1-9]|1[0-2])$/.test(month),
    queryFn: () =>
      api.get<Profile>(
        `/supervisor/labour/attendance/${encodeURIComponent(id)}?month=${month}${project ? `&projectId=${encodeURIComponent(project)}` : ""}`,
      ),
  });
  const totals = profile.data?.summary;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{profile.data?.worker.name ?? name}</DialogTitle>
          <DialogDescription>
            Worker profile, attendance and wages for the selected project and month.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-4 items-end">
          {!fixedProjectId && (
            <label className="grid gap-1 text-sm">
              Project
              <select
                value={project}
                onChange={(event) => setProject(event.target.value)}
                className="border rounded-lg bg-background p-2"
              >
                <option value="">Choose a project</option>
                {projects.data?.map((item) => (
                  <option key={item.projectId} value={item.projectId}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-1 text-sm">
            Month
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="border rounded-lg bg-background p-2"
            />
          </label>
          {admin && (
            <button className="worker-advance-trigger" onClick={() => setAdvanceOpen(true)}>
              Record advance
            </button>
          )}
        </div>
        {projects.error && <p role="alert">Unable to load projects: {projects.error.message}</p>}
        {profile.isLoading && <p>Loading worker profile...</p>}
        {profile.error && (
          <p role="alert" className="text-red-600">
            {profile.error.message}{" "}
            <button className="underline" onClick={() => profile.refetch()}>
              Retry
            </button>
          </p>
        )}
        {profile.data && !profile.error && (
          <>
            <p className="text-sm">
              {profile.data.worker.type ?? "Worker"} · Daily rate {money(profile.data.worker.rate)}
            </p>
            <p className="text-xs text-muted-foreground break-all">
              Worker ID: {profile.data.worker.workerId}
            </p>
            {!project && <p>Select a project to view attendance and payments.</p>}
            {totals && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["Days worked", String(totals.daysPresent)],
                    ["Wages earned", money(totals.grossWages)],
                    ["Daily payments", money(totals.dailyPaid)],
                    ["Payroll payments", money(totals.payrollPaid)],
                    ["Deductions", money(totals.deductions)],
                    ["Outstanding", money(totals.outstanding)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-semibold mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm">Payroll: {totals.payrollStatus}</p>
                <WorkerAdvanceList
                  key={`${project}-${month}`}
                  workerId={id}
                  projectId={project}
                  advances={profile.data.advances ?? []}
                  total={profile.data.recordedAdvances ?? 0}
                  hasMore={profile.data.advancesHasMore}
                  admin={admin}
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr>
                        {["Date", "Attendance", "Night shift", "Wage", "Daily payment"].map(
                          (label) => (
                            <th key={label} className="p-2 border-b">
                              {label}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {profile.data.attendance.map((row) => (
                        <tr key={row.date}>
                          <td className="p-2">{row.date}</td>
                          <td className="p-2">{row.status}</td>
                          <td className="p-2">{row.nightShift ? "Yes" : "No"}</td>
                          <td className="p-2">{money(row.wage)}</td>
                          <td className="p-2">{row.paymentStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!profile.data.attendance.length && (
                  <p>No attendance recorded for this project and month.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Only saved attendance appears here. Missing dates are not counted as absences.
                </p>
              </>
            )}
          </>
        )}
      </DialogContent>
      {advanceOpen && (
        <WorkerAdvanceDialog
          id={id}
          name={name}
          projectId={project || undefined}
          day={
            day?.startsWith(month)
              ? day
              : new Date().toLocaleDateString("en-CA").startsWith(month)
                ? undefined
                : `${month}-01`
          }
          onClose={() => setAdvanceOpen(false)}
        />
      )}
    </Dialog>
  );
}
