import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { api, type DomainRecord } from "../../../lib/api";
import { exportToExcel } from "../../../lib/excel";
import { toast } from "sonner";
import {
  Users,
  IndianRupee,
  Receipt,
  Download,
  CheckCircle2,
  Calendar,
  UserPlus,
  MinusCircle,
  Calculator,
  Zap,
  X,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/labour")({ component: Page });

function Page() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [draft, setDraft] = useState<Record<string, DomainRecord>>({});

  // Reset draft on project change
  useEffect(() => setDraft({}), [projectId]);

  const endpoint = `/supervisor/labour/attendance?projectId=${encodeURIComponent(projectId)}&date=${day}`;

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.get<DomainRecord>(`/projects/${projectId}`),
  });

  // Fetch workers attendance data
  const query = useQuery({
    queryKey: ["labour", projectId, day],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });

  const workers = query.data ?? [];

  // Local state for registering new labourer
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Skilled (Mason / Fitter)");
  const [newRate, setNewRate] = useState("800");

  // Local state for single worker debit
  const [singleWorkerId, setSingleWorkerId] = useState("");
  const [singleCategory, setSingleCategory] = useState("Food & Mess Allowance");
  const [singleAmount, setSingleAmount] = useState("");
  const [singleReason, setSingleReason] = useState("Food & Mess Allowance");

  // Local state for bulk amount disbursement
  const [bulkTarget, setBulkTarget] = useState<"present" | "all">("present");
  const [bulkCategory, setBulkCategory] = useState("Food & Mess Allowance");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkReason, setBulkReason] = useState("Food & Mess Allowance");
  const [bulkWorkerCountOverride, setBulkWorkerCountOverride] = useState("");

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchAmounts, setBatchAmounts] = useState<
    Record<string, { amount: string; category: string; reason: string }>
  >({});

  // Helper to handle category change
  function handleCategoryChange(
    cat: string,
    setCatFn: (v: string) => void,
    setReasonFn: (v: string) => void,
  ) {
    setCatFn(cat);
    if (cat === "Food & Mess Allowance") setReasonFn("Food & Mess Allowance");
    else if (cat === "Daily Cash Advance / Wage") setReasonFn("Daily Cash Advance");
    else if (cat === "Travel & Transport") setReasonFn("Travel & Transport Allowance");
    else if (cat === "Tools & Boots") setReasonFn("Tools & Safety Boots");
    else if (cat === "Medical & Emergency") setReasonFn("Medical & Emergency Advance");
    else if (cat === "Other Expense") setReasonFn("");
  }

  // Register Worker Mutation
  const registerWorker = useMutation({
    mutationFn: async () => {
      if (registerWorker.isPending) return;
      if (!newName.trim() || !newRate || Number(newRate) <= 0) {
        throw new Error("Please enter a valid worker name and daily rate.");
      }
      await api.post("/supervisor/labour/attendance", {
        projectId,
        date: day,
        operation: "register",
        name: newName.trim(),
        type: newCategory,
        rate: Number(newRate),
      });
    },
    onSuccess: () => {
      setNewName("");
      setNewRate("800");
      qc.invalidateQueries({ queryKey: ["labour", projectId] });
      toast.success("New worker registered successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Log Single Worker Debit Mutation
  const logDebit = useMutation({
    mutationFn: async () => {
      if (logDebit.isPending) return;
      if (!singleWorkerId || !singleAmount || Number(singleAmount) <= 0 || !singleReason.trim()) {
        throw new Error("Please select a worker, enter a valid debit amount and reason.");
      }
      await api.post("/supervisor/labour/attendance", {
        projectId,
        date: day,
        operation: "debit",
        labourAttendanceId: singleWorkerId,
        category: singleCategory,
        expenseType: singleCategory,
        amount: Number(singleAmount),
        description: singleReason.trim(),
      });
    },
    onSuccess: () => {
      setSingleAmount("");
      qc.invalidateQueries({ queryKey: ["labour", projectId] });
      toast.success("Single worker debit logged successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Bulk Debit Mutation (Single Day Flat Disburse across workers)
  const bulkDebit = useMutation({
    mutationFn: async () => {
      if (bulkDebit.isPending) return;
      const amount = Number(bulkAmount);
      if (!amount || amount <= 0 || !bulkReason.trim()) {
        throw new Error("Please enter a valid debit amount and reason for bulk disbursement.");
      }

      const targetWorkers =
        bulkTarget === "present"
          ? workers.filter((w) => {
              const id = String(w.labourAttendanceId);
              const status = String(draft[id]?.status ?? w.status ?? "Present");
              return status === "Present" || status === "Half Day";
            })
          : workers;

      if (targetWorkers.length === 0) {
        throw new Error("No eligible workers found for bulk disbursement.");
      }

      const countToProcess = bulkWorkerCountOverride
        ? Math.min(Number(bulkWorkerCountOverride), targetWorkers.length)
        : targetWorkers.length;

      const workersSlice = targetWorkers.slice(0, countToProcess);

      await Promise.all(
        workersSlice.map((w) =>
          api.post("/supervisor/labour/attendance", {
            projectId,
            date: day,
            operation: "debit",
            labourAttendanceId: String(w.labourAttendanceId),
            category: bulkCategory,
            expenseType: bulkCategory,
            amount,
            workerCount: countToProcess,
            description: bulkReason.trim(),
          }),
        ),
      );

      return countToProcess;
    },
    onSuccess: (count) => {
      setBulkAmount("");
      qc.invalidateQueries({ queryKey: ["labour", projectId] });
      toast.success(`Bulk amount disbursed to ${count} workers successfully.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Custom Batch Entry Disburse Mutation
  const batchDisburse = useMutation({
    mutationFn: async () => {
      if (batchDisburse.isPending) return;
      const itemsToSubmit = Object.entries(batchAmounts).filter(
        ([, v]) => Number(v.amount) > 0 && v.reason.trim(),
      );

      if (itemsToSubmit.length === 0) {
        throw new Error("Please enter valid amounts and reasons for at least one worker.");
      }

      await Promise.all(
        itemsToSubmit.map(([workerId, data]) =>
          api.post("/supervisor/labour/attendance", {
            projectId,
            date: day,
            operation: "debit",
            labourAttendanceId: workerId,
            category: data.category || "Food & Mess Allowance",
            expenseType: data.category || "Food & Mess Allowance",
            amount: Number(data.amount),
            description: data.reason.trim(),
          }),
        ),
      );

      return itemsToSubmit.length;
    },
    onSuccess: (count) => {
      setBatchAmounts({});
      setIsBatchModalOpen(false);
      qc.invalidateQueries({ queryKey: ["labour", projectId] });
      toast.success(`Batch daily disbursement logged for ${count} workers.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Save Attendance Mutation
  const saveAttendance = useMutation({
    mutationFn: async () => {
      if (saveAttendance.isPending) return;
      for (const [id, record] of Object.entries(draft)) {
        await api.post("/supervisor/labour/attendance", {
          projectId,
          date: day,
          operation: "attendance",
          labourAttendanceId: id,
          ...record,
        });
      }
    },
    onSuccess: () => {
      setDraft({});
      qc.invalidateQueries({ queryKey: ["labour", projectId] });
      toast.success("Attendance saved successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Computed summary metrics
  const { presentCount, totalWorkers, nightShiftCount, todayWages, activeAdvances } =
    useMemo(() => {
      let pCount = 0;
      let nShift = 0;
      let totalWages = 0;
      let totalAdvances = 0;

      for (const w of workers) {
        const id = String(w.labourAttendanceId);
        const record = draft[id] ?? { status: w.status, nightShift: w.nightShift };
        const status = String(record.status ?? w.status ?? "Present");
        const nightShift = !!(record.nightShift ?? w.nightShift);
        const rate = Number(w.rate ?? 800);

        if (status === "Present" || status === "Half Day") {
          pCount++;
          const baseCost = status === "Present" ? rate : rate / 2;
          const nightBonus = nightShift ? 500 : 0;
          totalWages += baseCost + nightBonus;
        }
        if (nightShift) nShift++;
        totalAdvances += Number(w.advanceDeductions ?? 0);
      }

      return {
        presentCount: pCount,
        totalWorkers: workers.length,
        nightShiftCount: nShift,
        todayWages: totalWages,
        activeAdvances: totalAdvances,
      };
    }, [workers, draft]);

  // Export to Excel
  const handleExportExcel = () => {
    const rows = workers.map((w) => {
      const id = String(w.labourAttendanceId);
      const record = draft[id] ?? { status: w.status, nightShift: w.nightShift };
      const status = String(record.status ?? w.status ?? "Present");
      const nightShift = !!(record.nightShift ?? w.nightShift);
      const rate = Number(w.rate ?? 800);
      const computedCost =
        status === "Absent" ? 0 : (status === "Present" ? rate : rate / 2) + (nightShift ? 500 : 0);

      return {
        "Worker Name": w.name,
        Category: w.type || "Skilled",
        "Daily Rate (INR)": rate,
        "Daily Status": status,
        "Night Duty": nightShift ? "Yes (+₹500)" : "No",
        "Computed Cost (INR)": computedCost,
        "Days Present (Month)": w.daysPresent ?? 0,
        "Advances (INR)": w.advanceDeductions ?? 0,
      };
    });

    exportToExcel(
      rows.length ? rows : [{ Note: "No attendance data" }],
      `Daily_Site_Attendance_${day}`,
      undefined,
      `Daily Site Attendance — ${project?.name || "Project Site"}`
    );
  };

  const projectName = String(project?.name || "Project Site");
  const supervisorName = String(user?.name || user?.email?.split("@")[0] || "Supervisor");

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Portfolio &gt; {projectName} &gt; Daily Labour Attendance
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Daily Site Attendance
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 border border-orange-500/20">
              Site: {projectName} ({supervisorName})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[color:var(--surface)] border border-border px-3 py-1.5 rounded-lg text-xs font-medium">
            <Calendar className="size-4 text-primary" />
            <input
              type="date"
              value={day}
              disabled={Object.keys(draft).length > 0 || saveAttendance.isPending}
              onChange={(e) => setDay(e.target.value)}
              className="bg-transparent border-none outline-none font-medium cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              SITE WORKERS PRESENT
            </div>
            <div className="text-2xl font-black text-foreground">
              {presentCount} / {totalWorkers}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {nightShiftCount} Workers on Night Shift
            </div>
          </div>
          <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <Users className="size-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              TODAY&apos;S SITE WAGES
            </div>
            <div className="text-2xl font-black text-foreground">
              ₹{todayWages.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Estimated site charge for today
            </div>
          </div>
          <div className="size-10 rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center">
            <IndianRupee className="size-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              ACTIVE ADVANCES
            </div>
            <div className="text-2xl font-black text-foreground">
              ₹{activeAdvances.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Deductions for workers at this site
            </div>
          </div>
          <div className="size-10 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
            <Receipt className="size-5" />
          </div>
        </div>
      </div>

      {/* Attendance Marking Section */}
      <div className="p-6 rounded-xl border border-border bg-[color:var(--surface)] space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground">Project Attendance Marking</h3>
            <p className="text-xs text-muted-foreground">
              Mark daily site status and night shifts for workers on your project site.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="h-9 px-3.5 border border-border rounded-lg text-xs font-semibold hover:bg-secondary transition-colors flex items-center gap-1.5"
            >
              <Download className="size-3.5" /> Export Excel
            </button>
            <button
              onClick={() => saveAttendance.mutate()}
              disabled={!Object.keys(draft).length || saveAttendance.isPending}
              className="h-9 px-4 bg-foreground text-background font-semibold text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
            >
              <CheckCircle2 className="size-4 text-emerald-500" />
              {saveAttendance.isPending ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-secondary/30">
              <tr>
                <th className="px-4 py-3 font-semibold">WORKER NAME</th>
                <th className="px-4 py-3 font-semibold">CATEGORY / WAGE</th>
                <th className="px-4 py-3 font-semibold">DAILY STATUS</th>
                <th className="px-4 py-3 font-semibold">LOCATION OF WORK</th>
                <th className="px-4 py-3 font-semibold">NIGHT WORK SHIFT</th>
                <th className="px-4 py-3 font-semibold text-right">COMPUTED COST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workers.map((w) => {
                const id = String(w.labourAttendanceId);
                const value = draft[id] ?? { status: w.status ?? "Present", nightShift: w.nightShift };
                const currentStatus = String(value.status);
                const nightDuty = !!value.nightShift;
                const rate = Number(w.rate ?? 800);
                const computed =
                  currentStatus === "Absent"
                    ? 0
                    : (currentStatus === "Present" ? rate : rate / 2) + (nightDuty ? 500 : 0);

                return (
                  <tr key={id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{String(w.name)}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {String(w.type || "Skilled").slice(0, 2).toUpperCase()}-L1
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 mb-0.5">
                        {String(w.type || "Skilled")}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        ₹{rate.toLocaleString("en-IN")}/day
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex rounded-lg border border-border p-0.5 bg-background gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              [id]: { ...value, status: "Present" },
                            }))
                          }
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                            currentStatus === "Present"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              [id]: { ...value, status: "Half Day" },
                            }))
                          }
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                            currentStatus === "Half Day"
                              ? "bg-amber-500 text-white shadow-sm"
                              : "text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          Half Day
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              [id]: {
                                ...value,
                                status: "Absent",
                                nightShift: false,
                              },
                            }))
                          }
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                            currentStatus === "Absent"
                              ? "bg-rose-600 text-white shadow-sm"
                              : "text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Location of work for ${w.name}`}
                        className="h-8 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        defaultValue={projectName}
                      >
                        <option value={projectName}>{projectName}</option>
                        <option value="Block A">Block A</option>
                        <option value="Block B">Block B</option>
                        <option value="Central Site">Central Site</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={nightDuty}
                          disabled={currentStatus === "Absent"}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              [id]: { ...value, nightShift: e.target.checked },
                            }))
                          }
                          className="size-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className={nightDuty ? "text-orange-600 font-semibold" : "text-muted-foreground"}>
                          Night Duty (+₹500)
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      ₹{computed.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 3 Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Register New Labourer */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <UserPlus className="size-4 text-primary" /> Register New Labourer
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Add skilled or unskilled labourer to the site daily registry master.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Labourer Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Pujari"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                >
                  <option value="Skilled (Mason / Fitter)">Skilled (Mason / Fitter)</option>
                  <option value="Unskilled">Unskilled</option>
                  <option value="Semi-Skilled">Semi-Skilled</option>
                  <option value="Supervisor">Supervisor</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Daily Wage (₹)
                </label>
                <input
                  type="number"
                  placeholder="800"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => registerWorker.mutate()}
            disabled={registerWorker.isPending}
            className="w-full h-9 mt-4 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {registerWorker.isPending ? "Registering..." : "Register Worker"}
          </button>
        </div>

        {/* Card 2: Single Worker Expense Debit */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <MinusCircle className="size-4 text-rose-500" /> Log Single Worker Debit
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Log food, mess, travel, cash advances, or personal debits for an individual worker.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Select From Worker
                </label>
                <select
                  value={singleWorkerId}
                  onChange={(e) => setSingleWorkerId(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                >
                  <option value="">Select Worker...</option>
                  {workers.map((w) => (
                    <option key={String(w.labourAttendanceId)} value={String(w.labourAttendanceId)}>
                      {String(w.name)} ({String(w.type || "Skilled")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Expense Category
                </label>
                <select
                  value={singleCategory}
                  onChange={(e) =>
                    handleCategoryChange(e.target.value, setSingleCategory, setSingleReason)
                  }
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                >
                  <option value="Food & Mess Allowance">🍱 Food & Mess Allowance</option>
                  <option value="Daily Cash Advance / Wage">💵 Daily Cash Advance / Wage</option>
                  <option value="Travel & Transport">🚌 Travel & Transport</option>
                  <option value="Tools & Boots">🥾 Tools & Boots</option>
                  <option value="Medical & Emergency">🏥 Medical & Emergency</option>
                  <option value="Other Expense">⚡ Other Expense (Custom Note)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Debit Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={singleAmount}
                  onChange={(e) => setSingleAmount(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Reason / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mess advances / Boots supply"
                  value={singleReason}
                  onChange={(e) => setSingleReason(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
              </div>

              {/* Single worker cost summary */}
              {Boolean(singleWorkerId && singleAmount) && (
                <div className="p-2.5 rounded-lg border border-border bg-secondary/40 text-xs font-medium text-foreground flex items-center justify-between">
                  <span>Single Debit Summary:</span>
                  <span className="font-bold text-rose-600">
                    ₹{Number(singleAmount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => logDebit.mutate()}
            disabled={logDebit.isPending}
            className="w-full h-9 mt-4 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {logDebit.isPending ? "Applying..." : "Apply Single Debit"}
          </button>
        </div>

        {/* Card 3: Bulk Daily Amount Disbursement */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <Zap className="size-4 text-orange-600" /> Bulk Daily Disbursement
              </h4>
              <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 border border-orange-500/20">
                FAST BATCH
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Disburse flat daily advances, food, or mess allowances to multiple site workers at once.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Target Worker Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkTarget("present");
                      setBulkWorkerCountOverride("");
                    }}
                    className={`h-8 px-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                      bulkTarget === "present"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Present Today ({presentCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkTarget("all");
                      setBulkWorkerCountOverride("");
                    }}
                    className={`h-8 px-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                      bulkTarget === "all"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    All Registered ({totalWorkers})
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Expense Category
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) =>
                    handleCategoryChange(e.target.value, setBulkCategory, setBulkReason)
                  }
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                >
                  <option value="Food & Mess Allowance">🍱 Food & Mess Allowance</option>
                  <option value="Daily Cash Advance / Wage">💵 Daily Cash Advance / Wage</option>
                  <option value="Travel & Transport">🚌 Travel & Transport</option>
                  <option value="Tools & Boots">🥾 Tools & Boots</option>
                  <option value="Medical & Emergency">🏥 Medical & Emergency</option>
                  <option value="Other Expense">⚡ Other Expense (Custom Note)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Daily Wage / Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 200"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Number of Workers
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={String(bulkTarget === "present" ? presentCount : totalWorkers)}
                    value={
                      bulkWorkerCountOverride ||
                      String(bulkTarget === "present" ? presentCount : totalWorkers)
                    }
                    onChange={(e) => setBulkWorkerCountOverride(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Reason / Description Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily Mess & Tea Advance"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
              </div>

              {/* Total Computed Cost banner */}
              <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 text-xs space-y-1">
                <div className="font-bold text-orange-600 flex items-center justify-between">
                  <span>Total Computed Cost:</span>
                  <span className="text-sm font-black">
                    ₹
                    {(
                      (Number(bulkAmount) || 0) *
                      (Number(bulkWorkerCountOverride) ||
                        (bulkTarget === "present" ? presentCount : totalWorkers))
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>Category: {bulkCategory}</span>
                  <span>
                    ₹{bulkAmount || 0} ×{" "}
                    {bulkWorkerCountOverride ||
                      (bulkTarget === "present" ? presentCount : totalWorkers)}{" "}
                    workers
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => bulkDebit.mutate()}
              disabled={bulkDebit.isPending}
              className="h-9 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Zap className="size-3.5" />
              {bulkDebit.isPending ? "Disbursing..." : "Disburse Bulk"}
            </button>
            <button
              type="button"
              onClick={() => {
                const initialBatch: Record<
                  string,
                  { amount: string; category: string; reason: string }
                > = {};
                workers.forEach((w) => {
                  initialBatch[String(w.labourAttendanceId)] = {
                    amount: bulkAmount || "200",
                    category: bulkCategory,
                    reason: bulkReason || bulkCategory,
                  };
                });
                setBatchAmounts(initialBatch);
                setIsBatchModalOpen(true);
              }}
              className="h-9 border border-border text-foreground text-xs font-semibold rounded-lg hover:bg-secondary transition-colors flex items-center justify-center gap-1"
            >
              <Layers className="size-3.5" /> Batch Table Entry
            </button>
          </div>
        </div>
      </div>

      {/* Batch Entry Disburse Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[color:var(--surface)] border border-border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-orange-600" />
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Batch Daily Amount Disburse
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Quickly disburse custom cash advances or food allowances per worker for {day}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick fill header */}
            <div className="p-3 rounded-xl border border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="font-semibold text-foreground">Quick Set All Rows:</div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-8 px-2 border border-border rounded-lg bg-background text-xs font-semibold"
                  onChange={(e) => {
                    const cat = e.target.value;
                    const defaultReason =
                      cat === "Food & Mess Allowance"
                        ? "Food & Mess Allowance"
                        : cat === "Daily Cash Advance / Wage"
                        ? "Daily Cash Advance"
                        : cat === "Travel & Transport"
                        ? "Travel & Transport Allowance"
                        : cat === "Tools & Boots"
                        ? "Tools & Safety Boots"
                        : cat === "Medical & Emergency"
                        ? "Medical & Emergency Advance"
                        : "";
                    setBatchAmounts((prev) => {
                      const next = { ...prev };
                      Object.keys(next).forEach((k) => {
                        next[k] = { ...next[k], category: cat, reason: defaultReason };
                      });
                      return next;
                    });
                  }}
                >
                  <option value="Food & Mess Allowance">🍱 Food & Mess Allowance</option>
                  <option value="Daily Cash Advance / Wage">💵 Daily Cash Advance / Wage</option>
                  <option value="Travel & Transport">🚌 Travel & Transport</option>
                  <option value="Tools & Boots">🥾 Tools & Boots</option>
                  <option value="Medical & Emergency">🏥 Medical & Emergency</option>
                  <option value="Other Expense">⚡ Other Expense</option>
                </select>
                <input
                  type="number"
                  placeholder="₹ Amount"
                  className="w-24 h-8 px-2 border border-border rounded-lg bg-background text-xs font-semibold"
                  onChange={(e) => {
                    const val = e.target.value;
                    setBatchAmounts((prev) => {
                      const next = { ...prev };
                      Object.keys(next).forEach((k) => {
                        next[k] = { ...next[k], amount: val };
                      });
                      return next;
                    });
                  }}
                />
                <input
                  type="text"
                  placeholder="Reason / Note"
                  className="w-40 h-8 px-2 border border-border rounded-lg bg-background text-xs"
                  onChange={(e) => {
                    const val = e.target.value;
                    setBatchAmounts((prev) => {
                      const next = { ...prev };
                      Object.keys(next).forEach((k) => {
                        next[k] = { ...next[k], reason: val };
                      });
                      return next;
                    });
                  }}
                />
              </div>
            </div>

            {/* Worker Batch Table */}
            <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
              {workers.map((w) => {
                const wid = String(w.labourAttendanceId);
                const currentData = batchAmounts[wid] || {
                  amount: "200",
                  category: "Food & Mess Allowance",
                  reason: "Food & Mess Allowance",
                };
                const status = String(draft[wid]?.status ?? w.status ?? "Present");

                return (
                  <div
                    key={wid}
                    className="p-3 rounded-xl border border-border/70 bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-[140px]">
                      <div className="font-bold text-foreground">{String(w.name)}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>{String(w.type || "Skilled")}</span>
                        <span
                          className={`font-semibold ${
                            status === "Present"
                              ? "text-emerald-600"
                              : status === "Half Day"
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          ● {status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                      <select
                        value={currentData.category || "Food & Mess Allowance"}
                        onChange={(e) => {
                          const cat = e.target.value;
                          setBatchAmounts((prev) => ({
                            ...prev,
                            [wid]: { ...currentData, category: cat },
                          }));
                        }}
                        className="h-8 px-2 border border-border rounded-lg bg-background text-xs font-semibold"
                      >
                        <option value="Food & Mess Allowance">🍱 Food</option>
                        <option value="Daily Cash Advance / Wage">💵 Cash</option>
                        <option value="Travel & Transport">🚌 Travel</option>
                        <option value="Tools & Boots">🥾 Tools</option>
                        <option value="Medical & Emergency">🏥 Medical</option>
                        <option value="Other Expense">⚡ Other</option>
                      </select>

                      <input
                        type="number"
                        placeholder="₹ Amount"
                        value={currentData.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBatchAmounts((prev) => ({
                            ...prev,
                            [wid]: { ...currentData, amount: val },
                          }));
                        }}
                        className="w-24 h-8 px-2 border border-border rounded-lg bg-background font-bold text-xs"
                      />

                      <input
                        type="text"
                        placeholder="Reason / Note"
                        value={currentData.reason}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBatchAmounts((prev) => ({
                            ...prev,
                            [wid]: { ...currentData, reason: val },
                          }));
                        }}
                        className="w-36 h-8 px-2 border border-border rounded-lg bg-background text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="text-xs">
                <span className="font-bold text-foreground">Total Batch Disbursement:</span>{" "}
                <span className="font-black text-orange-600 text-sm">
                  ₹
                  {Object.values(batchAmounts)
                    .reduce((acc, v) => acc + (Number(v.amount) || 0), 0)
                    .toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={batchDisburse.isPending}
                  onClick={() => batchDisburse.mutate()}
                  className="h-9 px-5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 shadow-sm"
                >
                  <Zap className="size-3.5" />
                  {batchDisburse.isPending ? "Disbursing..." : "Disburse Batch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

