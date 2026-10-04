export function postedExpenseTotal(
  rows: { source: string; status: string; amount: number }[],
): number {
  return rows.reduce((sum, row) => {
    const status = row.status.toLowerCase();
    const posted = ["Direct Expense", "Vendor Payment"].includes(row.source)
      ? status === "approved"
      : ["Payroll Settlement", "Daily Wage Payment"].includes(row.source)
        ? status === "paid"
        : row.source === "Opening Balance" && status === "posted";
    return sum + (posted ? row.amount : 0);
  }, 0);
}
