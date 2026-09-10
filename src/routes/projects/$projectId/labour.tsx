import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { PageHeader } from "../../../components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { toast } from "sonner";
import {
  UserPlus,
  Calendar,
  DollarSign,
  Moon,
  Clock,
  Printer,
  MinusCircle,
  Calculator,
  UserCheck,
  FileDown,
} from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/labour")({
  head: () => ({
    meta: [
      { title: "Labour Attendance & Payroll — Kinetic" },
      { name: "description", content: "Track daily labour attendance, work locations, night shifts, advance debits, and calculate month-end salaries." },
    ],
  }),
  component: LabourPage,
});

// Mock Initial Workforce Directory
const initialLabourers = [
  { id: "L1", name: "Suresh Kumar", type: "Skilled", rate: 800, bankName: "SBI", accNo: "30291048123" },
  { id: "L2", name: "Anil Jha", type: "Skilled", rate: 800, bankName: "HDFC", accNo: "50100481920" },
  { id: "L3", name: "Ram Pukaar", type: "Unskilled", rate: 500, bankName: "PNB", accNo: "11291048110" },
  { id: "L4", name: "Dinesh Prasad", type: "Unskilled", rate: 500, bankName: "SBI", accNo: "20391848123" },
  { id: "L5", name: "Raju Yadav", type: "Unskilled", rate: 500, bankName: "BoB", accNo: "44191028122" },
];

// Daily Attendance Records State Mock (For today)
const initialAttendance = [
  { labourId: "L1", name: "Suresh Kumar", status: "Present", project: "DLF Camellias", nightShift: true },
  { labourId: "L2", name: "Anil Jha", status: "Present", project: "DLF Camellias", nightShift: false },
  { labourId: "L3", name: "Ram Pukaar", status: "Present", project: "Prestige Lakeside", nightShift: false },
  { labourId: "L4", name: "Dinesh Prasad", status: "Absent", project: "—", nightShift: false },
  { labourId: "L5", name: "Raju Yadav", status: "Half Day", project: "Lodha World Towers", nightShift: false },
];

// Debits/Weekly Advances Tracker State Mock
const initialDebits = [
  { id: "D1", labourId: "L1", date: "2026-07-07", amount: 1500, desc: "Weekly advance for groceries" },
  { id: "D2", labourId: "L3", date: "2026-07-05", amount: 500, desc: "Boots safety deduction" },
  { id: "D3", labourId: "L5", date: "2026-07-06", amount: 1000, desc: "Cash advance for medical use" },
];

// Month totals simulation mapping (days present, night shifts, advances)
const initialMonthlyTotals = [
  { id: "L1", daysPresent: 24, nightShifts: 6, advanceDeductions: 3500 },
  { id: "L2", daysPresent: 22, nightShifts: 2, advanceDeductions: 1500 },
  { id: "L3", daysPresent: 25, nightShifts: 0, advanceDeductions: 500 },
  { id: "L4", daysPresent: 18, nightShifts: 0, advanceDeductions: 0 },
  { id: "L5", daysPresent: 20, nightShifts: 4, advanceDeductions: 1000 },
];

