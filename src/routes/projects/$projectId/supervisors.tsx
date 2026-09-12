import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../../components/AppShell";
import { useAuth } from "../../../contexts/AuthContext";
import { api, employeeApi, projectApi, type DomainRecord } from "../../../lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$projectId/supervisors")({
  component: SupervisorsPage,
});
function SupervisorsPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const admin = user?.role === "operations_admin";
  const qc = useQueryClient();
  const [summary, setSummary] = useState("");
  const [assignments, setAssignments] = useState<string[] | null>(null);
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectApi.get(projectId),
  });
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.list,
    enabled: admin,
  });
  const attendance = useQuery({
    queryKey: ["attendance", projectId, user?.sub],
    queryFn: () =>
      api.get<DomainRecord[]>(
        `/supervisor/attendance/history?projectId=${encodeURIComponent(projectId)}`,
      ),
  });
  const reports = useQuery({
    queryKey: ["dpr", projectId],
    queryFn: () =>
      api.get<DomainRecord[]>(`/supervisor/dpr?projectId=${encodeURIComponent(projectId)}`),
  });
  const check = useMutation({
    mutationFn: (action: "check-in" | "check-out") =>
      api.post(`/supervisor/attendance/${action}`, { projectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", projectId] });
      toast.success("Attendance recorded.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const assign = useMutation({
    mutationFn: (supervisorIds: string[]) => projectApi.update(projectId, { supervisorIds }),
    onSuccess: () => {
      setAssignments(null);
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project assignments saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const report = useMutation({
    mutationFn: () =>
      api.post("/supervisor/dpr", {
        projectId,
        summary,
        date: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      setSummary("");
      qc.invalidateQueries({ queryKey: ["dpr", projectId] });
      toast.success("Progress report submitted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    report.mutate();
  }
  const selected = assignments ?? project.data?.supervisorIds ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const ownAttendance = attendance.data?.find(
    (a) => a.date === today && a.supervisorId === user?.sub,
  );
  if (project.error)
    return (
      <p role="alert" className="p-8 text-red-600">
        {project.error.message}
      </p>
    );
  if (project.isLoading) return <p className="p-8">Loading project…</p>;
  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
      <PageHeader title="Site Team & Attendance" eyebrow={project.data?.name} />
      {admin && (
        <section className="border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Assign supervisors</h2>
          <p className="text-sm text-muted-foreground">
            Assigned supervisors can access this project's field operations. Create supervisor
            accounts in User Accounts first.
          </p>
          {employees.error && (
            <p role="alert" className="text-red-600">
              {employees.error.message}
            </p>
          )}
          {employees.data
            ?.filter((e) => e.role === "supervisor")
            .map((e) => (
              <label key={e.employeeId} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(e.employeeId)}
                  disabled={
                    assign.isPending || (e.status !== "Active" && !selected.includes(e.employeeId))
                  }
                  onChange={(event) =>
                    setAssignments(
                      event.target.checked
                        ? [...selected, e.employeeId]
                        : selected.filter((id) => id !== e.employeeId),
                    )
                  }
                />
                {e.name} — {e.email} ({e.status})
              </label>
            ))}
          <button
            disabled={assign.isPending || assignments === null}
            onClick={() => assign.mutate(selected)}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 disabled:opacity-40"
          >
            Save assignments
          </button>
        </section>
      )}
      {!admin && (
        <section className="border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Today's attendance</h2>
          <p className="text-sm text-muted-foreground">
            {ownAttendance?.checkOut
              ? "Shift completed."
              : ownAttendance
                ? "You are checked in."
                : "You have not checked in today."}
          </p>
          <div className="flex gap-3">
            <button
              disabled={
                check.isPending || attendance.isLoading || !!attendance.error || !!ownAttendance
              }
              onClick={() => check.mutate("check-in")}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 disabled:opacity-40"
            >
              Check in
            </button>
            <button
              disabled={check.isPending || !ownAttendance || !!ownAttendance.checkOut}
              onClick={() => check.mutate("check-out")}
              className="border border-border rounded-lg px-4 py-2 disabled:opacity-40"
            >
              Check out
            </button>
          </div>
        </section>
      )}
      <section className="border border-border rounded-xl p-6 space-y-3">
        <h2 className="font-semibold">Attendance history</h2>
        {attendance.error && (
          <p role="alert" className="text-red-600">
            {attendance.error.message}
          </p>
        )}
        {attendance.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No attendance recorded.</p>
        )}
        {attendance.data?.map((a) => (
          <div key={String(a.attendanceId)} className="text-sm border-t border-border py-3">
            <p>
              {String(a.date)} ·{" "}
              {employees.data?.find((e) => e.employeeId === a.supervisorId)?.name ??
                (a.supervisorId === user?.sub ? user?.name : String(a.supervisorId))}
            </p>
            <p className="text-muted-foreground">
              In: {new Date(String(a.checkIn)).toLocaleString()} · Out:{" "}
              {a.checkOut ? new Date(String(a.checkOut)).toLocaleString() : "Open"}
            </p>
          </div>
        ))}
      </section>
      <form onSubmit={submit} className="border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Daily progress report</h2>
        <label className="block text-sm">
          Work completed
          <textarea
            required
            maxLength={5000}
            className="mt-2 w-full bg-background border border-border rounded-lg p-3"
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>
        <button
          disabled={report.isPending}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 disabled:opacity-40"
        >
          Submit report
        </button>
      </form>
      <section className="border border-border rounded-xl p-6 space-y-3">
        <h2 className="font-semibold">Progress reports</h2>
        {reports.error && (
          <p role="alert" className="text-red-600">
            {reports.error.message}
          </p>
        )}
        {reports.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No reports submitted.</p>
        )}
        {reports.data?.map((r) => (
          <article key={String(r.dprId)} className="border-t border-border py-3">
            <p className="text-xs text-muted-foreground">{String(r.date ?? r.createdAt)}</p>
            <p className="text-sm whitespace-pre-wrap">{String(r.summary ?? "")}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
