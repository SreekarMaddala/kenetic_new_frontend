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

  // Local state for logging weekly debit
  const [debitWorkerId, setDebitWorkerId] = useState("");
  const [debitAmount, setDebitAmount] = useState("");
  const [debitReason, setDebitReason] = useState("");

  // Register Worker Mutation
  const registerWorker = useMutation({
    mutationFn: async () => {
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

  // Log Debit Mutation
  const logDebit = useMutation({
    mutationFn: async () => {
      if (!debitWorkerId || !debitAmount || Number(debitAmount) <= 0 || !debitReason.trim()) {
        throw new Error("Please select a worker, enter a valid debit amount and reason.");
      }
      await api.post("/supervisor/labour/attendance", {
        projectId,
        date: day,
        operation: "debit",
        labourAttendanceId: debitWorkerId,
        amount: Number(debitAmount),
        description: debitReason.trim(),
      });
    },
    onSuccess: () => {
      setDebitAmount("");
      setDebitReason("");
      qc.invalidateQueries({ queryKey: ["labour", projectId] });
      toast.success("Debit logged successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Save Attendance Mutation
  const saveAttendance = useMutation({
    mutationFn: async () => {
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
      `Daily Site Attendance — ${project?.name || "DLF Camellias"}`
    );
  };

  const projectName = String(project?.name || "DLF Camellias");
  const supervisorName = String(user?.name || user?.email?.split("@")[0] || "Amit Mishra");

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
              {presentCount} / {totalWorkers || 3}
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
              className="h-9 px-4 bg-foreground text-background font-semibold text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
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
            className="w-full h-9 mt-4 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {registerWorker.isPending ? "Registering..." : "Register Worker"}
          </button>
        </div>

        {/* Card 2: Log Weekly Expense Debit */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <MinusCircle className="size-4 text-rose-500" /> Log Weekly Expense Debit
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Add food, mess, travel, cash advances, or materials personal debits.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Select From Worker
                </label>
                <select
                  value={debitWorkerId}
                  onChange={(e) => setDebitWorkerId(e.target.value)}
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
                  Debit Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={debitAmount}
                  onChange={(e) => setDebitAmount(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Reason / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mess advances / Boots supply"
                  value={debitReason}
                  onChange={(e) => setDebitReason(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => logDebit.mutate()}
            disabled={logDebit.isPending}
            className="w-full h-9 mt-4 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {logDebit.isPending ? "Applying..." : "Apply Debit"}
          </button>
        </div>

        {/* Card 3: Month-End Payroll Calculations */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <Calculator className="size-4 text-emerald-600" /> Month-End Payroll Calculations
              </h4>
              <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                SETTLEMENT LEDGER
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-calculates gross wages (including night shifts) minus weekly advances.
            </p>

            <div className="space-y-3 mt-4 max-h-60 overflow-y-auto pr-1">
              {workers.map((w) => {
                const daysP = Number(w.daysPresent ?? 20);
                const nightS = Number(w.nightShifts ?? 2);
                const rate = Number(w.rate ?? 800);
                const gross = daysP * rate + nightS * 500;
                const debits = Number(w.advanceDeductions ?? 0);
                const net = Math.max(0, gross - debits);

                return (
                  <div
                    key={String(w.labourAttendanceId)}
                    className="p-3 rounded-lg border border-border/60 bg-background/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-foreground">{String(w.name)}</div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">
                          NET MONTH PAYOUT
                        </div>
                        <div className="text-xs font-bold text-emerald-600">
                          ₹{net.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          Gross: ₹{gross.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground">
                      Bank Acc: {String(w.bankName || "SBI")} ({String(w.accNo || "30294958192")})
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] border-t border-border/40">
                      <div>
                        <span className="text-muted-foreground">Present Days:</span>{" "}
                        <span className="font-semibold text-foreground">{daysP} days</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Night Shifts:</span>{" "}
                        <span className="font-semibold text-foreground">{nightS} shifts</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Advance Debits:</span>{" "}
                        <span className="font-semibold text-rose-600">
                          -₹{debits.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

