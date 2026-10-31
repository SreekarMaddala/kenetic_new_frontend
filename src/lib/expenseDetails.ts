import type { DomainRecord } from "./api";

export const EXPENSE_PURPOSES = [
  "Food & Mess",
  "Site Supplies",
  "Materials",
  "Transport",
  "Fuel",
  "Equipment Rental",
  "Repairs",
  "Utilities",
  "Accommodation",
  "Office & Administration",
  "Other",
];
export const EXPENSE_PAYMENT_MODES = ["Cash", "UPI", "NEFT", "RTGS", "Cheque", "Card", "Other"];

export function expenseDetails(record: DomainRecord) {
  return {
    paidBy: String(record.submittedBy || record.paidByName || "Not recorded"),
    paidTo: String(
      record.paidTo ||
        record.contractorName ||
        record.vendorName ||
        record.workerName ||
        "Not recorded",
    ),
    paymentMode: String(record.paymentMode || record.mode || "Not recorded"),
    reference: String(record.reference || record.receipt || ""),
  };
}

export function matchesExpensePeriod(
  value: string,
  range: "week" | "month" | "all",
  now = new Date(),
) {
  if (range === "all") return true;
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  if (range === "month") return value.startsWith(today.slice(0, 7));
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = Date.parse(day + "T00:00:00Z");
  const current = new Date(today + "T00:00:00Z");
  const start = current.getTime() - current.getUTCDay() * 86400000;
  return date >= start && date < start + 7 * 86400000;
}
