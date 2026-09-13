import type { DomainRecord } from "./api";

export function employeeAnalytics(workers: DomainRecord[], cycles: DomainRecord[], month: string) {
  const cycle = cycles.find((item) => item.month === month);
  const staff = (cycle?.staff ?? []) as DomainRecord[];
  const ids = new Set([
    ...workers.map((w) => String(w.labourAttendanceId)),
    ...staff.map((s) => String(s.labourId)),
  ]);
  return [...ids].map((id) => {
    const worker = workers.find((w) => String(w.labourAttendanceId) === id);
    const salary = staff.find((s) => String(s.labourId) === id);
    const source = salary ?? worker;
    const days = source?.daysPresent == null ? null : Number(source.daysPresent);
    const nights = Number(source?.nightShifts ?? 0);
    const gross = salary
      ? Number(salary.gross)
      : Number(worker?.grossWages ?? Number(worker?.rate ?? 0) * ((days ?? 0) + nights));
    const deductions = Number(salary?.deductions ?? worker?.advanceDeductions ?? 0);
    const dailyPaid = Number(salary?.dailyPaid ?? worker?.dailyPaid ?? 0);
    const net = salary ? Number(salary.net) : Math.max(0, gross - deductions - dailyPaid);
    const paid = !!salary && cycle?.status === "Paid";
    return {
      id,
      name: String(source?.name ?? id),
      days,
      nights,
      gross,
      deductions,
      paid: dailyPaid + (paid ? net : 0),
      outstanding: paid ? 0 : net,
      status:
        paid || (gross > 0 && net === 0)
          ? "Paid"
          : dailyPaid > 0
            ? "Partly paid"
            : gross > 0
              ? "Not paid"
              : "No wages",
      reference: paid ? String(cycle?.paymentReference ?? "") : "",
      paidAt: paid ? String(cycle?.paidAt ?? "") : "",
    };
  });
}
