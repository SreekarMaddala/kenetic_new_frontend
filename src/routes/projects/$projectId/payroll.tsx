import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DollarSign, Plus, FileDown, X, CheckCircle2, Clock, AlertTriangle, Users, Printer } from "lucide-react";
import { exportToExcel } from "../../../lib/excel";

export const Route = createFileRoute("/projects/$projectId/payroll")({
  head: () => ({
    meta: [
      { title: "Staff Payroll — Kinetic" },
      { name: "description", content: "Monthly staff payroll processing, salary slips, PF/ESI deductions, and payment status." },
    ],
  }),
  component: PayrollPage,
});

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

type PayStatus = "Paid" | "Pending" | "On Hold";

interface StaffMember {
  id: string; empId: string; name: string; designation: string;
  department: string; basic: number; hra: number; conveyance: number;
  medical: number; pf: number; esi: number; tds: number;
  payStatus: PayStatus; bankName: string; accountNo: string;
  joiningDate: string; site: string;
}

const STAFF: StaffMember[] = [
  { id: "S1",  empId: "EMP-001", name: "Vikas Kulkarni",   designation: "Sr. Project Manager",  department: "Management", basic: 85000, hra: 34000, conveyance: 1600, medical: 1250, pf: 10200, esi: 0,    tds: 8500, payStatus: "Paid",    bankName: "HDFC Bank",   accountNo: "××××1234", joiningDate: "Apr 2020", site: "Head Office" },
  { id: "S2",  empId: "EMP-002", name: "Rajesh Kumar",     designation: "Project Manager",       department: "Management", basic: 65000, hra: 26000, conveyance: 1600, medical: 1250, pf: 7800,  esi: 0,    tds: 5500, payStatus: "Paid",    bankName: "SBI",         accountNo: "××××5678", joiningDate: "Jun 2021", site: "DLF Camellias" },
  { id: "S3",  empId: "EMP-003", name: "Anita Sharma",     designation: "Site Engineer",         department: "Engineering",basic: 42000, hra: 16800, conveyance: 1600, medical: 1250, pf: 5040,  esi: 0,    tds: 2800, payStatus: "Paid",    bankName: "Axis Bank",   accountNo: "××××9012", joiningDate: "Jan 2022", site: "Prestige Lakeside" },
  { id: "S4",  empId: "EMP-004", name: "Suresh Nair",      designation: "Civil Engineer",        department: "Engineering",basic: 38000, hra: 15200, conveyance: 1600, medical: 1250, pf: 4560,  esi: 0,    tds: 2200, payStatus: "Pending", bankName: "ICICI Bank",  accountNo: "××××3456", joiningDate: "Mar 2023", site: "Lodha World Towers" },
  { id: "S5",  empId: "EMP-005", name: "Deepak Joshi",     designation: "Sr. Accountant",        department: "Finance",    basic: 48000, hra: 19200, conveyance: 1600, medical: 1250, pf: 5760,  esi: 0,    tds: 3200, payStatus: "Paid",    bankName: "HDFC Bank",   accountNo: "××××7890", joiningDate: "Sep 2021", site: "Head Office" },
  { id: "S6",  empId: "EMP-006", name: "Kavitha Reddy",    designation: "HR Executive",          department: "HR",         basic: 32000, hra: 12800, conveyance: 1600, medical: 1250, pf: 3840,  esi: 756,  tds: 0,    payStatus: "Paid",    bankName: "SBI",         accountNo: "××××2345", joiningDate: "Nov 2022", site: "Head Office" },
  { id: "S7",  empId: "EMP-007", name: "Mohammed Azhar",   designation: "Safety Officer",        department: "Safety",     basic: 36000, hra: 14400, conveyance: 1600, medical: 1250, pf: 4320,  esi: 851,  tds: 0,    payStatus: "Paid",    bankName: "PNB",         accountNo: "××××6789", joiningDate: "Jul 2022", site: "DLF Camellias" },
  { id: "S8",  empId: "EMP-008", name: "Preethi Menon",    designation: "Document Controller",   department: "Admin",      basic: 28000, hra: 11200, conveyance: 1600, medical: 1250, pf: 3360,  esi: 661,  tds: 0,    payStatus: "Pending", bankName: "Kotak Bank",  accountNo: "××××0123", joiningDate: "Feb 2024", site: "Head Office" },
  { id: "S9",  empId: "EMP-009", name: "Ravi Teja",        designation: "Quantity Surveyor",     department: "Engineering",basic: 52000, hra: 20800, conveyance: 1600, medical: 1250, pf: 6240,  esi: 0,    tds: 3800, payStatus: "On Hold", bankName: "HDFC Bank",   accountNo: "××××4567", joiningDate: "May 2022", site: "Brigade Cornerstone" },
  { id: "S10", empId: "EMP-010", name: "Lakshmi Devi",     designation: "Site Admin",            department: "Admin",      basic: 25000, hra: 10000, conveyance: 1600, medical: 1250, pf: 3000,  esi: 590,  tds: 0,    payStatus: "Paid",    bankName: "SBI",         accountNo: "××××8901", joiningDate: "Oct 2023", site: "Lodha World Towers" },
  { id: "S11", empId: "LAB-001", name: "Raju Yadav",       designation: "Skilled Labour",        department: "Labour",     basic: 15000, hra: 5000,  conveyance: 0,    medical: 0,    pf: 0,     esi: 0,    tds: 0,    payStatus: "Paid",    bankName: "BoB",         accountNo: "××××1122", joiningDate: "Jan 2025", site: "DLF Camellias" },
  { id: "S12", empId: "LAB-002", name: "Dinesh Prasad",    designation: "Unskilled Labour",      department: "Labour",     basic: 12000, hra: 3000,  conveyance: 0,    medical: 0,    pf: 0,     esi: 0,    tds: 0,    payStatus: "Pending", bankName: "SBI",         accountNo: "××××3344", joiningDate: "Feb 2025", site: "DLF Camellias" },
];

