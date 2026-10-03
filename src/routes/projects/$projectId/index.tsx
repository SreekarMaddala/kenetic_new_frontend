import { allocationEnd, nextDate, validDate } from "../../../lib/projectForm";
import { projectApi } from "../../../lib/api";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { Compass, User, ShieldCheck, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProject } from "../../../lib/ProjectContext";
import { financeApi, siteControlApi, employeeApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectDetailsPage,
});

interface TimelineItem {
  name: string;
  phase: string;
  start: string;
  end: string;
  untilProjectEnd?: boolean;
  status: string;
}

function ProjectDetailsPage() {
  const { projectId } = Route.useParams();
  const { project: rawProject } = useProject();
  const queryClient = useQueryClient();

  const selectedProject = React.useMemo(() => {
    if (!rawProject) return undefined;
    const item = rawProject as unknown as Record<string, unknown>;
    const supervisorName = (item.supervisor as string) || "";
    return {
      id: rawProject.projectId,
      name: rawProject.name,
      location: rawProject.location,
      phase: (item.phase as string) || "Construction",
      progress:
        (item.progress as number) ||
        (rawProject.budget && rawProject.spent
          ? Math.min(Math.round((rawProject.spent / rawProject.budget) * 100), 100)
          : 0),
      status: rawProject.status || "On Track",
      budget:
        typeof rawProject.budget === "number"
          ? `₹${(rawProject.budget / 10_000_000).toFixed(2)} Cr`
          : rawProject.budget || "₹0.00 Cr",
      spent:
        typeof rawProject.spent === "number"
          ? `₹${(rawProject.spent / 10_000_000).toFixed(2)} Cr`
          : rawProject.spent || "₹0.00 Cr",
      deadline: rawProject.endDate || "Dec 2026",
      image:
        (item.image as string) ||
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80",
      supervisor: supervisorName,
      supervisorsTimeline: (item.supervisorsTimeline as TimelineItem[]) || [
        {
          name: supervisorName || "Site Supervisor",
          phase: "General Construction",
          start: "Jul 2026",
          end: rawProject.endDate || "Dec 2026",
          status: "Active",
        },
      ],
      todaysLabour: (item.todaysLabour as number) || 0,
      openIssues: (item.openIssues as number) || 0,
    };
  }, [rawProject]);

  // Detail Page active Tab
  const [detailTab, setDetailTab] = React.useState<"media" | "supervisors">("media");

  const { data: rawExpenses = [] } = useQuery({
    queryKey: ["expenses", projectId],
    queryFn: () => financeApi.listExpenses(projectId!),
    enabled: !!projectId,
    retry: 1,
  });

  const { data: rawIssues = [] } = useQuery({
    queryKey: ["issues", projectId],
    queryFn: () => siteControlApi.listIssues(projectId!),
    enabled: !!projectId,
    retry: 1,
  });

  const { data: rawInspections = [] } = useQuery({
    queryKey: ["inspections", projectId],
    queryFn: () => siteControlApi.listInspections(projectId!),
    enabled: !!projectId,
    retry: 1,
  });

  const { data: rawEmployees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.list(),
    retry: 1,
  });

  const supervisorList = React.useMemo(() => {
    return rawEmployees.filter((e) => e.role === "supervisor" || e.role === "operations_admin");
  }, [rawEmployees]);

  const expenses = rawExpenses.map((e) => ({
    id: e.expenseId,
    project: selectedProject?.name || "Unknown Project",
    date: e.date || new Date().toISOString().split("T")[0],
    category: e.category,
    amount: e.amount,
    desc: e.description,
    paidBy: e.submittedBy || "Site Engineer",
  }));

  const todaysExpenseTotal = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayExpenses = expenses.filter((e) => e.date === todayStr);
    if (todayExpenses.length > 0) {
      return todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    }
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const openIssuesCount = React.useMemo(() => {
    if (Array.isArray(rawIssues) && rawIssues.length > 0) {
      return rawIssues.filter((i: any) => i.status !== "Closed" && i.status !== "Resolved").length;
    }
    return selectedProject?.openIssues ?? 0;
  }, [rawIssues, selectedProject?.openIssues]);

  const progressPhotos = React.useMemo(() => {
    if (Array.isArray(rawInspections) && rawInspections.length > 0) {
      return rawInspections.map((insp: any, idx: number) => ({
        title: insp.title || insp.name || `Site Inspection #${idx + 1}`,
        date: insp.createdAt ? new Date(insp.createdAt).toLocaleString("en-IN") : "Recent",
        gps: insp.gps || insp.location || "Geofenced Site",
        uploader: insp.inspector || insp.supervisor || selectedProject?.supervisor || "Site Team",
        img:
          insp.image ||
          insp.photo ||
          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80",
        tag: insp.category || "Field Progress",
      }));
    }
    return [];
  }, [rawInspections, selectedProject?.supervisor]);

  // In-Detail Timeline Allocation State
  const [detailTimelineName, setDetailTimelineName] = React.useState("");
  const [detailTimelinePhase, setDetailTimelinePhase] = React.useState("");
  const [detailTimelineStart, setDetailTimelineStart] = React.useState("");
  const [detailTimelineEnd, setDetailTimelineEnd] = React.useState("");
  const [untilProjectEnd, setUntilProjectEnd] = React.useState(false);
  const [savingAllocation, setSavingAllocation] = React.useState(false);
  const [detailTimelineStatus, setDetailTimelineStatus] = React.useState("Active");

  // Media Date Filter State
  const [mediaStartDate, setMediaStartDate] = React.useState("");
  const [mediaEndDate, setMediaEndDate] = React.useState("");

  const [localTimeline, setLocalTimeline] = React.useState<TimelineItem[]>([]);

  React.useEffect(() => {
    if (selectedProject?.supervisorsTimeline) {
      setLocalTimeline(selectedProject.supervisorsTimeline);
    }
  }, [selectedProject?.supervisorsTimeline]);

  const handleAddTimelineItemToProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingAllocation) return;
    if (!detailTimelineName || !detailTimelinePhase.trim() || !detailTimelineStart) {
      toast.error("Please fill in phase, start period, and end period.");
      return;
    }
    let end;
    try {
      end = allocationEnd(
        detailTimelineStart,
        detailTimelineEnd,
        untilProjectEnd,
        rawProject?.endDate || "",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check allocation dates.");
      return;
    }
    const newItem = {
      name: detailTimelineName,
      phase: detailTimelinePhase,
      start: detailTimelineStart,
      end,
      untilProjectEnd,
      status: detailTimelineStatus,
    };

    const selectedSuper = supervisorList.find(
      (s) =>
        s.name === detailTimelineName ||
        s.email === detailTimelineName ||
        s.employeeId === detailTimelineName ||
        (s as any).id === detailTimelineName,
    );

    const existingSupervisorIds = (selectedProject as any)?.supervisorIds || [];
    const updatedSupervisorIds = Array.isArray(existingSupervisorIds)
      ? [...existingSupervisorIds]
      : [];

    const targetId =
      (selectedSuper as any)?.id ||
      (selectedSuper as any)?.sub ||
      selectedSuper?.employeeId ||
      selectedSuper?.email;
    if (targetId && !updatedSupervisorIds.includes(targetId)) {
      updatedSupervisorIds.push(targetId);
    }
    if (selectedSuper?.employeeId && !updatedSupervisorIds.includes(selectedSuper.employeeId)) {
      updatedSupervisorIds.push(selectedSuper.employeeId);
    }
    if (selectedSuper?.email && !updatedSupervisorIds.includes(selectedSuper.email)) {
      updatedSupervisorIds.push(selectedSuper.email);
    }

    setSavingAllocation(true);
    try {
      await projectApi.update(projectId!, {
        supervisorsTimeline: [...localTimeline, newItem],
        supervisorIds: updatedSupervisorIds,
      } as Parameters<typeof projectApi.update>[1]);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save allocation");
      return;
    } finally {
      setSavingAllocation(false);
    }
    setLocalTimeline([...localTimeline, newItem]);
    setDetailTimelinePhase("");
    setDetailTimelineStart("");
    setDetailTimelineEnd("");
    setUntilProjectEnd(false);
    toast.success(`Allocated ${detailTimelineName} to ${detailTimelinePhase} phase successfully!`);
  };

  if (!selectedProject) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      {/* Project Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden h-64 border border-border shadow-sm flex items-end p-6 shrink-0">
        <img
          src={
            selectedProject.image ||
            "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80"
          }
          alt={selectedProject.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end w-full gap-4 text-white">
          <div>
            <p className="text-xs font-mono text-zinc-300 uppercase tracking-widest">
              {selectedProject.location}
            </p>
            <h1 className="text-3xl font-display font-semibold tracking-tight mt-1">
              {selectedProject.name}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded text-white font-medium">
                Phase: {selectedProject.phase}
              </span>
              <StatusChip status={selectedProject.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 lg:gap-6 text-xs text-zinc-200 bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-white/10 font-mono items-center">
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                Total Budget
              </span>
              <strong className="text-white text-lg block font-semibold mt-0.5">
                {selectedProject.budget}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                Overall Spent
              </span>
              <strong className="text-white text-lg block font-semibold mt-0.5">
                {selectedProject.spent}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                Target Deadline
              </span>
              <strong className="text-white text-lg block font-semibold mt-0.5">
                {selectedProject.deadline}
              </strong>
            </div>
            {selectedProject.supervisor && (
              <div className="border-l border-white/15 pl-4 lg:pl-6 flex flex-col justify-center">
                <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                  Supervisor
                </span>
                <strong className="text-white block font-sans text-xs font-semibold mt-1">
                  {selectedProject.supervisor}
                </strong>
              </div>
            )}
            <div className="border-l border-white/15 pl-4 lg:pl-6 flex flex-col justify-center">
              <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                Today's Exp
              </span>
              <strong className="text-white text-base block font-semibold mt-0.5">
                ₹{todaysExpenseTotal.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="border-l border-white/15 pl-4 lg:pl-6 flex flex-col justify-center">
              <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                Open Issues
              </span>
              <strong
                className={`text-base block font-semibold mt-0.5 ${openIssuesCount > 0 ? "text-red-400" : "text-white"}`}
              >
                {openIssuesCount}
              </strong>
            </div>
            <div className="border-l border-white/15 pl-4 lg:pl-6 flex flex-col justify-center">
              <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">
                Weather
              </span>
              <strong className="text-white text-base block font-semibold mt-0.5">28°C 🌤️</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Details tab selection */}
      <div className="flex border-b border-border gap-2 overflow-x-auto">
        <button
          onClick={() => setDetailTab("media")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            detailTab === "media"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="size-4" /> Progress Photos & GPS Logs
        </button>
        <button
          onClick={() => setDetailTab("supervisors")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            detailTab === "supervisors"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="size-4" /> Site Team & Timelines
        </button>
      </div>

      {/* Site Media & Progress Photos */}
      {detailTab === "media" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-sm">Site Progress Gallery</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Geofenced field photos with GPS coordinates and supervisor timestamps.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-secondary/20 p-1 rounded-lg border border-border">
                <input
                  type="date"
                  value={mediaStartDate}
                  onChange={(e) => setMediaStartDate(e.target.value)}
                  className="p-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs font-medium text-muted-foreground px-1">to</span>
                <input
                  type="date"
                  value={mediaEndDate}
                  onChange={(e) => setMediaEndDate(e.target.value)}
                  className="p-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5 font-mono">
                <ShieldCheck className="size-3.5" /> GPS Verified
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {progressPhotos
              .filter((item) => {
                if (!mediaStartDate && !mediaEndDate) return true;

                const itemDate = new Date(item.date);
                let isValid = true;

                if (mediaStartDate) {
                  const start = new Date(mediaStartDate);
                  start.setHours(0, 0, 0, 0);
                  if (itemDate < start) isValid = false;
                }
                if (mediaEndDate) {
                  const end = new Date(mediaEndDate);
                  end.setHours(23, 59, 59, 999);
                  if (itemDate > end) isValid = false;
                }
                return isValid;
              })
              .map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-[color:var(--surface)] overflow-hidden shadow-sm flex flex-col group hover:border-primary/20 transition-all"
                >
                  <div className="relative h-44 w-full bg-secondary overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wide">
                      {item.tag}
                    </span>
                    <span className="absolute bottom-3 right-3 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded font-mono">
                      GPS VERIFIED
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-xs">
                    <div>
                      <h4 className="font-semibold text-sm leading-tight text-foreground truncate">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        GPS: {item.gps}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>By {item.uploader}</span>
                      <span className="font-mono">{item.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            {progressPhotos.length === 0 && (
              <div className="col-span-3 p-8 text-center bg-[color:var(--surface)] border border-border rounded-xl text-muted-foreground text-xs">
                No site progress inspection photos logged yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Site Team & Phased Timelines */}
      {detailTab === "supervisors" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Timeline chart visual */}
          <div className="lg:col-span-8 bg-[color:var(--surface)] border border-border rounded-xl p-6 space-y-6">
            <div>
              <h3 className="font-display font-semibold text-sm">
                Project Supervisor Lifecycle Timeline
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Phased supervisor timelines across core construction stages.
              </p>
            </div>

            <div className="space-y-4">
              {localTimeline && localTimeline.length > 0 ? (
                localTimeline.map((item, idx: number) => {
                  const isActive = item.status === "Active";
                  const isCompleted = item.status === "Completed";
                  const statusColor = isActive
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : isCompleted
                      ? "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                      : "bg-blue-500/10 text-blue-600 border border-blue-500/20";
                  const progressWidth = isActive
                    ? "w-full animate-pulse bg-emerald-500"
                    : isCompleted
                      ? "w-full bg-zinc-400"
                      : "w-full bg-blue-500";

                  return (
                    <div
                      key={idx}
                      className="bg-secondary/10 border border-border/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-full bg-primary/10 grid place-items-center text-primary font-mono text-xs font-semibold shrink-0">
                          {item.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-foreground truncate">
                            {item.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-mono">
                            {item.phase}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 max-w-md mx-auto w-full">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono mb-1">
                          <span>{item.start}</span>
                          <span>
                            {item.untilProjectEnd
                              ? `${rawProject?.endDate || item.end} (Project end)`
                              : item.end}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/20">
                          <div className={`h-full ${progressWidth}`} />
                        </div>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusColor}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-xl text-xs text-muted-foreground bg-secondary/15">
                  No custom phase timelines allocated to this project. Allocation defaults to the
                  main supervisor.
                </div>
              )}
            </div>
          </div>

          {/* Phased allocation builder form */}
          <div className="lg:col-span-4 bg-[color:var(--surface)] border border-border rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-display font-semibold text-sm">Allocate Phase Supervisor</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Assign site supervisors to specific dates and operational scopes.
              </p>
            </div>

            <form onSubmit={handleAddTimelineItemToProject} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">Select Supervisor</label>
                <select
                  value={detailTimelineName}
                  onChange={(e) => setDetailTimelineName(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground font-semibold"
                  required
                >
                  <option value="">Choose an existing supervisor...</option>
                  {supervisorList.map((s) => (
                    <option key={s.employeeId} value={s.name}>
                      {s.name} ({s.email}) {s.department ? `— ${s.department}` : ""}
                    </option>
                  ))}
                  <option value="Site Supervisor">Site Supervisor (Default)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">
                  Responsibility Phase / Scope
                </label>
                <input
                  type="text"
                  placeholder="e.g. Structure Pouring, Plastering"
                  value={detailTimelinePhase}
                  onChange={(e) => setDetailTimelinePhase(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Start Period</label>
                  <input
                    type="date"
                    max={validDate(rawProject?.endDate || "") ? rawProject?.endDate : undefined}
                    value={detailTimelineStart}
                    onChange={(e) => setDetailTimelineStart(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">End Period</label>
                  <input
                    type="date"
                    min={nextDate(detailTimelineStart) || undefined}
                    max={validDate(rawProject?.endDate || "") ? rawProject?.endDate : undefined}
                    disabled={untilProjectEnd}
                    value={
                      untilProjectEnd
                        ? validDate(rawProject?.endDate || "")
                          ? rawProject?.endDate
                          : ""
                        : detailTimelineEnd
                    }
                    onChange={(e) => setDetailTimelineEnd(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground font-mono disabled:opacity-50"
                    required={!untilProjectEnd}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  role="switch"
                  checked={untilProjectEnd}
                  onChange={(event) => setUntilProjectEnd(event.target.checked)}
                />
                Until project end
              </label>
              {untilProjectEnd && !validDate(rawProject?.endDate || "") && (
                <p role="alert" className="text-destructive">
                  Set a valid project deadline to use this option.
                </p>
              )}

              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">Allocation Status</label>
                <select
                  value={detailTimelineStatus}
                  onChange={(e) => setDetailTimelineStatus(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground"
                >
                  <option value="Active">Active (Currently on site)</option>
                  <option value="Upcoming">Upcoming (Scheduled)</option>
                  <option value="Completed">Completed (Past duty)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingAllocation}
                className="w-full py-2.5 bg-foreground text-background font-semibold rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 mt-2"
              >
                <Plus className="size-4" />{" "}
                {savingAllocation ? "Saving..." : "Save Phase Allocation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "Delayed"
      ? "bg-primary/10 text-primary"
      : status === "At Risk"
        ? "bg-yellow-500/10 text-yellow-700"
        : "bg-accent/10 text-accent";
  return (
    <span
      className={
        "shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded " + tone
      }
    >
      {status}
    </span>
  );
}