function LabourPage() {
  const [activeRole, setActiveRole] = React.useState<string>("admin");
  const [labourers, setLabourers] = React.useState(initialLabourers);
  const [attendance, setAttendance] = React.useState(initialAttendance);
  const [debits, setDebits] = React.useState(initialDebits);
  const [monthlyTotals, setMonthlyTotals] = React.useState(initialMonthlyTotals);

  // Form states - Add Worker
  const [newName, setNewName] = React.useState("");
  const [newType, setNewType] = React.useState<"Skilled" | "Unskilled">("Skilled");
  const [newRate, setNewRate] = React.useState("800");

  // Form states - Debit
  const [debitLabourId, setDebitLabourId] = React.useState("L1");
  const [debitAmount, setDebitAmount] = React.useState("");
  const [debitDesc, setDebitDesc] = React.useState("");

  React.useEffect(() => {
    const updateRole = () => {
      setActiveRole(localStorage.getItem("kinetic_active_role") || "admin");
    };
    updateRole();
    window.addEventListener("kinetic_role_changed", updateRole);
    return () => window.removeEventListener("kinetic_role_changed", updateRole);
  }, []);

  const isSupervisor = activeRole === "supervisor";

  const filteredAttendance = attendance.filter((att) => {
    if (isSupervisor) {
      return att.project === "DLF Camellias" || ["L1", "L2", "L4"].includes(att.labourId);
    }
    return true;
  });

  const filteredLabourers = labourers.filter((w) => {
    if (isSupervisor) {
      return ["L1", "L2", "L4"].includes(w.id);
    }
    return true;
  });

  // Attendance controls
  const handleStatusChange = (id: string, newStatus: string) => {
    setAttendance((prev) =>
      prev.map((att) => {
        if (att.labourId === id) {
          return {
            ...att,
            status: newStatus,
            project: newStatus === "Absent" ? "—" : att.project === "—" ? "DLF Camellias" : att.project,
          };
        }
        return att;
      })
    );
  };

  const handleLocationChange = (id: string, newProject: string) => {
    setAttendance((prev) =>
      prev.map((att) => (att.labourId === id ? { ...att, project: newProject } : att))
    );
  };

  const handleNightShiftToggle = (id: string) => {
    setAttendance((prev) =>
      prev.map((att) => (att.labourId === id ? { ...att, nightShift: !att.nightShift } : att))
    );
  };

  // Add Worker Submit
  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newRate) {
      toast.error("Please enter Name and Daily Rate.");
      return;
    }

    const nextId = "L" + (labourers.length + 1);
    const rateVal = parseInt(newRate);

    const newWorker = {
      id: nextId,
      name: newName,
      type: newType,
      rate: rateVal,
      bankName: "SBI",
      accNo: "301900" + Math.floor(Math.random() * 90000 + 10000),
    };

    setLabourers([...labourers, newWorker]);
    setAttendance([...attendance, { labourId: nextId, name: newName, status: "Present", project: "DLF Camellias", nightShift: false }]);
    setMonthlyTotals([...monthlyTotals, { id: nextId, daysPresent: 0, nightShifts: 0, advanceDeductions: 0 }]);

    setNewName("");
    toast.success(`Labourer ${newName} registered successfully!`);
  };

  // Add Debit Submit
  const handleAddDebit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitAmount || !debitDesc) {
      toast.error("Please enter Debit amount and description.");
      return;
    }
    const amt = parseInt(debitAmount);

    const newDebit = {
      id: "D" + (debits.length + 1),
      labourId: debitLabourId,
      date: new Date().toISOString().split("T")[0],
      amount: amt,
      desc: debitDesc,
    };

    setDebits([newDebit, ...debits]);

    // Update monthly totals advance subtraction
    setMonthlyTotals((prev) =>
      prev.map((tot) => (tot.id === debitLabourId ? { ...tot, advanceDeductions: tot.advanceDeductions + amt } : tot))
    );

    setDebitAmount("");
    setDebitDesc("");
    const w = labourers.find((x) => x.id === debitLabourId);
    toast.success(`Debited ₹${amt} from ${w?.name}'s payroll.`);
  };

  // Save Today's Attendance
  const handleSaveAttendance = () => {
    toast.success("Attendance Logs Saved!", {
      description: "Successfully updated daily roster, shift configurations, and active project works.",
    });

    // Update monthly totals dynamically (simulate adding today to their stats)
    setMonthlyTotals((prev) =>
      prev.map((tot) => {
        const att = attendance.find((a) => a.labourId === tot.id);
        if (!att) return tot;
        const addDay = att.status === "Present" ? 1 : att.status === "Half Day" ? 0.5 : 0;
        const addNight = att.nightShift ? 1 : 0;
        return {
          ...tot,
          daysPresent: tot.daysPresent + addDay,
          nightShifts: tot.nightShifts + addNight,
        };
      })
    );
  };

  // Print Payroll Receipt
  const handlePrintPayslip = (workerName: string, details: any) => {
    toast.info(`Generating Payslip for ${workerName}`, {
      description: `Earnings: ₹${details.gross.toLocaleString("en-IN")} | Debits: ₹${details.debits.toLocaleString("en-IN")} | Net: ₹${details.net.toLocaleString("en-IN")}`,
    });
  };

  // Generate Excel (CSV)
  const handleExportExcel = () => {
    const headers = ["Date", "Worker Name", "Category", "Status", "Location", "Night Shift", "Wage Amount (INR)"];
    const rows = filteredAttendance.map(att => {
      const w = labourers.find((x) => x.id === att.labourId);
      if (!w) return null;
      const mult = att.status === "Present" ? 1.0 : att.status === "Half Day" ? 0.5 : 0;
      const baseWage = w.rate * mult;
      const nightBonus = att.nightShift ? 300 : 0;
      const totalCost = baseWage + nightBonus;
      const date = new Date().toISOString().split("T")[0];
      return [
        date,
        w.name,
        w.type,
        att.status,
        att.project,
        att.nightShift ? "Yes" : "No",
        totalCost
      ].join(",");
    }).filter(Boolean);

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Labour_Attendance_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Excel report generated successfully!", {
      description: "Downloaded Labour_Attendance_Report.csv"
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <PageHeader 
          eyebrow={isSupervisor ? "Site Workforce" : "Workforce"} 
          title={isSupervisor ? "Daily Site Attendance" : "Labour & Payroll Ledger"} 
          actions={
            <div className="flex gap-2">
              {isSupervisor ? (
                <div className="text-xs bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 font-mono text-primary font-semibold">
                  Site: DLF Camellias (Amit Mishra)
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

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              {isSupervisor ? "Site Workers Present" : "Active Workers Today"}
            </CardTitle>
            <UserCheck className="size-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">
              {filteredAttendance.filter((a) => a.status !== "Absent").length} / {filteredLabourers.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {filteredAttendance.filter((a) => a.nightShift).length} scheduled on Night Shifts
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              {isSupervisor ? "Today's Site Wages" : "Cumulative Daily Wages"}
            </CardTitle>
            <DollarSign className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">
              ₹
              {filteredAttendance
                .reduce((sum, att) => {
                  if (att.status === "Absent") return sum;
                  const w = labourers.find((x) => x.id === att.labourId);
                  if (!w) return sum;
                  const mult = att.status === "Half Day" ? 0.5 : 1.0;
                  const base = w.rate * mult;
                  const night = att.nightShift ? 300 : 0; // Flat ₹300 night bonus
                  return sum + base + night;
                }, 0)
                .toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isSupervisor ? "Estimated site charge for today" : "Estimated payroll charge for today"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              {isSupervisor ? "Active Advances" : "Deductions / Advances"}
            </CardTitle>
            <MinusCircle className="size-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">
              ₹{debits
                .filter((d) => !isSupervisor || ["L1", "L2", "L4"].includes(d.labourId))
                .reduce((sum, d) => sum + d.amount, 0)
                .toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isSupervisor ? "Deductions for workers at this site" : "Debited grocery/cash advances this week"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Layout: Daily Attendance ── */}
      <div className="bg-[color:var(--surface)] border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-secondary/10 flex justify-between items-center">
          <div>
            <h3 className="font-display font-semibold text-sm">
              {isSupervisor ? "Project Attendance Marking" : "Daily Attendance Registry"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSupervisor 
                ? "Mark daily check-in status and night shifts for workers on your project site." 
                : "Set workforce status, work site locations, and toggle night shifts for today."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 border border-border bg-background text-foreground text-xs font-medium rounded hover:bg-secondary transition-colors"
            >
              <FileDown className="size-3.5" /> Export Excel
            </button>
            {isSupervisor && (
              <button
                onClick={handleSaveAttendance}
                className="px-4 py-2 bg-foreground text-background text-xs font-medium rounded hover:bg-zinc-800 transition-colors"
              >
                Save Attendance
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/40 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-3 font-medium">Worker Name</th>
                <th className="px-6 py-3 font-medium">Category / Wage</th>
                <th className="px-6 py-3 font-medium">Daily Status</th>
                <th className="px-6 py-3 font-medium">Location of Work</th>
                <th className="px-6 py-3 font-medium">Night Work Shift</th>
                <th className="px-6 py-3 text-right">Computed Cost</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-border">
              {filteredAttendance.map((att) => {
                const w = labourers.find((x) => x.id === att.labourId);
                if (!w) return null;

                // Wage Math
                const mult = att.status === "Present" ? 1.0 : att.status === "Half Day" ? 0.5 : 0;
                const baseWage = w.rate * mult;
                const nightBonus = att.nightShift ? 300 : 0; // ₹300 bonus
                const totalCost = baseWage + nightBonus;

                return (
                  <tr key={att.labourId} className="hover:bg-secondary/15 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-sm">{w.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">ID: {w.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium font-mono ${
                        w.type === "Skilled" ? "bg-accent/10 text-accent" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {w.type}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">₹{w.rate}/day</p>
                    </td>
                    <td className="px-6 py-4">
                      {isSupervisor ? (
                        <div className="flex gap-1.5">
                          {["Present", "Half Day", "Absent"].map((st) => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(att.labourId, st)}
                              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                                att.status === st
                                  ? st === "Present"
                                    ? "bg-accent text-accent-foreground"
                                    : st === "Half Day"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-destructive text-destructive-foreground"
                                  : "bg-secondary text-muted-foreground hover:bg-secondary-foreground/10"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-semibold ${
                          att.status === "Present" 
                            ? "bg-emerald-500/10 text-emerald-600" 
                            : att.status === "Half Day" 
                            ? "bg-yellow-500/10 text-yellow-600" 
                            : "bg-red-500/10 text-red-600"
                        }`}>
                          {att.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {att.status === "Absent" ? (
                        <span className="text-muted-foreground italic">Off Work</span>
                      ) : isSupervisor ? (
                        <select
                          value={att.project}
                          onChange={(e) => handleLocationChange(att.labourId, e.target.value)}
                          className="p-1 border border-border rounded bg-background"
                        >
                          <option value="DLF Camellias">DLF Camellias</option>
                          <option value="Prestige Lakeside">Prestige Lakeside</option>
                          <option value="Lodha World Towers">Lodha World Towers</option>
                          <option value="Brigade Cornerstone">Brigade Cornerstone</option>
                          <option value="Godrej Reflections">Godrej Reflections</option>
                          <option value="Sobha City Phase IV">Sobha City Phase IV</option>
                        </select>
                      ) : (
                        <span className="font-medium text-foreground">{att.project}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isSupervisor ? (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={att.status === "Absent"}
                            checked={att.nightShift}
                            onChange={() => handleNightShiftToggle(att.labourId)}
                            className="size-4 accent-primary rounded border-border"
                          />
                          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <Moon className="size-3 text-primary" /> Night Duty (+₹300)
                          </span>
                        </label>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                          {att.nightShift ? (
                            <>
                              <Moon className="size-3.5 text-primary" /> Night Shift (+₹300)
                            </>
                          ) : (
                            "☀️ Day Shift"
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">
                      ₹{totalCost.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Forms (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Form: Add Worker (Supervisor only) */}
          {isSupervisor && (
            <Card className="border border-border bg-[color:var(--surface)] shadow-sm">
              <CardHeader>
                <CardTitle className="font-display font-semibold text-base flex items-center gap-2">
                  <UserPlus className="size-4 text-accent" /> Register New Labourer
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Add skilled or unskilled labour to the daily registry roster.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddWorker} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-medium text-muted-foreground">Labourer Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Pujari"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-medium text-muted-foreground">Category</label>
                      <select
                        value={newType}
                        onChange={(e) => {
                          const val = e.target.value as "Skilled" | "Unskilled";
                          setNewType(val);
                          setNewRate(val === "Skilled" ? "800" : "500");
                        }}
                        className="w-full p-2 bg-background border border-border rounded-md"
                      >
                        <option value="Skilled">Skilled (Mason / MEP)</option>
                        <option value="Unskilled">Unskilled (Helper)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-medium text-muted-foreground">Daily Wage (₹)</label>
                      <input
                        type="number"
                        placeholder="Daily rate"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        className="w-full p-2 bg-background border border-border rounded-md font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-foreground text-background font-semibold rounded hover:bg-zinc-800 transition-colors mt-2"
                  >
                    Register Worker
                  </button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Form: Deductions / Debits (Admin & Supervisor) */}
          <Card className="border border-border bg-[color:var(--surface)] shadow-sm">
            <CardHeader>
              <CardTitle className="font-display font-semibold text-base flex items-center gap-2">
                <MinusCircle className="size-4 text-primary" /> Log Weekly Expense Debit
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Subtract mess, boots, cash advances, or materials personal debits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddDebit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Deduct From Worker</label>
                  <select
                    value={debitLabourId}
                    onChange={(e) => setDebitLabourId(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md"
                  >
                    {(isSupervisor ? filteredLabourers : labourers).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Debit Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="Deduction amount"
                    value={debitAmount}
                    onChange={(e) => setDebitAmount(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Reason / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Mess advances / Boots supply"
                    value={debitDesc}
                    onChange={(e) => setDebitDesc(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-foreground text-background font-semibold rounded hover:bg-zinc-800 transition-colors mt-2"
                >
                  Apply Debit
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Month Settlement Calculations (7 cols) */}
        <Card className="lg:col-span-7 border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="border-b border-border bg-secondary/15">
            <CardTitle className="font-display font-semibold text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="size-4 text-accent" /> Month-End Payroll Calculations
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">SETTLEMENT LEDGER</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Auto-calculates gross wages (including night shifts) minus weekly advances.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {filteredLabourers.map((w) => {
              const totals = monthlyTotals.find((t) => t.id === w.id) || { daysPresent: 0, nightShifts: 0, advanceDeductions: 0 };
              
              // Math formulas
              const grossSalary = (totals.daysPresent * w.rate) + (totals.nightShifts * 300);
              const netPayout = Math.max(0, grossSalary - totals.advanceDeductions);

              return (
                <div key={w.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-secondary/10 transition-colors">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground flex items-baseline gap-2">
                      {w.name}
                      <span className="text-[10px] font-mono text-muted-foreground font-normal uppercase">
                        ({w.type} · ₹{w.rate}/d)
                      </span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      Bank Acc: {w.bankName} ({w.accNo})
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono text-muted-foreground">
                      <div>
                        <span>Present Days</span>
                        <p className="font-semibold text-foreground font-sans mt-0.5">{totals.daysPresent} days</p>
                      </div>
                      <div>
                        <span>Night Shifts</span>
                        <p className="font-semibold text-foreground font-sans mt-0.5">{totals.nightShifts} shifts</p>
                      </div>
                      <div>
                        <span>Advance Debits</span>
                        <p className="font-semibold text-destructive font-sans mt-0.5">
                          -₹{totals.advanceDeductions.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-border pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[9px] font-mono text-muted-foreground uppercase block">NET MONTH PAYOUT</span>
                      <strong className="text-base font-mono font-bold text-accent">
                        ₹{netPayout.toLocaleString("en-IN")}
                      </strong>
                      <span className="text-[9px] text-muted-foreground block font-mono">Gross: ₹{grossSalary}</span>
                    </div>

                    <button
                      onClick={() => handlePrintPayslip(w.name, { gross: grossSalary, debits: totals.advanceDeductions, net: netPayout })}
                      className="size-8 grid place-items-center border border-border hover:bg-secondary rounded transition-colors text-muted-foreground hover:text-foreground"
                      title="Print Payslip Summary"
                    >
                      <Printer className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
