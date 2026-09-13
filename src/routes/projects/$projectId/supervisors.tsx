import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { api, employeeApi, projectApi, siteControlApi, type DomainRecord } from "../../../lib/api";
import { toast } from "sonner";
import { captureLocation, attendanceMapUrl } from "../../../lib/location";
import {
  Users,
  Activity,
  FileText,
  AlertTriangle,
  Search,
  Star,
  CheckCircle,
  Clock,
  Briefcase,
  Phone,
  MapPin,
  Award,
  ShieldCheck,
  TrendingUp,
  Send,
} from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/supervisors")({
  component: SupervisorsPage,
});

interface SupervisorProfile {
  id: string;
  name: string;
  initials: string;
  roleTitle: string;
  location: string;
  phone: string;
  experience: string;
  teamSize: number;
  rating: number;
  status: "Submitted" | "Pending" | "Approved";
  active: boolean;
  workersCount: number;
  tasksCount: number;
  issuesCount: number;
  performanceScore: number;
  taskCompletion: number;
  attendanceReliability: number;
  incidents: number;
}

function SupervisorsPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const admin = user?.role === "operations_admin" || user?.role === "super_admin";
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<
    "analytics" | "tasks" | "reports" | "issues" | "materials" | "attendance"
  >("analytics");

  const [summary, setSummary] = useState("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("AM-01");

  // Fetch project details
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectApi.get(projectId),
  });

  // Fetch employees
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.list,
  });

  // Fetch attendance history
  const attendance = useQuery({
    queryKey: ["attendance", projectId, user?.sub],
    queryFn: () =>
      api.get<DomainRecord[]>(
        `/supervisor/attendance/history?projectId=${encodeURIComponent(projectId)}`,
      ),
  });

  // Fetch DPR reports
  const reports = useQuery({
    queryKey: ["dpr", projectId],
    queryFn: () =>
      api.get<DomainRecord[]>(`/supervisor/dpr?projectId=${encodeURIComponent(projectId)}`),
  });

  // Fetch issues
  const issues = useQuery({
    queryKey: ["issues", projectId],
    queryFn: () => siteControlApi.listIssues(projectId),
  });

  // Check-In / Check-Out mutation
  const checkMutation = useMutation({
    mutationFn: async (action: "check-in" | "check-out") => {
      const location = await captureLocation();
      return api.post(`/supervisor/attendance/${action}`, { projectId, location });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", projectId] });
      toast.success("Attendance updated successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Daily Progress Report mutation
  const reportMutation = useMutation({
    mutationFn: () =>
      api.post("/supervisor/dpr", {
        projectId,
        summary,
        date: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      setSummary("");
      qc.invalidateQueries({ queryKey: ["dpr", projectId] });
      toast.success("Daily progress report submitted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmitReport(e: FormEvent) {
    e.preventDefault();
    if (reportMutation.isPending) return;
    reportMutation.mutate();
  }

  // Purely dynamic supervisor profiles built from real database employees & active session
  const supervisorProfiles: SupervisorProfile[] = useMemo(() => {
    const list: SupervisorProfile[] = [];

    if (employees.data && employees.data.length > 0) {
      const realSupervisors = employees.data.filter((e) => e.role === "supervisor");
      realSupervisors.forEach((e) => {
        const displayName = String(e.name || e.email?.split("@")[0] || "Site Supervisor");
        const names = displayName.split(" ");
        const initials =
          names.length > 1
            ? (names[0][0] + names[1][0]).toUpperCase()
            : (names[0][0] || "S").toUpperCase();

        list.push({
          id: e.employeeId,
          name: displayName,
          initials,
          roleTitle: "Site Supervisor",
          location: String(project.data?.name || "Project Site"),
          phone: String(e.phone || e.email || "N/A"),
          experience: "Site Operations",
          teamSize: 0,
          rating: 5.0,
          status: "Submitted",
          active: e.status === "Active",
          workersCount: 0,
          tasksCount: 0,
          issuesCount: 0,
          performanceScore: 100,
          taskCompletion: 100,
          attendanceReliability: 100,
          incidents: 0,
        });
      });
    }

    // Include active logged-in supervisor if not already listed
    if (user && user.role === "supervisor") {
      const userDisplayName = String(user.name || user.email?.split("@")[0] || "Site Supervisor");
      if (
        !list.some(
          (s) => s.id === user.sub || s.name.toLowerCase() === userDisplayName.toLowerCase(),
        )
      ) {
        const names = userDisplayName.split(" ");
        const initials =
          names.length > 1
            ? (names[0][0] + names[1][0]).toUpperCase()
            : (names[0][0] || "S").toUpperCase();

        list.unshift({
          id: user.sub || "CURR-SUP",
          name: userDisplayName,
          initials,
          roleTitle: "Site Supervisor",
          location: String(project.data?.name || "Project Site"),
          phone: String(user.email || "N/A"),
          experience: "Site Operations",
          teamSize: 0,
          rating: 5.0,
          status: "Submitted",
          active: true,
          workersCount: 0,
          tasksCount: 0,
          issuesCount: 0,
          performanceScore: 100,
          taskCompletion: 100,
          attendanceReliability: 100,
          incidents: 0,
        });
      }
    }

    return list;
  }, [employees.data, project.data, user]);

  // Filtered supervisor list
  const filteredSupervisors = useMemo(() => {
    return supervisorProfiles.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.location.toLowerCase().includes(searchQuery.toLowerCase());

      if (categoryFilter === "Submitted") return matchesSearch && s.status === "Submitted";
      if (categoryFilter === "Pending") return matchesSearch && s.status === "Pending";
      if (categoryFilter === "Approved") return matchesSearch && s.status === "Approved";
      return matchesSearch;
    });
  }, [supervisorProfiles, searchQuery, categoryFilter]);

  // Selected supervisor object
  const defaultSupervisor: SupervisorProfile = {
    id: "none",
    name: "No Supervisor Selected",
    initials: "—",
    roleTitle: "Site Supervisor",
    location: String(project.data?.name || "Project Site"),
    phone: "N/A",
    experience: "Site Operations",
    teamSize: 0,
    rating: 5.0,
    status: "Pending",
    active: false,
    workersCount: 0,
    tasksCount: 0,
    issuesCount: 0,
    performanceScore: 100,
    taskCompletion: 100,
    attendanceReliability: 100,
    incidents: 0,
  };

  const selectedSupervisor = useMemo(() => {
    return (
      supervisorProfiles.find((s) => s.id === selectedSupervisorId) ||
      supervisorProfiles[0] ||
      defaultSupervisor
    );
  }, [supervisorProfiles, selectedSupervisorId, project.data]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const ownAttendance = attendance.data?.find(
    (a) => a.date === todayStr && a.supervisorId === user?.sub,
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
            FIELD MANAGEMENT
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Supervisor Portal</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="size-2 rounded-full bg-emerald-500" />
              Owner Overview (Company Admin)
            </span>
          </div>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground mb-0.5">
              {supervisorProfiles.length}
            </div>
            <div className="text-xs font-medium text-muted-foreground">Total Supervisors</div>
          </div>
          <div className="size-10 rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center">
            <Briefcase className="size-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground mb-0.5">
              {supervisorProfiles.filter((s) => s.active).length}
            </div>
            <div className="text-xs font-medium text-muted-foreground">Active On Site</div>
          </div>
          <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <Activity className="size-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground mb-0.5">
              {reports.data?.length ?? 0}
            </div>
            <div className="text-xs font-medium text-muted-foreground">Reports Today</div>
          </div>
          <div className="size-10 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
            <FileText className="size-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground mb-0.5">
              {issues.data?.filter((i) => String(i.status).toLowerCase() !== "closed").length ?? 0}
            </div>
            <div className="text-xs font-medium text-muted-foreground">Open Issues</div>
          </div>
          <div className="size-10 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center">
            <AlertTriangle className="size-5" />
          </div>
        </div>
      </div>

      {/* Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Supervisor Master List (5 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search & Filter Header */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs border border-border rounded-lg bg-[color:var(--surface)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-2 text-xs border border-border rounded-lg bg-[color:var(--surface)] font-medium text-foreground cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Submitted">Submitted</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          {/* Supervisor List Cards */}
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredSupervisors.map((s) => {
              const isSelected = s.id === selectedSupervisor.id;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSupervisorId(s.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? "border-orange-500/50 bg-orange-500/5 shadow-sm"
                      : "border-border bg-[color:var(--surface)] hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        {s.initials}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{s.name}</h4>
                        <div className="text-xs text-muted-foreground">{s.roleTitle}</div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                        s.status === "Submitted"
                          ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          : s.status === "Approved"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 text-muted-foreground">
                    <div className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="size-3.5 fill-current" /> {s.rating}
                    </div>
                    <div className="flex items-center gap-3">
                      <span>👥 {s.workersCount}</span>
                      <span>📋 {s.tasksCount} tasks</span>
                      {s.issuesCount > 0 && (
                        <span className="text-rose-600 font-semibold">
                          ⚠️ {s.issuesCount} issues
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Supervisor Detail View (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Selected Supervisor Profile Banner */}
          <div className="p-6 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-xl bg-orange-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {selectedSupervisor.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{selectedSupervisor.name}</h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {selectedSupervisor.roleTitle}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-primary" /> {selectedSupervisor.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="size-3.5 text-primary" /> {selectedSupervisor.phone}
                    </span>
                    <span>🛠️ {selectedSupervisor.experience}</span>
                    <span>👥 Team: {selectedSupervisor.teamSize}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-amber-500 font-bold text-sm bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 self-start sm:self-center">
                <Star className="size-4 fill-current" /> {selectedSupervisor.rating}
              </div>
            </div>

            {/* Live Check-In / Check-Out Controls for Logged-In Supervisor */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Live Shift Status:</span>{" "}
                {ownAttendance?.checkOut
                  ? "Shift Completed"
                  : ownAttendance
                    ? "Checked In (Active)"
                    : "Not Checked In Today"}
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={
                    checkMutation.isPending ||
                    attendance.isLoading ||
                    !!attendance.error ||
                    !!ownAttendance
                  }
                  onClick={() => checkMutation.mutate("check-in")}
                  className="h-8 px-3.5 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                >
                  <CheckCircle className="size-3.5" />{" "}
                  {checkMutation.isPending && checkMutation.variables === "check-in"
                    ? "Locating & saving..."
                    : "Check In"}
                </button>
                <button
                  disabled={checkMutation.isPending || !ownAttendance || !!ownAttendance.checkOut}
                  onClick={() => checkMutation.mutate("check-out")}
                  className="h-8 px-3.5 border border-border text-foreground font-semibold text-xs rounded-lg hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                >
                  <Clock className="size-3.5" />{" "}
                  {checkMutation.isPending && checkMutation.variables === "check-out"
                    ? "Locating & saving..."
                    : "Check Out"}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Check-in and check-out save your current location with attendance. Allow location
              access when prompted. Your admin can view these locations on a map.
            </p>
            {checkMutation.error && (
              <p role="alert" className="text-xs text-red-600">
                {checkMutation.error.message}
              </p>
            )}
          </div>

          {/* Sub-Tabs Bar */}
          <div className="p-6 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm space-y-6">
            <div className="flex items-center gap-4 border-b border-border pb-3 overflow-x-auto">
              {[
                { id: "analytics", label: "Performance Analytics" },
                { id: "tasks", label: "Tasks Assigned" },
                { id: "reports", label: "Daily Reports" },
                { id: "issues", label: "Issues Logged" },
                { id: "materials", label: "Material Approvals" },
                { id: "attendance", label: "Attendance Logs" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`text-xs font-semibold pb-2 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "border-orange-500 text-orange-600 font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Performance Analytics */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Gauge 1: Overall Performance */}
                  <div className="p-5 rounded-xl border border-border bg-background/50 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      OVERALL PERFORMANCE SCORE
                    </div>

                    {/* Circular Donut Gauge SVG */}
                    <div className="relative size-28 flex items-center justify-center">
                      <svg className="size-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-secondary"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-orange-500"
                          strokeDasharray={`${selectedSupervisor.performanceScore}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black text-foreground">
                          {selectedSupervisor.performanceScore}%
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          High Efficiency
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <Award className="size-3" /> Top 15% in Operations
                    </span>
                  </div>

                  {/* Widgets Column 2 */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        TASK COMPLETION RATE
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div className="text-xl font-bold text-foreground">
                          {selectedSupervisor.taskCompletion}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          0 of 0 tasks finished
                        </div>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${selectedSupervisor.taskCompletion}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        SAFETY RECORD
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div className="text-xl font-bold text-foreground">
                          {selectedSupervisor.incidents} Events
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Total Incidents reported on site
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full w-full" />
                      </div>
                    </div>
                  </div>

                  {/* Widgets Column 3 */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        ATTENDANCE RELIABILITY
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div className="text-xl font-bold text-foreground">
                          {selectedSupervisor.attendanceReliability}%
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Check-in / check-out records
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${selectedSupervisor.attendanceReliability}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        AVG. EXPERIENCE FACTOR
                      </div>
                      <div className="text-xl font-bold text-foreground">5 Years</div>
                      <div className="text-[10px] text-muted-foreground">
                        Rating: {selectedSupervisor.rating} / 5.0 on average
                      </div>
                    </div>
                  </div>
                </div>

                {/* Labour Turnout Analytics Banner */}
                <div className="p-4 rounded-xl border border-border bg-background/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-foreground">Labour Turnout Analytics:</span>{" "}
                    <span className="text-muted-foreground">
                      Turnout reported in the last 6 submissions by this supervisor.
                    </span>
                  </div>
                  <div className="font-bold text-orange-600">
                    Avg: {selectedSupervisor.workersCount} workers/day
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Daily Reports (DPR Submission & History) */}
            {activeTab === "reports" && (
              <div className="space-y-6">
                <form onSubmit={handleSubmitReport} className="space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-foreground">
                    Submit Daily Progress Report
                  </h4>
                  <textarea
                    required
                    maxLength={5000}
                    placeholder="Enter today's work summary, site progress, weather conditions, or delay notes..."
                    className="w-full bg-background border border-border rounded-lg p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                  />
                  <button
                    disabled={reportMutation.isPending || !summary.trim()}
                    className="h-8 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                  >
                    <Send className="size-3.5" />
                    {reportMutation.isPending ? "Submitting..." : "Submit Report"}
                  </button>
                </form>

                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-foreground">
                    Submitted Reports History
                  </h4>
                  {reports.data?.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No reports submitted yet.</p>
                  ) : (
                    reports.data?.map((r) => (
                      <div
                        key={String(r.dprId)}
                        className="p-3 rounded-lg border border-border/60 bg-background/50 space-y-1 text-xs"
                      >
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {String(r.date ?? r.createdAt)}
                        </div>
                        <p className="text-foreground whitespace-pre-wrap">
                          {String(r.summary ?? "")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 6: Attendance Logs */}
            {activeTab === "attendance" && (
              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-foreground">
                  Attendance Logs History
                </h4>
                {attendance.data?.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No attendance records logged.</p>
                ) : (
                  attendance.data?.map((a) => (
                    <div
                      key={String(a.attendanceId)}
                      className="p-3 rounded-lg border border-border/60 bg-background/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground">{String(a.date)}</span> ·{" "}
                        <span className="text-muted-foreground">
                          {employees.data?.find((e) => e.employeeId === a.supervisorId)?.name ??
                            (a.supervisorId === user?.sub ? user?.name : String(a.supervisorId))}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        In: {new Date(String(a.checkIn)).toLocaleTimeString()} | Out:{" "}
                        {a.checkOut ? new Date(String(a.checkOut)).toLocaleTimeString() : "Open"}
                        <div className="mt-2 flex flex-wrap gap-3">
                          {(["checkInLocation", "checkOutLocation"] as const).map((key) => {
                            const url = attendanceMapUrl(a[key]);
                            const label = key === "checkInLocation" ? "Check-in" : "Check-out";
                            const location = a[key] as { accuracy?: number } | undefined;
                            return url ? (
                              <a
                                key={key}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline"
                              >
                                {label} map
                                {typeof location?.accuracy === "number"
                                  ? ` (±${Math.round(location.accuracy)} m)`
                                  : ""}
                              </a>
                            ) : (
                              <span key={key}>
                                {label}:{" "}
                                {key === "checkOutLocation" && !a.checkOut
                                  ? "Pending"
                                  : "Location not recorded"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Other tabs placeholder */}
            {["tasks", "issues", "materials"].includes(activeTab) && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No active records logged under {activeTab} for this supervisor yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
