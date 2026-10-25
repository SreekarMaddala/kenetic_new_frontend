import type { DomainRecord } from "./api";

export function attendanceCalendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function monthlyAttendanceRows(records: DomainRecord[], month: string) {
  if (!month) {
    return records
      .map((record) => ({ date: String(record.date), record }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  const [year, monthNumber] = month.split("-").map(Number);
  if (!/^\d{4}-\d{2}$/.test(month) || monthNumber < 1 || monthNumber > 12) return [];
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    return { date, record: records.find((record) => record.date === date) };
  });
}
