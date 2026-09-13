export type ReportPeriod = "month" | "overall" | "custom";
export type ReportRange = { startDate: string; endDate: string };
export function reportRange(
  period: ReportPeriod,
  start: string,
  end: string,
  now = new Date(),
): ReportRange | undefined {
  if (period === "overall") return undefined;
  if (period === "month") {
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      startDate: `${prefix}-01`,
      endDate: `${prefix}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`,
    };
  }
  const valid = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end) || start > end)
    throw new Error("Choose valid start and end dates. End date must be on or after start date.");
  return { startDate: start, endDate: end };
}
export function inReportRange(value: string | undefined, range?: ReportRange) {
  if (!range) return true;
  const day = value?.slice(0, 10);
  return !!day && day >= range.startDate && day <= range.endDate;
}
