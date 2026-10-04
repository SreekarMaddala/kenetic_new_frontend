import test from "node:test";
import assert from "node:assert/strict";
import { payrollItems } from "../src/lib/payroll.ts";
import { appendSupervisor } from "../src/lib/projectForm.ts";
import { postedExpenseTotal } from "../src/lib/spending.ts";

test("payroll only shows the selected month's saved snapshot", () => {
  const cycles = [
    {
      month: "2026-07",
      status: "Paid",
      staff: [
        { labourId: "w", name: "Worker", gross: 800, deductions: 100, dailyPaid: 200, net: 500 },
      ],
    },
    {
      month: "2026-08",
      status: "Pending",
      staff: [
        {
          labourId: "s",
          name: "Staff",
          gross: 1250,
          deductions: 50,
          net: 1200,
          salary: { basic: 1000, hra: 100, conveyance: 100, medical: 50, pf: 25, esi: 15, tds: 10 },
        },
      ],
    },
  ];
  const july = payrollItems(cycles, "2026-07");
  assert.equal(july.length, 1);
  assert.equal(july[0].gross, 800);
  assert.equal(july[0].hra, 0);
  assert.equal(july[0].deductions, 100);
  assert.equal(july[0].dailyPaid, 200);
  assert.equal(july[0].netPay, 500);
  assert.equal(july[0].status, "Paid");
  const august = payrollItems(cycles, "2026-08")[0];
  assert.equal(august.basic, 1000);
  assert.equal(august.hra, 100);
  assert.equal(august.allowances, 150);
  assert.equal(august.pf + august.esi + august.tds, august.deductions);
  assert.deepEqual(payrollItems(cycles, "2026-10"), []);
});

test("adding a supervisor retains all current assignments without duplicates", () => {
  const previous = ["first", "second"];
  assert.deepEqual(appendSupervisor(previous, "third"), ["first", "second", "third"]);
  assert.deepEqual(appendSupervisor(previous, "second"), previous);
  assert.deepEqual(previous, ["first", "second"]);
});

test("posted spending excludes pending/rejected payments and raw logistics or deductions", () => {
  const rows = [
    { source: "Vendor Payment", status: "Approved", amount: 100 },
    { source: "Direct Expense", status: "Pending", amount: 500 },
    { source: "Vendor Payment", status: "Rejected", amount: 900 },
    { source: "Daily Wage Payment", status: "Paid", amount: 200 },
    { source: "Payroll Settlement", status: "Paid", amount: 300 },
    { source: "Opening Balance", status: "Posted", amount: 20 },
    { source: "Logistics Fuel", status: "Approved", amount: 600 },
    { source: "Labour Advance", status: "Activity", amount: 700 },
  ];
  assert.equal(postedExpenseTotal(rows), 620);
});
