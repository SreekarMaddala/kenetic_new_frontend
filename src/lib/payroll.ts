import type { DomainRecord } from "./api";

export interface PayrollItem {
  id: string;
  name: string;
  category: string;
  groupKey: string;
  group: string;
  advanceRecovery: number;
  carryForward: number;
  reference: string;
  paidAt: string;
  remaining: number;
  basic: number;
  hra: number;
  allowances: number;
  gross: number;
  pf: number;
  esi: number;
  tds: number;
  deductions: number;
  dailyPaid: number;
  netPay: number;
  status: string;
}

export function payrollItems(cycles: DomainRecord[], month: string): PayrollItem[] {
  const cycle = cycles.find((item) => item.month === month);
  if (!cycle) return [];
  return ((cycle.staff ?? []) as DomainRecord[]).map((member) => {
    const salary = member.salary as DomainRecord | undefined;
    const groupKey = salary ? "staff" : String(member.gangId || "ungrouped");
    const receipt = (cycle.paidGroups as Record<string, DomainRecord> | undefined)?.[groupKey];
    const paid = cycle.status === "Paid" || !!receipt;
    return {
      id: String(member.labourId),
      name: String(member.name),
      category: salary ? "Salaried staff" : String(member.type ?? "Labour"),
      groupKey,
      group: salary ? "Salaried staff" : String(member.gangName || "Individual workers"),
      advanceRecovery: Number(member.advanceRecovery ?? 0),
      carryForward: Number(member.carryForward ?? 0),
      reference: String(receipt?.reference ?? (paid ? (cycle.paymentReference ?? "") : "")),
      paidAt: String(receipt?.paidAt ?? (paid ? (cycle.paidAt ?? "") : "")),
      remaining: paid ? 0 : Number(member.net ?? 0),
      basic: salary ? Number(salary.basic ?? 0) : Number(member.gross ?? 0),
      hra: Number(salary?.hra ?? 0),
      allowances: ["conveyance", "medical"].reduce(
        (sum, field) => sum + Number(salary?.[field] ?? 0),
        0,
      ),
      gross: Number(member.gross ?? 0),
      pf: Number(salary?.pf ?? 0),
      esi: Number(salary?.esi ?? 0),
      tds: Number(salary?.tds ?? 0),
      deductions: Number(member.deductions ?? 0),
      dailyPaid: Number(member.dailyPaid ?? 0),
      netPay: Number(member.net ?? 0),
      status: paid ? "Paid" : "Pending",
    };
  });
}
