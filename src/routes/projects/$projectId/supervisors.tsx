import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { api, employeeApi, projectApi, type DomainRecord } from "../../../lib/api";
import { toast } from "sonner";
import { captureLocation, attendanceMapUrl } from "../../../lib/location";
import { Info, MapPin, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { attendanceCalendarDate, monthlyAttendanceRows } from "../../../lib/supervisorAttendance";

export const Route = createFileRoute("/projects/$projectId/supervisors")({
  component: SupervisorsPage,
});

function attendanceTime(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function attendanceDuration(record: DomainRecord) {
  if (!record.checkOut) return "In progress";
  const milliseconds =
    new Date(String(record.checkOut)).getTime() - new Date(String(record.checkIn)).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const minutes = Math.floor(milliseconds / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function AttendanceLocation({ value, pending = false }: { value: unknown; pending?: boolean }) {
  const url = attendanceMapUrl(value);
  if (!url)
    return (
      <span className="text-muted-foreground">{pending ? "Pending" : "Location not recorded"}</span>
    );
  const location = value as { accuracy?: number };
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline"
    >
      <MapPin className="size-3.5 shrink-0" />
      View map
      {typeof location.accuracy === "number" ? ` (±${Math.round(location.accuracy)} m)` : ""}
    </a>
  );
}

function SupervisorsPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const isSupervisor = user?.role === "supervisor";
  const currentEmployeeId = user?.employeeId || user?.sub || "";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [infoId, setInfoId] = useState("");
  const [month, setMonth] = useState(() => attendanceCalendarDate().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState("");

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectApi.get(projectId),
  });
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.list,
    enabled: !isSupervisor,
  });
  const attendance = useQuery({
    queryKey: ["attendance", projectId, currentEmployeeId],
    queryFn: () =>
      api.get<DomainRecord[]>(
        `/supervisor/attendance/history?projectId=${encodeURIComponent(projectId)}`,
      ),
  });
  const checkMutation = useMutation({
    mutationFn: async (action: "check-in" | "check-out") => {
      if (!isSupervisor) throw new Error("Only supervisors can check in or out.");
      const location = await captureLocation();
      return api.post(`/supervisor/attendance/${action}`, { projectId, location });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", projectId] });
      toast.success("Attendance updated successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profiles = new Map<string, { id: string; name: string }>();
  const assignedIds = new Set(project.data?.supervisorIds ?? []);
  if (isSupervisor && user) {
    profiles.set(currentEmployeeId, {
      id: currentEmployeeId,
      name: user.name || user.email || "My attendance",
    });
  } else {
    for (const employee of employees.data ?? []) {
      if (
        employee.role === "supervisor" &&
        (!project.data?.orgId || employee.orgId === project.data.orgId)
      ) {
        profiles.set(employee.employeeId, {
          id: employee.employeeId,
          name: employee.name || employee.email,
        });
      }
    }
    for (const record of attendance.data ?? []) {
      const id = String(record.supervisorId ?? "");
      if (!id || profiles.has(id)) continue;
      const employee = employees.data?.find((entry) => entry.employeeId === id);
      profiles.set(id, {
        id,
        name: employee?.name || (id === currentEmployeeId ? user?.name : undefined) || id,
      });
    }
  }
  const supervisors = Array.from(profiles.values()).filter((profile) =>
    profile.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = profiles.get(isSupervisor ? currentEmployeeId : selectedId);
  const infoProfile = profiles.get(infoId);
  const infoEmployee = employees.data?.find((employee) => employee.employeeId === infoId);
  const records = (attendance.data ?? [])
    .filter(
      (record) =>
        record.supervisorId === selected?.id && (!month || String(record.date).startsWith(month)),
    )
    .sort((a, b) => String(b.checkIn).localeCompare(String(a.checkIn)));
  const rows = monthlyAttendanceRows(records, month).filter(
    (row) => !selectedDate || row.date === selectedDate,
  );
  const today = attendanceCalendarDate();
  // The attendance API keys today's shift by its UTC date.
  const ownAttendance = attendance.data?.find(
    (record) =>
      record.date === new Date().toISOString().slice(0, 10) &&
      record.supervisorId === currentEmployeeId,
  );
  const loadingProfiles =
    project.isPending || (!isSupervisor && employees.isPending) || attendance.isPending;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isSupervisor ? "My Attendance" : "Supervisor Attendance"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Attendance reports and recorded check-in / check-out locations.
        </p>
      </div>

      {(project.isError || (!isSupervisor && employees.isError)) && (
        <p role="alert" className="text-sm text-destructive">
          Unable to load supervisor details.{" "}
          <button
            className="underline"
            onClick={() => {
              project.refetch();
              if (!isSupervisor) employees.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}

      {isSupervisor && (
        <section
          aria-label="Today's attendance"
          className="rounded-xl border border-border bg-[color:var(--surface)] p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium">
              {ownAttendance?.checkOut
                ? "Shift completed"
                : ownAttendance
                  ? "Checked in"
                  : "Not checked in today"}
            </p>
            <div className="flex gap-2">
              <button
                disabled={
                  checkMutation.isPending ||
                  attendance.isPending ||
                  attendance.isError ||
                  !!ownAttendance
                }
                onClick={() => checkMutation.mutate("check-in")}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                {checkMutation.isPending && checkMutation.variables === "check-in"
                  ? "Locating & saving..."
                  : "Check In"}
              </button>
              <button
                disabled={
                  checkMutation.isPending ||
                  attendance.isPending ||
                  attendance.isError ||
                  !ownAttendance ||
                  !!ownAttendance.checkOut
                }
                onClick={() => checkMutation.mutate("check-out")}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                {checkMutation.isPending && checkMutation.variables === "check-out"
                  ? "Locating & saving..."
                  : "Check Out"}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Check-in and check-out save your current location. Allow location access when prompted.
          </p>
          {checkMutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {checkMutation.error.message}
            </p>
          )}
        </section>
      )}

      <div className={isSupervisor ? "" : "grid grid-cols-1 lg:grid-cols-4 gap-6 items-start"}>
        {!isSupervisor && (
          <aside className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <input
                aria-label="Search supervisors"
                placeholder="Search supervisors..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-border bg-[color:var(--surface)] py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
            {loadingProfiles ? (
              <p className="text-sm text-muted-foreground">Loading supervisors...</p>
            ) : supervisors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {search ? "No supervisors match your search." : "No supervisor accounts found."}
              </p>
            ) : (
              supervisors.map((profile) => (
                <div
                  key={profile.id}
                  className={`flex items-center rounded-xl border p-4 transition-colors ${profile.id === selected?.id ? "border-primary bg-primary/5" : "border-border bg-[color:var(--surface)]"}`}
                >
                  <button
                    onClick={() => setSelectedId(profile.id)}
                    aria-pressed={profile.id === selected?.id}
                    className="min-w-0 flex-1 rounded-lg text-left hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span className="block font-semibold">{profile.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {assignedIds.has(profile.id)
                        ? "Assigned to this project"
                        : "Not assigned to this project"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInfoId(profile.id)}
                    aria-label={`View profile for ${profile.name}`}
                    className="ml-2 inline-flex items-center gap-1 rounded-lg border border-border px-2 py-2 text-xs font-medium hover:bg-secondary"
                  >
                    <Info className="size-4" />
                    Info
                  </button>
                </div>
              ))
            )}
          </aside>
        )}

        <section className="min-w-0 lg:col-span-3 rounded-xl border border-border bg-[color:var(--surface)] p-5 shadow-sm space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                {selected ? `${selected.name} — Attendance Report` : "Attendance Report"}
              </h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {project.data?.name || "Project site"}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="text-xs font-medium">
                Month
                <input
                  type="month"
                  value={month}
                  onChange={(event) => {
                    setMonth(event.target.value);
                    setSelectedDate("");
                  }}
                  className="mt-1 block rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                {month && (
                  <button
                    onClick={() => {
                      setMonth("");
                      setSelectedDate("");
                    }}
                    className="mt-1 text-primary underline"
                  >
                    Show all dates
                  </button>
                )}
              </label>
              <label className="text-xs font-medium">
                Date
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    const date = event.target.value;
                    setSelectedDate(date);
                    if (date) setMonth(date.slice(0, 7));
                  }}
                  className="mt-1 block rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate("")}
                    className="mt-1 text-primary underline"
                  >
                    Show full month
                  </button>
                )}
              </label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Check-in and check-out times are shown in IST.
          </p>
          {attendance.isPending ? (
            <p className="text-sm text-muted-foreground">Loading attendance...</p>
          ) : attendance.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Unable to load attendance.{" "}
              <button onClick={() => attendance.refetch()} className="underline">
                Retry
              </button>
            </p>
          ) : !selected ? (
            <p className="text-sm text-muted-foreground">
              Click a supervisor from the list to view date-wise attendance.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attendance records{month ? " for this month" : ""}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Date",
                      "Status",
                      "Check-in (IST)",
                      "Check-out (IST)",
                      "Duration",
                      "Check-in location",
                      "Check-out location",
                    ].map((label) => (
                      <th key={label} scope="col" className="p-3 font-medium whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ date, record }) => (
                    <tr key={date} className="border-b border-border last:border-0">
                      <td className="p-3 whitespace-nowrap font-medium">
                        {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
                          timeZone: "UTC",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {record
                          ? record.checkOut
                            ? "Present"
                            : "Checked in"
                          : date > today
                            ? "Upcoming"
                            : "Not marked"}
                      </td>
                      {record ? (
                        <>
                          <td className="p-3 whitespace-nowrap">
                            {attendanceTime(record.checkIn)}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {record.checkOut ? attendanceTime(record.checkOut) : "Open"}
                          </td>
                          <td className="p-3 whitespace-nowrap">{attendanceDuration(record)}</td>
                          <td className="p-3">
                            <AttendanceLocation value={record.checkInLocation} />
                          </td>
                          <td className="p-3">
                            <AttendanceLocation
                              value={record.checkOutLocation}
                              pending={!record.checkOut}
                            />
                          </td>
                        </>
                      ) : (
                        <td colSpan={5} className="p-3 text-muted-foreground">
                          {date > today
                            ? "Attendance date has not arrived."
                            : "No attendance recorded."}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {infoProfile && (
        <Dialog
          open={!!infoId}
          onOpenChange={(open) => {
            if (!open) setInfoId("");
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{infoProfile.name}</DialogTitle>
              <DialogDescription>Supervisor profile details</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {[
                ["Role", "Supervisor"],
                ["Email", infoEmployee?.email],
                ["Phone", infoEmployee?.phone],
                ["Department", infoEmployee?.department],
                ["Location", infoEmployee?.location],
                ["Account status", infoEmployee?.status],
                ["Project", project.data?.name],
                ["Project assignment", assignedIds.has(infoId) ? "Assigned" : "Not assigned"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words font-medium">{value || "Not provided"}</dd>
                </div>
              ))}
            </dl>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
