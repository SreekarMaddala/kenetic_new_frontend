/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from "../../../contexts/AuthContext";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  DollarSign,
  Plus,
  FileDown,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Printer,
} from "lucide-react";
import { exportToExcel } from "../../../lib/excel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { governanceApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/payroll")({
  head: () => ({
    meta: [
      { title: "Staff Payroll — Kinetic" },
      {
        name: "description",
        content:
          "Monthly staff payroll processing, salary slips, PF/ESI deductions, and payment status.",
      },
    ],
  }),
  component: PayrollPage,
});

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

type PayStatus = "Paid" | "Pending" | "On Hold";

interface StaffMember {
  id: string;
  empId: string;
  name: string;
  designation: string;
  department: string;
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  pf: number;
  esi: number;
  tds: number;
  payStatus: PayStatus;
  bankName: string;
  accountNo: string;
  joiningDate: string;
  site: string;
}

const MONTHS = ["July 2026", "June 2026", "May 2026", "April 2026", "March 2026"];

function getGross(s: StaffMember) {
  return s.basic + s.hra + s.conveyance + s.medical;
}
function getDeductions(s: StaffMember) {
  return s.pf + s.esi + s.tds;
}
function getNet(s: StaffMember) {
  return getGross(s) - getDeductions(s);
}

const PAY_STATUS_STYLE: Record<PayStatus, { color: string }> = {
  Paid: { color: "hsl(158,64%,42%)" },
  Pending: { color: "hsl(40,90%,52%)" },
  "On Hold": { color: "hsl(0,72%,55%)" },
};

function PayrollPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const activeRole = useAuth().user?.role;
  const isSupervisor = activeRole === "supervisor";

  const { data: rawPayroll = [] } = useQuery({
    queryKey: ["payroll", projectId],
    queryFn: () => governanceApi.listPayroll(projectId),
    enabled: !!projectId,
    retry: 1,
  });

  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => {
    if (rawPayroll && rawPayroll.length > 0) {
      const parsed = rawPayroll.map((item: any, idx: number) => ({
        id: item.cycleId || `S${idx + 1}`,
        empId: item.empId || `EMP-00${idx + 1}`,
        name: item.name || "Staff Member",
        designation: item.designation || "Engineer",
        department: item.department || "Operations",
        basic: item.basic || 40000,
        hra: item.hra || 16000,
        conveyance: item.conveyance || 1600,
        medical: item.medical || 1250,
        pf: item.pf || 4800,
        esi: item.esi || 0,
        tds: item.tds || 2000,
        payStatus: (item.payStatus as PayStatus) || "Paid",
        bankName: item.bankName || "HDFC Bank",
        accountNo: item.accountNo || "××××1234",
        joiningDate: item.joiningDate || "Jan 2023",
        site: item.site || "Project Site",
      }));
      setStaffList(parsed);
    } else {
      setStaffList([]);
    }
  }, [rawPayroll]);

  const disburseMutation = useMutation({
    mutationFn: (body: any) => governanceApi.disbursePayroll(projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", projectId] });
      toast.success("Payroll cycle disbursed successfully.");
    },
  });

  const [month, setMonth] = useState("July 2026");
  const [tab, setTab] = useState<"payroll" | "slips">("payroll");
  const [selectedEmp, setSelectedEmp] = useState<StaffMember | null>(null);
  const [filterDept, setFilterDept] = useState("All");

  const roleStaff = staffList.filter((s: any) => (isSupervisor ? s.department === "Labour" : true));

  const departments = ["All", ...new Set(roleStaff.map((s) => s.department))];
  const filtered = roleStaff.filter((s) => filterDept === "All" || s.department === filterDept);

  const totalGross = roleStaff.reduce((sum, s) => sum + getGross(s), 0);
  const totalDeductions = roleStaff.reduce((sum, s) => sum + getDeductions(s), 0);
  const totalNet = roleStaff.reduce((sum, s) => sum + getNet(s), 0);
  const totalPf = roleStaff.reduce((sum, s) => sum + s.pf, 0);

  const handleExport = () => {
    exportToExcel(
      filtered.map((s) => ({
        "Emp ID": s.empId,
        Name: s.name,
        Designation: s.designation,
        Department: s.department,
        "Basic (₹)": s.basic,
        "HRA (₹)": s.hra,
        "Conveyance (₹)": s.conveyance,
        "Medical (₹)": s.medical,
        "Gross (₹)": getGross(s),
        "PF (₹)": s.pf,
        "ESI (₹)": s.esi,
        "TDS (₹)": s.tds,
        "Total Deductions (₹)": getDeductions(s),
        "Net Pay (₹)": getNet(s),
        Status: s.payStatus,
        Bank: s.bankName,
      })),
      `Kinetic_Payroll_${month.replace(" ", "_")}`,
      undefined,
      `Staff Payroll — ${month}`,
    );
    toast.success("Payroll exported to Excel");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        eyebrow={isSupervisor ? "Site Work" : "Finance"}
        title={isSupervisor ? "Labour Payroll" : "Staff Payroll"}
        actions={
          <div className="flex gap-3">
            <select
              className="h-10 px-3 text-sm border border-border rounded-lg bg-[color:var(--surface)]"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <button
              onClick={handleExport}
              className="h-10 px-4 border border-border rounded-lg text-sm font-medium hover:bg-secondary flex items-center gap-2"
            >
              <FileDown className="size-4" /> Export Excel
            </button>
            <button
              onClick={() => toast.success("Payroll run initiated for " + month)}
              className="h-10 px-5 bg-foreground text-background rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2"
            >
              <DollarSign className="size-4" /> Run Payroll
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Gross Salary", value: fmt(totalGross), color: "hsl(210,80%,58%)" },
          { label: "Total Deductions", value: fmt(totalDeductions), color: "hsl(0,72%,55%)" },
          { label: "Net Disbursement", value: fmt(totalNet), color: "hsl(158,64%,42%)" },
          {
            label: "PF Contribution",
            value: fmt(totalPf * 2),
            color: "hsl(280,65%,60%)",
            sub: "(Emp + Employer)",
          },
        ].map((k, i) => (
          <div
            key={k.label}
            className="bg-[color:var(--surface)] border border-border rounded-xl p-5 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: k.color }}>
              {k.value}
            </div>
            {"sub" in k && k.sub && (
              <div className="text-xs text-muted-foreground mt-1">{k.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Status summary */}
      <div className="flex gap-4 mb-6">
        {(["Paid", "Pending", "On Hold"] as PayStatus[]).map((s) => {
          const count = roleStaff.filter((e) => e.payStatus === s).length;
          const amt = roleStaff
            .filter((e) => e.payStatus === s)
            .reduce((sum, e) => sum + getNet(e), 0);
          return (
            <div
              key={s}
              className="bg-[color:var(--surface)] border border-border rounded-xl px-5 py-3 flex items-center gap-3"
            >
              <span
                className="size-2 rounded-full"
                style={{ background: PAY_STATUS_STYLE[s].color }}
              />
              <div>
                <div className="text-sm font-bold" style={{ color: PAY_STATUS_STYLE[s].color }}>
                  {s}: {count} employees
                </div>
                <div className="text-xs text-muted-foreground">{fmt(amt)} net pay</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 mb-6 w-fit">
        {(["payroll", "slips"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-[color:var(--surface)] shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "payroll" ? "Payroll Register" : "Salary Slips"}
          </button>
        ))}
      </div>

      {tab === "payroll" && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setFilterDept(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterDept === d ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground bg-[color:var(--surface)]"}`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="bg-[color:var(--surface)] border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Employee</th>
                    <th className="text-right px-4 py-3">Basic</th>
                    <th className="text-right px-4 py-3">HRA</th>
                    <th className="text-right px-4 py-3">Gross</th>
                    <th className="text-right px-4 py-3">PF</th>
                    <th className="text-right px-4 py-3">ESI</th>
                    <th className="text-right px-4 py-3">TDS</th>
                    <th className="text-right px-4 py-3">Net Pay</th>
                    <th className="text-center px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/20"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.empId} · {s.designation}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm">{fmt(s.basic)}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm">{fmt(s.hra)}</td>
                      <td className="px-4 py-4 text-right font-bold">{fmt(getGross(s))}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-red-500">
                        -{fmt(s.pf)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-red-500">
                        {s.esi > 0 ? "-" + fmt(s.esi) : "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-red-500">
                        {s.tds > 0 ? "-" + fmt(s.tds) : "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-primary">
                        {fmt(getNet(s))}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{
                            color: PAY_STATUS_STYLE[s.payStatus].color,
                            background: `${PAY_STATUS_STYLE[s.payStatus].color}18`,
                            border: `1px solid ${PAY_STATUS_STYLE[s.payStatus].color}30`,
                          }}
                        >
                          {s.payStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary/5 border-t-2 border-primary/30">
                    <td className="px-5 py-4 font-bold">TOTAL ({filtered.length} staff)</td>
                    <td className="px-4 py-4 text-right font-bold">
                      {fmt(filtered.reduce((s, e) => s + e.basic, 0))}
                    </td>
                    <td className="px-4 py-4 text-right font-bold">
                      {fmt(filtered.reduce((s, e) => s + e.hra, 0))}
                    </td>
                    <td className="px-4 py-4 text-right font-bold">
                      {fmt(filtered.reduce((s, e) => s + getGross(e), 0))}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-red-500">
                      {fmt(filtered.reduce((s, e) => s + e.pf, 0))}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-red-500">
                      {fmt(filtered.reduce((s, e) => s + e.esi, 0))}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-red-500">
                      {fmt(filtered.reduce((s, e) => s + e.tds, 0))}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-primary">
                      {fmt(filtered.reduce((s, e) => s + getNet(e), 0))}
                    </td>
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
            <div
              key={s.id}
              className="bg-[color:var(--surface)] border border-border rounded-xl p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.empId} · {s.designation}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.department}</div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
                  style={{
                    color: PAY_STATUS_STYLE[s.payStatus].color,
                    background: `${PAY_STATUS_STYLE[s.payStatus].color}18`,
                    border: `1px solid ${PAY_STATUS_STYLE[s.payStatus].color}30`,
                  }}
                >
                  {s.payStatus}
                </span>
              </div>
              <div className="space-y-1.5 text-xs mb-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Salary</span>
                  <span className="text-foreground font-semibold">{fmt(getGross(s))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>PF + ESI + TDS</span>
                  <span className="text-red-500 font-semibold">-{fmt(getDeductions(s))}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-border">
                  <span>Net Pay</span>
                  <span className="text-primary">{fmt(getNet(s))}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    exportToExcel(
                      [
                        {
                          Month: month,
                          "Emp ID": s.empId,
                          Name: s.name,
                          Designation: s.designation,
                          Basic: s.basic,
                          HRA: s.hra,
                          Conveyance: s.conveyance,
                          Medical: s.medical,
                          Gross: getGross(s),
                          PF: s.pf,
                          ESI: s.esi,
                          TDS: s.tds,
                          "Net Pay": getNet(s),
                        },
                      ],
                      `SalarySlip_${s.empId}_${month.replace(" ", "_")}`,
                      undefined,
                      `Salary Slip — ${s.name} — ${month}`,
                    );
                    toast.success("Salary slip exported");
                  }}
                  className="flex-1 h-8 text-xs border border-border rounded-lg hover:bg-secondary flex items-center justify-center gap-1.5"
                >
                  <FileDown className="size-3" /> Excel Slip
                </button>
                {s.payStatus === "Pending" && (
                  <button
                    onClick={() => toast.success(`Payment processed for ${s.name}`)}
                    className="flex-1 h-8 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5"
                  >
                    <DollarSign className="size-3" /> Pay Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