const MONTHS = ["July 2026", "June 2026", "May 2026", "April 2026", "March 2026"];

function getGross(s: StaffMember) { return s.basic + s.hra + s.conveyance + s.medical; }
function getDeductions(s: StaffMember) { return s.pf + s.esi + s.tds; }
function getNet(s: StaffMember) { return getGross(s) - getDeductions(s); }

const PAY_STATUS_STYLE: Record<PayStatus, { color: string }> = {
  Paid:     { color: "hsl(158,64%,42%)" },
  Pending:  { color: "hsl(40,90%,52%)" },
  "On Hold": { color: "hsl(0,72%,55%)" },
};

function PayrollPage() {
  const [activeRole, setActiveRole] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kinetic_active_role") || "admin";
    }
    return "admin";
  });

  useEffect(() => {
    const handleRoleChange = () => {
      setActiveRole(localStorage.getItem("kinetic_active_role") || "admin");
    };
    window.addEventListener("kinetic_role_changed", handleRoleChange);
    return () => window.removeEventListener("kinetic_role_changed", handleRoleChange);
  }, []);

  const [month, setMonth] = useState("July 2026");
  const [tab, setTab] = useState<"payroll" | "slips">("payroll");
  const [selectedEmp, setSelectedEmp] = useState<StaffMember | null>(null);
  const [filterDept, setFilterDept] = useState("All");

  const isSupervisor = activeRole === "supervisor";
  const roleStaff = STAFF.filter(s => isSupervisor ? s.department === "Labour" : true);

  const departments = ["All", ...new Set(roleStaff.map(s => s.department))];
  const filtered = roleStaff.filter(s => filterDept === "All" || s.department === filterDept);

  const totalGross = roleStaff.reduce((sum, s) => sum + getGross(s), 0);
  const totalDeductions = roleStaff.reduce((sum, s) => sum + getDeductions(s), 0);
  const totalNet = roleStaff.reduce((sum, s) => sum + getNet(s), 0);
  const totalPf = roleStaff.reduce((sum, s) => sum + s.pf, 0);

  const handleExport = () => {
    exportToExcel(
      filtered.map(s => ({
        "Emp ID": s.empId, "Name": s.name, "Designation": s.designation,
        "Department": s.department, "Basic (₹)": s.basic, "HRA (₹)": s.hra,
        "Conveyance (₹)": s.conveyance, "Medical (₹)": s.medical,
        "Gross (₹)": getGross(s), "PF (₹)": s.pf, "ESI (₹)": s.esi,
        "TDS (₹)": s.tds, "Total Deductions (₹)": getDeductions(s),
        "Net Pay (₹)": getNet(s), "Status": s.payStatus, "Bank": s.bankName,
      })),
      `Kinetic_Payroll_${month.replace(" ", "_")}`,
      undefined, `Staff Payroll — ${month}`
    );
    toast.success("Payroll exported to Excel");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader eyebrow={isSupervisor ? "Site Work" : "Finance"} title={isSupervisor ? "Labour Payroll" : "Staff Payroll"}
        actions={
          <div className="flex gap-3">
            <select className="h-10 px-3 text-sm border border-border rounded-lg bg-[color:var(--surface)]" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
            <button onClick={handleExport} className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary flex items-center gap-2">
              <FileDown className="size-4" /> Export Excel
            </button>
            <button onClick={() => toast.success("Payroll run initiated for " + month)} className="h-10 px-5 bg-foreground text-background rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2">
              <DollarSign className="size-4" /> Run Payroll
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Gross Salary", value: fmt(totalGross), color: "hsl(210,80%,58%)" },
          { label: "Total Deductions",   value: fmt(totalDeductions), color: "hsl(0,72%,55%)" },
          { label: "Net Disbursement",   value: fmt(totalNet), color: "hsl(158,64%,42%)" },
          { label: "PF Contribution",    value: fmt(totalPf * 2), color: "hsl(280,65%,60%)", sub: "(Emp + Employer)" },
        ].map((k, i) => (
          <div key={k.label} className="bg-[color:var(--surface)] border border-border rounded-xl p-5 animate-fade-up" style={{ animationDelay: `${i*60}ms` }}>
            <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: k.color }}>{k.value}</div>
            {(k as any).sub && <div className="text-xs text-muted-foreground mt-1">{(k as any).sub}</div>}
          </div>
        ))}
      </div>

      {/* Status summary */}
      <div className="flex gap-4 mb-6">
        {(["Paid","Pending","On Hold"] as PayStatus[]).map((s) => {
          const count = roleStaff.filter(e => e.payStatus === s).length;
          const amt = roleStaff.filter(e => e.payStatus === s).reduce((sum, e) => sum + getNet(e), 0);
          return (
            <div key={s} className="bg-[color:var(--surface)] border border-border rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="size-2 rounded-full" style={{ background: PAY_STATUS_STYLE[s].color }} />
              <div>
                <div className="text-sm font-bold" style={{ color: PAY_STATUS_STYLE[s].color }}>{s}: {count} employees</div>
                <div className="text-xs text-muted-foreground">{fmt(amt)} net pay</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 mb-6 w-fit">
        {(["payroll","slips"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab===t?"bg-[color:var(--surface)] shadow-sm text-foreground":"text-muted-foreground hover:text-foreground"}`}>
            {t === "payroll" ? "Payroll Register" : "Salary Slips"}
          </button>
        ))}
      </div>

      {tab === "payroll" && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {departments.map(d => (
              <button key={d} onClick={() => setFilterDept(d)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterDept===d?"bg-primary/10 border-primary/30 text-primary":"border-border text-muted-foreground hover:text-foreground bg-[color:var(--surface)]"}`}>{d}</button>
            ))}
          </div>
          <div className="bg-[color:var(--surface)] border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Employee</th>
                    <th className="text-right px-4 py-3">Basic</th><th className="text-right px-4 py-3">HRA</th>
                    <th className="text-right px-4 py-3">Gross</th>
                    <th className="text-right px-4 py-3">PF</th><th className="text-right px-4 py-3">ESI</th><th className="text-right px-4 py-3">TDS</th>
                    <th className="text-right px-4 py-3">Net Pay</th>
                    <th className="text-center px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      <td className="px-5 py-4">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.empId} · {s.designation}</div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm">{fmt(s.basic)}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm">{fmt(s.hra)}</td>
                      <td className="px-4 py-4 text-right font-bold">{fmt(getGross(s))}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-red-500">-{fmt(s.pf)}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-red-500">{s.esi > 0 ? "-" + fmt(s.esi) : "—"}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-red-500">{s.tds > 0 ? "-" + fmt(s.tds) : "—"}</td>
                      <td className="px-4 py-4 text-right font-bold text-primary">{fmt(getNet(s))}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ color: PAY_STATUS_STYLE[s.payStatus].color, background: `${PAY_STATUS_STYLE[s.payStatus].color}18`, border: `1px solid ${PAY_STATUS_STYLE[s.payStatus].color}30` }}>{s.payStatus}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary/5 border-t-2 border-primary/30">
                    <td className="px-5 py-4 font-bold">TOTAL ({filtered.length} staff)</td>
                    <td className="px-4 py-4 text-right font-bold">{fmt(filtered.reduce((s,e)=>s+e.basic,0))}</td>
                    <td className="px-4 py-4 text-right font-bold">{fmt(filtered.reduce((s,e)=>s+e.hra,0))}</td>
                    <td className="px-4 py-4 text-right font-bold">{fmt(filtered.reduce((s,e)=>s+getGross(e),0))}</td>
                    <td className="px-4 py-4 text-right font-bold text-red-500">{fmt(filtered.reduce((s,e)=>s+e.pf,0))}</td>
                    <td className="px-4 py-4 text-right font-bold text-red-500">{fmt(filtered.reduce((s,e)=>s+e.esi,0))}</td>
                    <td className="px-4 py-4 text-right font-bold text-red-500">{fmt(filtered.reduce((s,e)=>s+e.tds,0))}</td>
                    <td className="px-4 py-4 text-right font-bold text-primary">{fmt(filtered.reduce((s,e)=>s+getNet(e),0))}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "slips" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {roleStaff.map((s) => (
            <div key={s.id} className="bg-[color:var(--surface)] border border-border rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.empId} · {s.designation}</div>
                  <div className="text-xs text-muted-foreground">{s.department}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0" style={{ color: PAY_STATUS_STYLE[s.payStatus].color, background: `${PAY_STATUS_STYLE[s.payStatus].color}18`, border: `1px solid ${PAY_STATUS_STYLE[s.payStatus].color}30` }}>{s.payStatus}</span>
              </div>
              <div className="space-y-1.5 text-xs mb-4">
                <div className="flex justify-between text-muted-foreground"><span>Gross Salary</span><span className="text-foreground font-semibold">{fmt(getGross(s))}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>PF + ESI + TDS</span><span className="text-red-500 font-semibold">-{fmt(getDeductions(s))}</span></div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-border"><span>Net Pay</span><span className="text-primary">{fmt(getNet(s))}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { exportToExcel([{ "Month": month, "Emp ID": s.empId, "Name": s.name, "Designation": s.designation, "Basic": s.basic, "HRA": s.hra, "Conveyance": s.conveyance, "Medical": s.medical, "Gross": getGross(s), "PF": s.pf, "ESI": s.esi, "TDS": s.tds, "Net Pay": getNet(s) }], `SalarySlip_${s.empId}_${month.replace(" ","_")}`, undefined, `Salary Slip — ${s.name} — ${month}`); toast.success("Salary slip exported"); }} className="flex-1 h-8 text-xs border border-border rounded-lg hover:bg-secondary flex items-center justify-center gap-1.5">
                  <FileDown className="size-3" /> Excel Slip
                </button>
                {s.payStatus === "Pending" && <button onClick={() => toast.success(`Payment processed for ${s.name}`)} className="flex-1 h-8 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5"><DollarSign className="size-3" /> Pay Now</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
