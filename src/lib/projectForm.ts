export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function nextDate(value: string): string {
  if (!validDate(value)) return "";
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return localDate(date);
}

export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function projectBudgets(budget: string, spent: string) {
  const decimal = /^\d+(?:\.\d+)?$/;
  if (!decimal.test(budget) || !Number.isFinite(Number(budget)) || Number(budget) <= 0)
    throw new Error("Total budget must be a number greater than zero.");
  if (spent !== "" && (!decimal.test(spent) || !Number.isFinite(Number(spent))))
    throw new Error("Spent budget must be a non-negative number.");
  const result = { budget: Number(budget) * 10_000_000, spent: Number(spent) * 10_000_000 };
  if (!Number.isFinite(result.budget) || !Number.isFinite(result.spent))
    throw new Error("Budget is too large.");
  if (result.spent > result.budget) throw new Error("Spent budget cannot exceed total budget.");
  return result;
}

export function allocationEnd(
  start: string,
  end: string,
  untilProjectEnd: boolean,
  projectEnd: string,
) {
  const effectiveEnd = untilProjectEnd ? projectEnd : end;
  if (!validDate(start) || !validDate(effectiveEnd))
    throw new Error(
      untilProjectEnd
        ? "Set a valid project deadline before allocating until project end."
        : "Choose valid start and end dates.",
    );
  if (start >= effectiveEnd) throw new Error("Start period must be earlier than end period.");
  if (validDate(projectEnd) && effectiveEnd > projectEnd)
    throw new Error("Allocation cannot end after the project deadline.");
  return effectiveEnd;
}
