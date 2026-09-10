import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { PageHeader } from "../../../components/AppShell";
import { toast } from "sonner";
import {
  HardHat,
  Phone,
  MapPin,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  ChevronRight,
  ArrowLeft,
  FileText,
  Users,
  Wrench,
  Package,
  Activity,
  Star,
  BarChart3,
  CalendarDays,
  MessageSquare,
  ShieldAlert,
  Truck,
  Check,
  X,
  Edit3,
  Send,
  Camera,
  FileDown,
  LogIn,
  LogOut,
} from "lucide-react";
import { exportToExcel } from "../../../lib/excel";

export const Route = createFileRoute("/projects/$projectId/supervisors")({
  head: () => ({
    meta: [
      { title: "Supervisors — Kinetic" },
      {
        name: "description",
        content:
          "Manage site supervisors — daily reports, task assignments, issue logs, material requests, and team oversight.",
      },
    ],
  }),
  component: SupervisorsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskStatus = "Pending" | "In Progress" | "Done" | "Blocked";
type IssuePriority = "Low" | "Medium" | "High" | "Critical";
type ReportStatus = "Submitted" | "Pending" | "Approved";

interface Supervisor {
  id: string;
  name: string;
  photo: string; // initials
  project: string;
  location: string;
  phone: string;
  experience: number; // years
  rating: number; // out of 5
  teamSize: number;
  status: "Active" | "On Leave" | "Offline";
  tasksOpen: number;
  issuesOpen: number;
  todayReport: ReportStatus;
  joinedDate: string;
  specialization: string;
}

interface Task {
  id: string;
  supId: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: TaskStatus;
  dueDate: string;
  assignedBy: string;
}

interface SiteReport {
  id: string;
  supId: string;
  date: string;
  labourPresent: number;
  labourAbsent: number;
  workDone: string;
  delaysReason: string;
  safetyIncidents: number;
  materialUsed: string;
  status: ReportStatus;
  remark: string;
}

interface SiteIssue {
  id: string;
  supId: string;
  date: string;
  category: "Safety" | "Material" | "Equipment" | "Labour" | "Design";
  description: string;
  priority: IssuePriority;
  resolved: boolean;
}

interface MaterialRequest {
  id: string;
  supId: string;
  date: string;
  item: string;
  quantity: string;
  urgency: "Normal" | "Urgent";
  status: "Pending" | "Approved" | "Dispatched" | "Delivered";
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const SUPERVISORS: Supervisor[] = [
  {
    id: "SV6",
    name: "Amit Mishra",
    photo: "AM",
    project: "Multiple Sites",
    location: "Gurugram, HR",
    phone: "+91 95000 11000",
    experience: 5,
    rating: 4.6,
    teamSize: 20,
    status: "Active",
    tasksOpen: 3,
    issuesOpen: 1,
    todayReport: "Submitted",
    joinedDate: "Apr 2024",
    specialization: "Structural Concrete",
  },
  {
    id: "SV1",
    name: "Vikram Rao",
    photo: "VR",
    project: "DLF Camellias",
    location: "Gurugram, HR",
    phone: "+91 98412 33101",
    experience: 12,
    rating: 4.8,
    teamSize: 38,
    status: "Active",
    tasksOpen: 4,
    issuesOpen: 2,
    todayReport: "Submitted",
    joinedDate: "Mar 2022",
    specialization: "Structural & Fit-out",
  },
  {
    id: "SV2",
    name: "Priya Menon",
    photo: "PM",
    project: "Prestige Lakeside",
    location: "Bengaluru, KA",
    phone: "+91 99001 78234",
    experience: 8,
    rating: 4.5,
    teamSize: 24,
    status: "Active",
    tasksOpen: 7,
    issuesOpen: 1,
    todayReport: "Pending",
    joinedDate: "Jun 2023",
    specialization: "MEP & Plumbing",
  },
  {
    id: "SV3",
    name: "Suresh Iyer",
    photo: "SI",
    project: "Lodha World Towers",
    location: "Mumbai, MH",
    phone: "+91 96321 44190",
    experience: 15,
    rating: 4.9,
    teamSize: 52,
    status: "Active",
    tasksOpen: 2,
    issuesOpen: 0,
    todayReport: "Approved",
    joinedDate: "Jan 2021",
    specialization: "High-Rise Construction",
  },
  {
    id: "SV4",
    name: "Deepa Kulkarni",
    photo: "DK",
    project: "Godrej Reflections",
    location: "Pune, MH",
    phone: "+91 90091 55432",
    experience: 6,
    rating: 4.2,
    teamSize: 18,
    status: "On Leave",
    tasksOpen: 3,
    issuesOpen: 4,
    todayReport: "Pending",
    joinedDate: "Sep 2023",
    specialization: "Foundation & Finishing",
  },
  {
    id: "SV5",
    name: "Arjun Sharma",
    photo: "AS",
    project: "Brigade Cornerstone",
    location: "Bengaluru, KA",
    phone: "+91 87654 12340",
    experience: 10,
    rating: 4.6,
    teamSize: 31,
    status: "Active",
    tasksOpen: 5,
    issuesOpen: 1,
    todayReport: "Submitted",
    joinedDate: "Feb 2022",
    specialization: "Excavation & Structure",
  },
];

const TASKS_DATA: Task[] = [
  { id: "T1", supId: "SV1", title: "Complete 4th floor slab shuttering", description: "Ensure all columns are aligned and shuttering is leak-proof before pour.", priority: "High", status: "In Progress", dueDate: "2026-07-12", assignedBy: "Vikas Kulkarni (PM)" },
  { id: "T2", supId: "SV1", title: "Inspect rebar spacing on tower B", description: "Cross-check bar spacing as per structural drawing Rev.3.", priority: "High", status: "Pending", dueDate: "2026-07-11", assignedBy: "Vikas Kulkarni (PM)" },
  { id: "T3", supId: "SV1", title: "Coordinate tile delivery with vendor", description: "Confirm 500 boxes of vitrified tiles delivery from Kajaria.", priority: "Medium", status: "Done", dueDate: "2026-07-10", assignedBy: "Rajesh Kumar (SE)" },
  { id: "T4", supId: "SV1", title: "Labour safety briefing — weekly", description: "Conduct PPE check and tool-box talk for all 38 workers.", priority: "Medium", status: "Done", dueDate: "2026-07-09", assignedBy: "HSE Team" },
  { id: "T5", supId: "SV2", title: "HVAC duct installation — Block A", description: "Supervise GI duct fitting on floors 2 to 5.", priority: "High", status: "In Progress", dueDate: "2026-07-13", assignedBy: "Vikas Kulkarni (PM)" },
  { id: "T6", supId: "SV2", title: "Submit progress photos to PM", description: "Upload 10+ photos per floor to project portal by 6 PM.", priority: "Low", status: "Pending", dueDate: "2026-07-11", assignedBy: "Vikas Kulkarni (PM)" },
  { id: "T7", supId: "SV3", title: "Concrete pour — Level 18 slab", description: "Coordinate pump placement, slump test, and cube samples.", priority: "Critical", status: "In Progress", dueDate: "2026-07-11", assignedBy: "Structural Consultant" },
  { id: "T8", supId: "SV3", title: "Check waterproofing at podium", description: "Verify membrane application quality and ponding test.", priority: "High", status: "Pending", dueDate: "2026-07-14", assignedBy: "Vikas Kulkarni (PM)" },
  { id: "T9", supId: "SV5", title: "Excavation reach to -4.5m level", description: "Monitor machine depth and soil disposal schedule.", priority: "High", status: "In Progress", dueDate: "2026-07-12", assignedBy: "Geotechnical Consultant" },
  { id: "T10", supId: "SV5", title: "Dewatering pump maintenance", description: "Service all three submersible pumps at excavation pit.", priority: "Medium", status: "Blocked", dueDate: "2026-07-10", assignedBy: "Site Engineer" },
];

const REPORTS_DATA: SiteReport[] = [
  { id: "R1", supId: "SV1", date: "2026-07-11", labourPresent: 35, labourAbsent: 3, workDone: "4th floor slab shuttering 70% complete. Rebar work ongoing at column C7-C12. Block B interior plastering completed.", delaysReason: "Minor delay due to late cement delivery (2 hrs)", safetyIncidents: 0, materialUsed: "42 bags cement, 1.2T TMT steel, 80 sqm shuttering ply", status: "Submitted", remark: "Progress satisfactory. Slab pour planned for tomorrow." },
  { id: "R2", supId: "SV1", date: "2026-07-10", labourPresent: 38, labourAbsent: 0, workDone: "Block B interior plastering 100%. Started column casting for 4th floor. Electrical conduit laid on 3rd floor.", delaysReason: "None", safetyIncidents: 0, materialUsed: "60 bags cement, 0.8T TMT steel, 200m conduit pipe", status: "Approved", remark: "Excellent progress today. Ahead of schedule by 0.5 days." },
  { id: "R3", supId: "SV2", date: "2026-07-11", labourPresent: 20, labourAbsent: 4, workDone: "HVAC duct work on floors 2–3. Plumbing rough-in completed on floor 1.", delaysReason: "4 workers absent — festival", safetyIncidents: 1, materialUsed: "8 GI ducts, 200m PVC pipe", status: "Submitted", remark: "One minor cut injury — treated on site, no hospitalization." },
  { id: "R4", supId: "SV3", date: "2026-07-11", labourPresent: 50, labourAbsent: 2, workDone: "Level 17 slab curing complete. Level 18 shuttering 90% done. Waterproofing at podium level 2 ongoing.", delaysReason: "None", safetyIncidents: 0, materialUsed: "120 bags cement, 3T TMT steel, 400L waterproofing compound", status: "Approved", remark: "Crew performance exceptional. Ready for Level 18 pour at 6 AM tomorrow." },
  { id: "R5", supId: "SV5", date: "2026-07-11", labourPresent: 28, labourAbsent: 3, workDone: "Excavation reached -3.8m. Dewatering ongoing. PCC layer started on north section.", delaysReason: "Hard rock layer encountered — drilling speed reduced", safetyIncidents: 0, materialUsed: "18 bags cement (PCC), 400L diesel", status: "Submitted", remark: "Expect 2-day delay due to rock strata. Consulting geotech." },
];

const ISSUES_DATA: SiteIssue[] = [
  { id: "I1", supId: "SV1", date: "2026-07-10", category: "Material", description: "Cement stock critically low — only 240 bags remaining vs. 500 bag reorder point. Pour cannot proceed without resupply.", priority: "Critical", resolved: false },
  { id: "I2", supId: "SV1", date: "2026-07-08", category: "Equipment", description: "Tower crane (TC-1) hook cable showing fraying — requires immediate inspection by certified engineer.", priority: "High", resolved: false },
  { id: "I3", supId: "SV1", date: "2026-07-07", category: "Design", description: "Structural drawing revision R3 contradicts R2 on column C7 spacing. Clarification needed from consultant.", priority: "Medium", resolved: true },
  { id: "I4", supId: "SV2", date: "2026-07-11", category: "Safety", description: "Edge protection railing missing on floor 4 north side. Risk of fall hazard.", priority: "High", resolved: false },
  { id: "I5", supId: "SV4", date: "2026-07-09", category: "Labour", description: "Sub-contractor crew (SK Builders) not reporting on time — 1-2 hour delays daily for 3 days.", priority: "Medium", resolved: false },
  { id: "I6", supId: "SV4", date: "2026-07-08", category: "Material", description: "Wrong grade of waterproofing membrane delivered. Coating quality test failed.", priority: "High", resolved: false },
  { id: "I7", supId: "SV4", date: "2026-07-06", category: "Equipment", description: "Concrete mixer motor seized. Backup arranged.", priority: "Medium", resolved: true },
  { id: "I8", supId: "SV5", date: "2026-07-11", category: "Equipment", description: "Dewatering pump #2 motor failure. Excess water in excavation pit slowing work.", priority: "High", resolved: false },
];

const MATERIAL_REQUESTS: MaterialRequest[] = [
  { id: "MR1", supId: "SV1", date: "2026-07-11", item: "OPC Cement 53 Grade", quantity: "500 bags", urgency: "Urgent", status: "Approved" },
  { id: "MR2", supId: "SV1", date: "2026-07-10", item: "TMT Steel 12mm", quantity: "2 Tons", urgency: "Normal", status: "Dispatched" },
  { id: "MR3", supId: "SV2", date: "2026-07-11", item: "GI Duct 200mm dia", quantity: "20 pieces", urgency: "Urgent", status: "Pending" },
  { id: "MR4", supId: "SV2", date: "2026-07-09", item: "PVC Conduit 25mm", quantity: "500m", urgency: "Normal", status: "Delivered" },
  { id: "MR5", supId: "SV3", date: "2026-07-11", item: "Waterproofing Compound", quantity: "800L", urgency: "Normal", status: "Approved" },
  { id: "MR6", supId: "SV5", date: "2026-07-11", item: "Diesel for Dewatering Pump", quantity: "500L", urgency: "Urgent", status: "Pending" },
  { id: "MR7", supId: "SV5", date: "2026-07-10", item: "PCC Grade M15 Cement", quantity: "50 bags", urgency: "Normal", status: "Delivered" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<IssuePriority, string> = {
  Low: "bg-gray-100 text-gray-600 border-gray-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
};

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  Pending: "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-50 text-blue-700",
  Done: "bg-emerald-50 text-emerald-700",
  Blocked: "bg-red-50 text-red-700",
};

const MAT_STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-blue-50 text-blue-700 border-blue-200",
  Dispatched: "bg-violet-50 text-violet-700 border-violet-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const REPORT_STATUS: Record<ReportStatus, { style: string; label: string }> = {
  Submitted: { style: "bg-blue-50 text-blue-700 border-blue-200", label: "Submitted" },
  Pending: { style: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending" },
  Approved: { style: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Approved" },
};

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`size-3 ${s <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
        />
      ))}
      <span className="text-xs font-medium ml-1 text-foreground">{value}</span>
    </div>
  );
}

// ── Supervisor Card ───────────────────────────────────────────────────────────

function SupervisorCard({
  sup,
  isSelected,
  onClick,
}: {
  sup: Supervisor;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColors = {
    Active: "bg-emerald-500",
    "On Leave": "bg-amber-400",
    Offline: "bg-gray-400",
  };

  return (
    <button
      id={`sup-card-${sup.id}`}
      onClick={onClick}
      className={`w-full text-left rounded-xl border transition-all duration-200 p-4 ${
        isSelected
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-border bg-[color:var(--surface)] hover:border-primary/20"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className="size-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
            style={{ background: "linear-gradient(135deg, hsl(22 90% 50%), hsl(22 90% 38%))" }}
          >
            {sup.photo}
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${statusColors[sup.status]}`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm">{sup.name}</p>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${REPORT_STATUS[sup.todayReport].style}`}>
              {sup.todayReport}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sup.project}</p>
          <StarRating value={sup.rating} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="size-3" /> {sup.teamSize}
          </span>
          <span className="flex items-center gap-1 text-blue-600">
            <ClipboardList className="size-3" /> {sup.tasksOpen} tasks
          </span>
          {sup.issuesOpen > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="size-3" /> {sup.issuesOpen} issues
            </span>
          )}
        </div>
        <ChevronRight className={`size-3.5 text-muted-foreground ${isSelected ? "text-primary" : ""}`} />
      </div>
    </button>
  );
}

// ── Detail Panel Tabs ─────────────────────────────────────────────────────────

type DetailTab = "analytics" | "overview" | "tasks" | "reports" | "issues" | "materials" | "attendance";

function SupervisorDetail({ sup, isSupervisor }: { sup: Supervisor; isSupervisor: boolean }) {
  const [tab, setTab] = React.useState<DetailTab>(isSupervisor ? "overview" : "analytics");
  const [tasks, setTasks] = React.useState(TASKS_DATA);
  const [issues, setIssues] = React.useState(ISSUES_DATA);
  const [requests, setRequests] = React.useState(MATERIAL_REQUESTS);
  const [reports, setReports] = React.useState(REPORTS_DATA);

  // Auto switch tab when role changes
  React.useEffect(() => {
    setTab(isSupervisor ? "overview" : "analytics");
  }, [isSupervisor, sup.id]);

  // New task form
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskDesc, setNewTaskDesc] = React.useState("");
  const [newTaskPriority, setNewTaskPriority] = React.useState<IssuePriority>("Medium");
  const [newTaskDue, setNewTaskDue] = React.useState("");

  // New issue form
  const [newIssueDesc, setNewIssueDesc] = React.useState("");
  const [newIssueCat, setNewIssueCat] = React.useState<SiteIssue["category"]>("Safety");
  const [newIssuePriority, setNewIssuePriority] = React.useState<IssuePriority>("Medium");

  // New material request form
  const [newMatItem, setNewMatItem] = React.useState("");
  const [newMatQty, setNewMatQty] = React.useState("");
  const [newMatUrgency, setNewMatUrgency] = React.useState<"Normal" | "Urgent">("Normal");

  // New daily report form (Supervisor only)
  const [newRepLabourPresent, setNewRepLabourPresent] = React.useState("");
  const [newRepLabourAbsent, setNewRepLabourAbsent] = React.useState("");
  const [newRepWorkDone, setNewRepWorkDone] = React.useState("");
  const [newRepDelays, setNewRepDelays] = React.useState("None");
  const [newRepMaterials, setNewRepMaterials] = React.useState("");
  const [newRepSafetyIncidents, setNewRepSafetyIncidents] = React.useState("");
  const [newRepRemark, setNewRepRemark] = React.useState("");

  const myTasks = tasks.filter((t) => t.supId === sup.id);
  const myReports = reports.filter((r) => r.supId === sup.id);
  const myIssues = issues.filter((i) => i.supId === sup.id);
  const myRequests = requests.filter((r) => r.supId === sup.id);

  // ── Attendance / check-in state ───────────────────────────────────────────
  interface AttendanceRecord {
    id: string;
    type: "check-in" | "check-out";
    timestamp: string;
    lat: string;
    lng: string;
    address: string;
    photoDataUrl: string | null;
  }
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([
    { id: "A1", type: "check-in",  timestamp: "12 Jul 2026, 07:04 AM", lat: "28.4595", lng: "77.0266", address: sup.location, photoDataUrl: null },
    { id: "A2", type: "check-out", timestamp: "12 Jul 2026, 07:02 PM", lat: "28.4596", lng: "77.0268", address: sup.location, photoDataUrl: null },
    { id: "A3", type: "check-in",  timestamp: "11 Jul 2026, 06:58 AM", lat: "28.4594", lng: "77.0265", address: sup.location, photoDataUrl: null },
    { id: "A4", type: "check-out", timestamp: "11 Jul 2026, 06:55 PM", lat: "28.4597", lng: "77.0267", address: sup.location, photoDataUrl: null },
  ]);
  const [checkInType, setCheckInType] = React.useState<"check-in" | "check-out">("check-in");
  const [gpsLoading, setGpsLoading] = React.useState(false);
  const [capturedPhoto, setCapturedPhoto] = React.useState<string | null>(null);
  const [currentGps, setCurrentGps] = React.useState<{ lat: string; lng: string } | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  // Native camera state
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
    } catch (err) {
      toast.error("Camera access denied or unavailable.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const handleCaptureFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply watermark via canvas
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height - 90, canvas.width, 90);
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    ctx.fillStyle = "white";
    ctx.font = `bold ${Math.max(14, canvas.width / 30)}px monospace`;
    ctx.fillText(`KINETIC — ${sup.name}`, 16, canvas.height - 60);
    ctx.font = `${Math.max(11, canvas.width / 40)}px monospace`;
    ctx.fillText(`GPS: ${currentGps?.lat ?? "?"}, ${currentGps?.lng ?? "?"}`, 16, canvas.height - 36);
    ctx.fillText(`${now} IST`, 16, canvas.height - 14);

    setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.85));
    toast.success("Photo captured with watermark");
    stopCamera();
  };


  const handleGetGps = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGps({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        });
        setGpsLoading(false);
        toast.success("Location captured!");
      },
      () => {
        // Fallback mock GPS for demo
        setCurrentGps({ lat: "28.459512", lng: "77.026634" });
        setGpsLoading(false);
        toast.info("Using approximate location (GPS unavailable)");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Apply watermark via canvas
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        // Semi-transparent overlay strip at bottom
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, img.height - 90, img.width, 90);
        // Watermark text
        const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        ctx.fillStyle = "white";
        ctx.font = `bold ${Math.max(14, img.width / 30)}px monospace`;
        ctx.fillText(`KINETIC — ${sup.name}`, 16, img.height - 60);
        ctx.font = `${Math.max(11, img.width / 40)}px monospace`;
        ctx.fillText(`GPS: ${currentGps?.lat ?? "?"}, ${currentGps?.lng ?? "?"}`, 16, img.height - 36);
        ctx.fillText(`${now} IST`, 16, img.height - 14);
        setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.85));
        toast.success("Photo captured with watermark");
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCheckIn = () => {
    if (!currentGps) { toast.error("Capture GPS location first"); return; }
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    const record: AttendanceRecord = {
      id: "A" + Date.now(),
      type: checkInType,
      timestamp: now,
      lat: currentGps.lat,
      lng: currentGps.lng,
      address: sup.location,
      photoDataUrl: capturedPhoto,
    };
    setAttendance((prev) => [record, ...prev]);
    setCurrentGps(null);
    setCapturedPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    toast.success(`${checkInType === "check-in" ? "✅ Checked In" : "🏁 Checked Out"} — ${now}`);
  };

  const handleExportAttendance = () => {
    exportToExcel(
      attendance.map((a) => ({
        "Type": a.type === "check-in" ? "CHECK-IN" : "CHECK-OUT",
        "Supervisor": sup.name,
        "Project": sup.project,
        "Timestamp": a.timestamp,
        "Latitude": a.lat,
        "Longitude": a.lng,
        "Location": a.address,
        "Photo": a.photoDataUrl ? "Captured" : "Not captured",
      })),
      `Kinetic_Attendance_${sup.name.replace(" ", "_")}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}`,
      undefined,
      `Site Attendance — ${sup.name}`
    );
    toast.success("Attendance log exported to Excel");
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskDue) { toast.error("Fill in task title and due date."); return; }
    const t: Task = {
      id: "T" + Date.now(),
      supId: sup.id,
      title: newTaskTitle,
      description: newTaskDesc,
      priority: newTaskPriority,
      status: "Pending",
      dueDate: newTaskDue,
      assignedBy: "Vikas Kulkarni (PM)",
    };
    setTasks((prev) => [t, ...prev]);
    setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskDue("");
    toast.success("Task assigned to " + sup.name + "!");
  };

  const handleTaskStatus = (id: string, next: TaskStatus) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: next } : t));
    toast.success("Task status updated.");
  };

  const handleResolveIssue = (id: string) => {
    setIssues((prev) => prev.map((i) => i.id === id ? { ...i, resolved: true } : i));
    toast.success("Issue marked as resolved.");
  };

  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueDesc) { toast.error("Describe the issue."); return; }
    const issue: SiteIssue = {
      id: "I" + Date.now(),
      supId: sup.id,
      date: new Date().toISOString().split("T")[0],
      category: newIssueCat,
      description: newIssueDesc,
      priority: newIssuePriority,
      resolved: false,
    };
    setIssues((prev) => [issue, ...prev]);
    setNewIssueDesc("");
    toast.success("Issue logged successfully!");
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatItem || !newMatQty) { toast.error("Fill in item and quantity."); return; }
    const req: MaterialRequest = {
      id: "MR" + Date.now(),
      supId: sup.id,
      date: new Date().toISOString().split("T")[0],
      item: newMatItem,
      quantity: newMatQty,
      urgency: newMatUrgency,
      status: "Pending",
    };
    setRequests((prev) => [req, ...prev]);
    setNewMatItem(""); setNewMatQty("");
    toast.success("Material request raised!");
  };

  const handleApproveReport = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: "Approved" } : r))
    );
    toast.success("Daily report approved!");
  };

  const handleAddDailyReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepLabourPresent || !newRepWorkDone) {
      toast.error("Labour present and work done are required fields.");
      return;
    }
    const newRep: SiteReport = {
      id: "R" + Date.now(),
      supId: sup.id,
      date: new Date().toISOString().split("T")[0],
      labourPresent: parseInt(newRepLabourPresent) || 0,
      labourAbsent: parseInt(newRepLabourAbsent) || 0,
      workDone: newRepWorkDone,
      delaysReason: newRepDelays,
      safetyIncidents: parseInt(newRepSafetyIncidents) || 0,
      materialUsed: newRepMaterials || "None",
      status: "Submitted",
      remark: newRepRemark,
    };
    setReports((prev) => [newRep, ...prev]);
    setNewRepLabourPresent("");
    setNewRepLabourAbsent("");
    setNewRepWorkDone("");
    setNewRepDelays("None");
    setNewRepMaterials("");
    setNewRepSafetyIncidents("");
    setNewRepRemark("");
    toast.success("Daily site report submitted for approval!");
  };

  const handleMaterialStatus = (reqId: string, nextStatus: MaterialRequest["status"]) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === reqId ? { ...req, status: nextStatus } : req))
    );
    toast.success(`Material request status updated to: ${nextStatus}`);
  };

  const tabs: { key: DetailTab; label: string; icon: React.ReactNode; count?: number }[] = isSupervisor
    ? [
        { key: "overview", label: "Overview", icon: <BarChart3 className="size-3.5" /> },
        { key: "tasks", label: "My Tasks", icon: <ClipboardList className="size-3.5" />, count: myTasks.filter(t => t.status !== "Done").length },
        { key: "reports", label: "Daily Reports", icon: <FileText className="size-3.5" /> },
        { key: "issues", label: "Log Issues", icon: <ShieldAlert className="size-3.5" />, count: myIssues.filter(i => !i.resolved).length },
        { key: "materials", label: "Materials", icon: <Package className="size-3.5" />, count: myRequests.filter(r => r.status === "Pending").length },
        { key: "attendance", label: "Site Check-In", icon: <MapPin className="size-3.5" /> },
      ]
    : [
        { key: "analytics", label: "Performance Analytics", icon: <BarChart3 className="size-3.5" /> },
        { key: "tasks", label: "Tasks Assigned", icon: <ClipboardList className="size-3.5" />, count: myTasks.filter(t => t.status !== "Done").length },
        { key: "reports", label: "Daily Reports", icon: <FileText className="size-3.5" />, count: myReports.filter(r => r.status === "Submitted").length },
        { key: "issues", label: "Issues Logged", icon: <ShieldAlert className="size-3.5" />, count: myIssues.filter(i => !i.resolved).length },
        { key: "materials", label: "Material Approvals", icon: <Package className="size-3.5" />, count: myRequests.filter(r => r.status === "Pending").length },
        { key: "attendance", label: "Attendance Logs", icon: <MapPin className="size-3.5" /> },
      ];

  return (
    <div className="flex flex-col h-full">
      {/* Profile header */}
      <div
        className="rounded-xl p-5 mb-4 flex items-start gap-4"
        style={{ background: "linear-gradient(135deg, hsl(22 90% 50% / 0.08), hsl(22 90% 50% / 0.03))", border: "1px solid hsl(22 90% 50% / 0.15)" }}
      >
        <div
          className="size-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg"
          style={{ background: "linear-gradient(135deg, hsl(22 90% 50%), hsl(22 90% 38%))" }}
        >
          {sup.photo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-display font-bold text-xl">{sup.name}</h2>
              <p className="text-sm text-muted-foreground">{sup.specialization}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              sup.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              sup.status === "On Leave" ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-gray-100 text-gray-500 border-gray-200"
            }`}>
              {sup.status}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="size-3" />{sup.project} — {sup.location}</span>
            <span className="flex items-center gap-1"><Phone className="size-3" />{sup.phone}</span>
            <span className="flex items-center gap-1"><Activity className="size-3" />{sup.experience} yrs exp</span>
            <span className="flex items-center gap-1"><Users className="size-3" />Team: {sup.teamSize}</span>
          </div>
          <div className="mt-2"><StarRating value={sup.rating} /></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            id={`sup-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-0.5 bg-primary/15 text-primary text-[10px] rounded-full px-1.5 py-px font-bold">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto space-y-4">

        {/* ── PERFORMANCE ANALYTICS (ADMIN ONLY) ── */}
        {!isSupervisor && tab === "analytics" && (() => {
          const totalTasksCount = myTasks.length;
          const completedTasksCount = myTasks.filter(t => t.status === "Done").length;
          const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100;
          const attendanceRate = Math.min(100, Math.round(90 + sup.rating * 2));
          const totalSafetyIncidents = myReports.reduce((acc, r) => acc + (r.safetyIncidents || 0), 0);
          const efficiencyScore = Math.round((taskCompletionRate * 0.4) + (sup.rating * 20 * 0.4) + (attendanceRate * 0.2));

          return (
            <div className="space-y-6">
              {/* Top row: Circular gauge + KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Circular Gauge */}
                <div className="md:col-span-5 rounded-xl border border-border bg-[color:var(--surface)] p-5 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Overall Performance Score</p>
                  <div className="relative size-36 flex items-center justify-center">
                    {/* Outer circle track */}
                    <svg className="absolute inset-0 size-full -rotate-90">
                      <circle cx="72" cy="72" r="64" className="stroke-secondary fill-none" strokeWidth="12" />
                      <circle 
                        cx="72" 
                        cy="72" 
                        r="64" 
                        className="stroke-primary fill-none transition-all duration-1000 ease-out" 
                        strokeWidth="12"
                        strokeDasharray="402"
                        strokeDashoffset={402 - (402 * efficiencyScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Inside Text */}
                    <div className="text-center">
                      <span className="text-4xl font-display font-bold text-foreground">{efficiencyScore}%</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">High Efficiency</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full font-medium">
                    <CheckCircle2 className="size-3.5" /> Top 15% in Operations
                  </div>
                </div>

                {/* KPI metrics details */}
                <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      label: "Task Completion Rate",
                      value: `${taskCompletionRate}%`,
                      subText: `${completedTasksCount} of ${totalTasksCount} tasks finished`,
                      color: "text-blue-600 border-blue-100 bg-blue-50/50",
                      progress: taskCompletionRate,
                      barColor: "bg-blue-600"
                    },
                    {
                      label: "Attendance Reliability",
                      value: `${attendanceRate}%`,
                      subText: `Based on biometric/GPS logs`,
                      color: "text-emerald-600 border-emerald-100 bg-emerald-50/50",
                      progress: attendanceRate,
                      barColor: "bg-emerald-600"
                    },
                    {
                      label: "Safety Record",
                      value: `${totalSafetyIncidents} Events`,
                      subText: `Total incidents reported on site`,
                      color: totalSafetyIncidents > 0 ? "text-amber-600 border-amber-100 bg-amber-50/50" : "text-emerald-600 border-emerald-100 bg-emerald-50/50",
                      progress: totalSafetyIncidents > 0 ? 30 : 100,
                      barColor: totalSafetyIncidents > 0 ? "bg-amber-500" : "bg-emerald-600"
                    },
                    {
                      label: "Avg. Experience Factor",
                      value: `${sup.experience} Years`,
                      subText: `Rating: ${sup.rating} / 5.0 on average`,
                      color: "text-orange-600 border-orange-100 bg-orange-50/50",
                      progress: sup.experience * 6.6,
                      barColor: "bg-orange-500"
                    }
                  ].map((k) => (
                    <div key={k.label} className={`rounded-xl border p-4 flex flex-col justify-between ${k.color}`}>
                      <div>
                        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{k.label}</div>
                        <div className="text-2xl font-display font-bold text-foreground mt-1">{k.value}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{k.subText}</div>
                      </div>
                      <div className="w-full bg-secondary/50 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full ${k.barColor} rounded-full`} style={{ width: `${k.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle row: Labour turnout bar chart */}
              <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-display font-semibold text-sm">Labour Turnout Analytics</h4>
                    <p className="text-xs text-muted-foreground">Turnout reported in the last 6 submissions by this supervisor</p>
                  </div>
                  <div className="text-xs font-semibold text-primary">Avg: 34 workers/day</div>
                </div>

                {/* Turnout Bar Graph */}
                <div className="h-48 flex items-end gap-3 sm:gap-6 pt-4 border-b border-border">
                  {myReports.length > 0 ? (
                    myReports.slice(0, 6).reverse().map((rep) => {
                      const maxVal = Math.max(...myReports.map(r => r.labourPresent), 40);
                      const pct = Math.round((rep.labourPresent / maxVal) * 100);
                      return (
                        <div key={rep.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 bg-foreground text-background text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                            {rep.labourPresent} present, {rep.labourAbsent} absent
                          </div>
                          <div 
                            className="w-full rounded-t bg-gradient-to-t from-primary/80 to-primary hover:from-primary hover:to-primary/90 transition-all duration-500 cursor-pointer shadow-sm"
                            style={{ height: `${pct}%` }}
                          />
                          <span className="text-[10px] font-mono text-muted-foreground mt-1">{rep.date.substring(5)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No data reported yet
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: Work & Safety insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Recent Accomplishments */}
                <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5">
                  <h4 className="font-display font-semibold text-sm mb-3">Key Site Activities</h4>
                  <div className="space-y-3">
                    {myReports.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-start gap-3 text-xs border-b border-border/40 pb-3 last:border-0 last:pb-0">
                        <div className="size-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="size-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{r.workDone}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Date: {r.date} &bull; Labour count: {r.labourPresent} workers</p>
                        </div>
                      </div>
                    ))}
                    {myReports.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">No reports filed yet.</p>
                    )}
                  </div>
                </div>

                {/* Operations Compliance Checklist */}
                <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5">
                  <h4 className="font-display font-semibold text-sm mb-3">Operational Compliance Checklist</h4>
                  <div className="space-y-3">
                    {[
                      { label: "Daily Site Report Filing", status: myReports[0] ? "Compliant" : "Pending", desc: myReports[0] ? "Filed for today" : "No submission today yet", color: myReports[0] ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50" },
                      { label: "Watermarked Photo Attendance Check", status: "Compliant", desc: "All logs match GPS geofencing perimeter", color: "text-emerald-600 bg-emerald-50" },
                      { label: "High-Priority Safety Hazards", status: myIssues.filter(i => i.priority === "Critical" && !i.resolved).length > 0 ? "Warning" : "Compliant", desc: myIssues.filter(i => i.priority === "Critical" && !i.resolved).length > 0 ? "1 Critical issue is unresolved!" : "Zero active critical safety issues", color: myIssues.filter(i => i.priority === "Critical" && !i.resolved).length > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
                      { label: "Material Request Cost Auditing", status: myRequests.filter(r => r.urgency === "Urgent" && r.status === "Pending").length > 0 ? "Attention Required" : "Compliant", desc: myRequests.filter(r => r.urgency === "Urgent" && r.status === "Pending").length > 0 ? "Urgent material requests pending approval" : "No urgent pending requests", color: myRequests.filter(r => r.urgency === "Urgent" && r.status === "Pending").length > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50" },
                    ].map((chk) => (
                      <div key={chk.label} className="flex items-start justify-between gap-3 text-xs border-b border-border/40 pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-foreground">{chk.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{chk.desc}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${chk.color}`}>{chk.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── OVERVIEW (SUPERVISOR ONLY) ── */}
        {isSupervisor && tab === "overview" && (
          <div className="space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Open Tasks", value: myTasks.filter(t => t.status !== "Done").length, icon: <ClipboardList className="size-4" />, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Open Issues", value: myIssues.filter(i => !i.resolved).length, icon: <AlertTriangle className="size-4" />, color: "text-red-600", bg: "bg-red-50" },
                { label: "Reports Filed", value: myReports.length, icon: <FileText className="size-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Mat Requests", value: myRequests.length, icon: <Package className="size-4" />, color: "text-violet-600", bg: "bg-violet-50" },
              ].map((k) => (
                <div key={k.label} className={`rounded-xl border border-border ${k.bg} p-4 flex items-center gap-3`}>
                  <div className={`size-8 rounded-lg bg-white shadow-sm flex items-center justify-center ${k.color}`}>{k.icon}</div>
                  <div>
                    <div className="text-xl font-display font-bold">{k.value}</div>
                    <div className="text-[10px] text-muted-foreground">{k.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Today's snapshot */}
            <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5">
              <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" /> Today's Site Snapshot
              </h4>
              {myReports[0] ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                      <div className="text-2xl font-display font-bold text-emerald-700">{myReports[0].labourPresent}</div>
                      <div className="text-[10px] text-muted-foreground">Labour Present</div>
                    </div>
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                      <div className="text-2xl font-display font-bold text-red-600">{myReports[0].labourAbsent}</div>
                      <div className="text-[10px] text-muted-foreground">Absent</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                      <div className="text-2xl font-display font-bold text-amber-600">{myReports[0].safetyIncidents}</div>
                      <div className="text-[10px] text-muted-foreground">Safety Events</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3 leading-relaxed">
                    <span className="font-semibold text-foreground">Work done:</span> {myReports[0].workDone}
                  </div>
                  <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3">
                    <span className="font-semibold text-foreground">Materials used:</span> {myReports[0].materialUsed}
                  </div>
                  {myReports[0].delaysReason !== "None" && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      ⚠ <span className="font-semibold">Delay:</span> {myReports[0].delaysReason}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No report submitted yet today.</p>
              )}
            </div>

            {/* Recent tasks summary */}
            <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5">
              <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" /> Recent Tasks
              </h4>
              <div className="space-y-2">
                {myTasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-secondary/30 text-xs">
                    <span className="truncate font-medium">{t.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${TASK_STATUS_STYLES[t.status]}`}>{t.status}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TASKS ── */}
        {tab === "tasks" && (
          <div className="space-y-4">
            {/* Add Task Form (Admin Only) */}
            {!isSupervisor && (
              <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5">
                <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2"><Plus className="size-4 text-primary" />Assign New Task</h4>
                <form onSubmit={handleAddTask} className="space-y-3 text-xs">
                  <input
                    type="text"
                    placeholder="Task title *"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm"
                  />
                  <textarea
                    placeholder="Description / instructions…"
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Priority</label>
                      <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as IssuePriority)} className="w-full p-2 bg-background border border-border rounded-lg">
                        {["Low","Medium","High","Critical"].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Due Date</label>
                      <input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} className="w-full p-2 bg-background border border-border rounded-lg font-mono" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                    <Send className="size-3.5" /> Assign Task
                  </button>
                </form>
              </div>
            )}

            {/* Tasks List */}
            <div className="space-y-2">
              {myTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No tasks assigned.</p>}
              {myTasks.map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-[color:var(--surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${TASK_STATUS_STYLES[t.status]}`}>{t.status}</span>
                      </div>
                      <p className="font-semibold text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="size-3" />Due: {t.dueDate}</span>
                        <span>By: {t.assignedBy}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {isSupervisor && t.status !== "Done" && (
                        <button onClick={() => handleTaskStatus(t.id, "Done")} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Mark done">
                          <Check className="size-3.5" />
                        </button>
                      )}
                      {isSupervisor && t.status === "Pending" && (
                        <button onClick={() => handleTaskStatus(t.id, "In Progress")} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Start">
                          <Activity className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab === "reports" && (
          <div className="space-y-4">
            {/* Submit Daily Report Form (Supervisor Only) */}
            {isSupervisor && (
              <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5">
                <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="size-4 text-primary" /> Submit Daily Site Report
                </h4>
                <form onSubmit={handleAddDailyReport} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Labour Present *</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 35" 
                        value={newRepLabourPresent} 
                        onChange={(e) => setNewRepLabourPresent(e.target.value)} 
                        className="w-full p-2 bg-background border border-border rounded-lg text-sm" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Labour Absent</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 2" 
                        value={newRepLabourAbsent} 
                        onChange={(e) => setNewRepLabourAbsent(e.target.value)} 
                        className="w-full p-2 bg-background border border-border rounded-lg text-sm" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Work Done (Detailed description) *</label>
                    <textarea 
                      placeholder="List slab pouring, column steel tying, plastering progress, etc…" 
                      value={newRepWorkDone} 
                      onChange={(e) => setNewRepWorkDone(e.target.value)} 
                      rows={3} 
                      className="w-full p-2.5 bg-background border border-border rounded-lg text-sm resize-none" 
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Safety Incidents</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 0" 
                        value={newRepSafetyIncidents} 
                        onChange={(e) => setNewRepSafetyIncidents(e.target.value)} 
                        className="w-full p-2 bg-background border border-border rounded-lg text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Delays / Roadblocks</label>
                      <select 
                        value={newRepDelays} 
                        onChange={(e) => setNewRepDelays(e.target.value)} 
                        className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                      >
                        <option>None</option>
                        <option>Material delay (cement/steel)</option>
                        <option>Equipment breakdown</option>
                        <option>Labour shortage</option>
                        <option>Design clash / Clarification pending</option>
                        <option>Weather delay (Rain/Heat)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Materials Used Today</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 40 bags cement, 1.5T TMT steel" 
                      value={newRepMaterials} 
                      onChange={(e) => setNewRepMaterials(e.target.value)} 
                      className="w-full p-2.5 bg-background border border-border rounded-lg text-sm" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Supervisor Remarks</label>
                    <input 
                      type="text" 
                      placeholder="Overall summary or notes…" 
                      value={newRepRemark} 
                      onChange={(e) => setNewRepRemark(e.target.value)} 
                      className="w-full p-2.5 bg-background border border-border rounded-lg text-sm" 
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                    <Send className="size-3.5" /> Submit Report for Approval
                  </button>
                </form>
              </div>
            )}

            {/* Reports List */}
            <div className="space-y-3">
              {myReports.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No reports filed yet.</p>}
              {myReports.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-[color:var(--surface)] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-display font-semibold text-sm">{r.date}</span>
                      <span className="text-xs text-muted-foreground ml-2">Daily Site Report</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${REPORT_STATUS[r.status].style}`}>{r.status}</span>
                      {!isSupervisor && r.status === "Submitted" && (
                        <button 
                          onClick={() => handleApproveReport(r.id)} 
                          className="flex items-center gap-1 text-[10px] bg-emerald-600 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Check className="size-3" /> Approve Report
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="rounded-lg bg-emerald-50 p-2.5">
                      <div className="text-lg font-display font-bold text-emerald-700">{r.labourPresent}</div>
                      <div className="text-muted-foreground">Present</div>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2.5">
                      <div className="text-lg font-display font-bold text-red-600">{r.labourAbsent}</div>
                      <div className="text-muted-foreground">Absent</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2.5">
                      <div className="text-lg font-display font-bold text-amber-600">{r.safetyIncidents || 0}</div>
                      <div className="text-muted-foreground">Safety Events</div>
                    </div>
                  </div>
                  <div className="text-xs bg-secondary/40 rounded-lg p-3 leading-relaxed">
                    <span className="font-semibold">Work done: </span>{r.workDone}
                  </div>
                  {r.delaysReason && r.delaysReason !== "None" && (
                    <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3">
                      ⚠ <span className="font-semibold">Delay: </span>{r.delaysReason}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
                    <span className="font-semibold text-foreground">Materials: </span>{r.materialUsed}
                  </div>
                  {r.remark && (
                    <div className="text-xs flex items-start gap-2 text-muted-foreground">
                      <MessageSquare className="size-3.5 mt-0.5 shrink-0" />
                      <span>{r.remark}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ISSUES ── */}
        {tab === "issues" && (
          <div className="space-y-4">
            {/* Log Issue Form (Supervisor Only) */}
            {isSupervisor && (
              <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5">
                <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2"><ShieldAlert className="size-4 text-red-500" />Log New Issue</h4>
                <form onSubmit={handleAddIssue} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Category</label>
                      <select value={newIssueCat} onChange={(e) => setNewIssueCat(e.target.value as SiteIssue["category"])} className="w-full p-2 bg-background border border-border rounded-lg">
                        {["Safety","Material","Equipment","Labour","Design"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Priority</label>
                      <select value={newIssuePriority} onChange={(e) => setNewIssuePriority(e.target.value as IssuePriority)} className="w-full p-2 bg-background border border-border rounded-lg">
                        {["Low","Medium","High","Critical"].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea
                    placeholder="Describe the site issue in detail…"
                    value={newIssueDesc}
                    onChange={(e) => setNewIssueDesc(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm resize-none"
                  />
                  <button type="submit" className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition-colors">
                    <Send className="size-3.5" /> Log Issue
                  </button>
                </form>
              </div>
            )}

            {/* Issues list */}
            <div className="space-y-2">
              {myIssues.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No issues logged.</p>}
              {myIssues.map((issue) => (
                <div key={issue.id} className={`rounded-xl border p-4 ${issue.resolved ? "border-border opacity-60" : "border-border bg-[color:var(--surface)]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-mono bg-secondary text-muted-foreground px-2 py-0.5 rounded">{issue.category}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${PRIORITY_STYLES[issue.priority]}`}>{issue.priority}</span>
                        {issue.resolved && <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="size-3" />Resolved</span>}
                      </div>
                      <p className="text-sm leading-relaxed">{issue.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1"><CalendarDays className="size-3" />{issue.date}</p>
                    </div>
                    {!issue.resolved && !isSupervisor && (
                      <button onClick={() => handleResolveIssue(issue.id)} className="shrink-0 p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Mark resolved">
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MATERIALS ── */}
        {tab === "materials" && (
          <div className="space-y-4">
            {/* Raise Request Form (Supervisor Only) */}
            {isSupervisor && (
              <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5">
                <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2"><Package className="size-4 text-violet-600" />Raise Material Request</h4>
                <form onSubmit={handleAddMaterial} className="space-y-3 text-xs">
                  <input
                    type="text"
                    placeholder="Material / Item name *"
                    value={newMatItem}
                    onChange={(e) => setNewMatItem(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Quantity</label>
                      <input type="text" placeholder="e.g. 200 bags" value={newMatQty} onChange={(e) => setNewMatQty(e.target.value)} className="w-full p-2 bg-background border border-border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Urgency</label>
                      <select value={newMatUrgency} onChange={(e) => setNewMatUrgency(e.target.value as "Normal" | "Urgent")} className="w-full p-2 bg-background border border-border rounded-lg text-sm">
                        <option>Normal</option>
                        <option>Urgent</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-violet-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-violet-700 transition-colors">
                    <Truck className="size-3.5" /> Raise Request
                  </button>
                </form>
              </div>
            )}

            {/* Requests Table */}
            <div className="rounded-xl border border-border bg-[color:var(--surface)] overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-secondary/20">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  {isSupervisor ? "My Material Requests Log" : "Supervisor Material Requests"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/30 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-left">Item</th>
                      <th className="px-4 py-2.5 text-left">Qty</th>
                      <th className="px-4 py-2.5 text-left">Urgency</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                      {!isSupervisor && <th className="px-4 py-2.5 text-left">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {myRequests.length === 0 && (
                      <tr>
                        <td colSpan={isSupervisor ? 5 : 6} className="px-4 py-8 text-center text-muted-foreground">
                          No material requests found.
                        </td>
                      </tr>
                    )}
                    {myRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground">{r.date}</td>
                        <td className="px-4 py-3 font-medium">{r.item}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.quantity}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.urgency === "Urgent" ? "bg-red-50 text-red-600 animate-pulse" : "bg-gray-100 text-gray-600"}`}>{r.urgency}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold ${MAT_STATUS_STYLES[r.status]}`}>{r.status}</span>
                        </td>
                        {!isSupervisor && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.status === "Pending" && (
                              <button 
                                onClick={() => handleMaterialStatus(r.id, "Approved")}
                                className="text-[10px] bg-blue-600 text-white font-semibold px-2.5 py-1 rounded hover:bg-blue-700 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {r.status === "Approved" && (
                              <button 
                                onClick={() => handleMaterialStatus(r.id, "Dispatched")}
                                className="text-[10px] bg-violet-600 text-white font-semibold px-2.5 py-1 rounded hover:bg-violet-700 transition-colors"
                              >
                                Dispatch
                              </button>
                            )}
                            {r.status === "Dispatched" && (
                              <button 
                                onClick={() => handleMaterialStatus(r.id, "Delivered")}
                                className="text-[10px] bg-emerald-600 text-white font-semibold px-2.5 py-1 rounded hover:bg-emerald-700 transition-colors"
                              >
                                Deliver
                              </button>
                            )}
                            {r.status === "Delivered" && (
                              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                <CheckCircle2 className="size-3" /> Received
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SITE ATTENDANCE / ATTENDANCE LOGS ── */}
        {tab === "attendance" && (
          <div className="space-y-5">
            {/* Export button */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2"><MapPin className="size-4 text-primary" />Site Attendance Log</h4>
              <button onClick={handleExportAttendance} className="flex items-center gap-1.5 text-xs font-semibold border border-border rounded-lg px-3 py-2 hover:bg-secondary transition-colors">
                <FileDown className="size-3.5" /> Export Excel
              </button>
            </div>

            {/* Check-in / Check-out card (Supervisor Only) */}
            {isSupervisor && (
              <div className="rounded-xl border border-border bg-[color:var(--surface)] p-5 space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Camera className="size-4 text-primary" /> Record Site Presence
                </h4>

                {/* Type selector */}
                <div className="grid grid-cols-2 gap-3">
                  {(["check-in", "check-out"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCheckInType(t)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        checkInType === t
                          ? t === "check-in"
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600"
                            : "bg-orange-500/10 border-orange-500/40 text-orange-600"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "check-in" ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
                      {t === "check-in" ? "Morning Check-In" : "Evening Check-Out"}
                    </button>
                  ))}
                </div>

                {/* GPS capture */}
                <div className="rounded-lg bg-secondary/40 p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold">GPS Location</p>
                    {currentGps ? (
                      <p className="text-xs font-mono text-primary mt-0.5">{currentGps.lat}, {currentGps.lng}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Not captured yet</p>
                    )}
                  </div>
                  <button
                    onClick={handleGetGps}
                    disabled={gpsLoading}
                    className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <MapPin className="size-3.5" />
                    {gpsLoading ? "Locating…" : currentGps ? "Re-capture" : "Capture GPS"}
                  </button>
                </div>

                {/* Camera photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Site Photo (Camera Only)</label>
                    {isCameraOpen && (
                      <button onClick={stopCamera} className="text-[10px] text-red-500 font-semibold hover:underline">Cancel Camera</button>
                    )}
                  </div>
                  
                  {isCameraOpen ? (
                    <div className="relative rounded-xl overflow-hidden bg-black flex flex-col min-h-[250px]">
                      <video
                        ref={(el) => {
                          videoRef.current = el;
                          if (el && streamRef.current && !el.srcObject) {
                            el.srcObject = streamRef.current;
                            el.play().catch(e => console.error("Video play error:", e));
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-auto max-h-[400px] object-cover"
                      />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <button
                          onClick={(e) => { e.preventDefault(); handleCaptureFromVideo(); }}
                          className="size-14 rounded-full bg-white/20 border-4 border-white flex items-center justify-center hover:bg-white/40 transition-colors"
                        >
                          <div className="size-10 rounded-full bg-white"></div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative rounded-xl border-2 border-dashed border-border bg-secondary/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors"
                      style={{ minHeight: capturedPhoto ? "auto" : 100 }}
                      onClick={startCamera}
                    >
                      {capturedPhoto ? (
                        <>
                          <img src={capturedPhoto} alt="Watermarked site photo" className="w-full rounded-xl" />
                          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">WATERMARKED</div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setCapturedPhoto(null); }}
                            className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                          >
                            <X className="size-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Camera className="size-6 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Tap to open camera</p>
                          <p className="text-[10px] text-muted-foreground/60">Gallery upload is disabled</p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmitCheckIn}
                  disabled={!currentGps}
                  className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${
                    checkInType === "check-in"
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  {checkInType === "check-in" ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
                  Submit {checkInType === "check-in" ? "Check-In" : "Check-Out"}
                </button>
              </div>
            )}

            {/* Attendance history */}
            <div className="rounded-xl border border-border bg-[color:var(--surface)] overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-secondary/20">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Attendance History</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/30 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5">Type</th>
                      <th className="text-left px-4 py-2.5">Timestamp (IST)</th>
                      <th className="text-left px-4 py-2.5">GPS Coordinates</th>
                      <th className="text-left px-4 py-2.5">Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a) => (
                      <tr key={a.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              a.type === "check-in"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-orange-50 text-orange-700 border border-orange-200"
                            }`}
                          >
                            {a.type === "check-in" ? <LogIn className="size-3" /> : <LogOut className="size-3" />}
                            {a.type === "check-in" ? "Check-In" : "Check-Out"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{a.timestamp}</td>
                        <td className="px-4 py-3 font-mono">
                          <span className="flex items-center gap-1 text-primary">
                            <MapPin className="size-3" />{a.lat}, {a.lng}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {a.photoDataUrl ? (
                            <img src={a.photoDataUrl} alt="Site" className="h-10 w-16 object-cover rounded-md border border-border" />
                          ) : (
                            <span className="text-muted-foreground italic">No photo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function SupervisorsPage() {
  const [activeRole, setActiveRole] = React.useState<string>("admin");
  const [selectedId, setSelectedId] = React.useState<string>("SV6"); // Default to Amit Mishra
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"All" | Supervisor["status"]>("All");

  React.useEffect(() => {
    const updateRole = () => {
      const role = localStorage.getItem("kinetic_active_role") || "admin";
      setActiveRole(role);
      if (role === "supervisor") {
        setSelectedId("SV6"); // Force Amit Mishra
      }
    };
    updateRole();
    window.addEventListener("kinetic_role_changed", updateRole);
    return () => window.removeEventListener("kinetic_role_changed", updateRole);
  }, []);

  const filtered = SUPERVISORS.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.project.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedSup = SUPERVISORS.find((s) => s.id === selectedId)!;

  const stats = {
    total: SUPERVISORS.length,
    active: SUPERVISORS.filter((s) => s.status === "Active").length,
    reportsToday: SUPERVISORS.filter((s) => s.todayReport !== "Pending").length,
    openIssues: ISSUES_DATA.filter((i) => !i.resolved).length,
  };

  const isSupervisor = activeRole === "supervisor";

  return (
    <div className="p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <PageHeader
          eyebrow={isSupervisor ? "Site Operations" : "Field Management"}
          title={isSupervisor ? "Supervisor Workspace" : "Supervisor Portal"}
          actions={
            <div className="flex gap-2">
              {isSupervisor ? (
                <div className="text-xs bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 font-mono text-primary font-semibold">
                  Logged in as Site Supervisor (Amit Mishra)
                </div>
              ) : (
                <div className="text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 font-mono text-emerald-600 font-semibold">
                  🛡️ Owner Overview (Company Admin)
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* ── Summary cards (Only show global counts to Admin, show personal stats to Supervisor) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isSupervisor ? (
          <>
            {[
              { label: "Current Site Coverage", value: "Multiple Sites", icon: <HardHat className="size-4" />, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
              { label: "Core Company Team", value: "20 workers", icon: <Users className="size-4" />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "Open Tasks", value: selectedSup?.tasksOpen || 3, icon: <ClipboardList className="size-4" />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
              { label: "Critical Issues", value: selectedSup?.issuesOpen || 1, icon: <AlertTriangle className="size-4" />, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl border ${k.border} ${k.bg} p-4 flex items-center gap-3`}>
                <div className={`size-9 rounded-lg bg-white shadow-sm flex items-center justify-center ${k.color}`}>{k.icon}</div>
                <div>
                  <div className="text-lg md:text-xl font-display font-bold text-foreground truncate max-w-[150px]">{k.value}</div>
                  <div className="text-[11px] text-muted-foreground">{k.label}</div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {[
              { label: "Total Supervisors", value: stats.total, icon: <HardHat className="size-4" />, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
              { label: "Active On Site", value: stats.active, icon: <Activity className="size-4" />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "Reports Today", value: stats.reportsToday, icon: <FileText className="size-4" />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
              { label: "Open Issues", value: stats.openIssues, icon: <AlertTriangle className="size-4" />, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl border ${k.border} ${k.bg} p-4 flex items-center gap-3`}>
                <div className={`size-9 rounded-lg bg-white shadow-sm flex items-center justify-center ${k.color}`}>{k.icon}</div>
                <div>
                  <div className="text-2xl font-display font-bold text-foreground">{k.value}</div>
                  <div className="text-[11px] text-muted-foreground">{k.label}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Supervisor list (Admin only) */}
        {!isSupervisor && (
          <div className="xl:col-span-4 flex flex-col gap-3">
            {/* Search + filter */}
            <div className="flex gap-2">
              <input
                id="supervisor-search"
                type="text"
                placeholder="Search name or project…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-[color:var(--surface)] border border-border rounded-lg"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-2 text-xs bg-[color:var(--surface)] border border-border rounded-lg"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5 max-h-[780px] overflow-y-auto pr-1">
              {filtered.map((s) => (
                <SupervisorCard
                  key={s.id}
                  sup={s}
                  isSelected={selectedId === s.id}
                  onClick={() => setSelectedId(s.id)}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No supervisors match your search.</p>
              )}
            </div>
          </div>
        )}

        {/* Right: Detail panel (Full width for Supervisor) */}
        <div className={`${isSupervisor ? "xl:col-span-12" : "xl:col-span-8"} bg-[color:var(--surface)] border border-border rounded-xl p-6 min-h-[600px]`}>
          {selectedSup ? (
            <SupervisorDetail sup={selectedSup} isSupervisor={isSupervisor} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a supervisor to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
