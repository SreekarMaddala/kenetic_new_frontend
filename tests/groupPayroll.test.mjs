import test from "node:test";
import assert from "node:assert/strict";
import { payrollItems } from "../src/lib/payroll.ts";
import { employeeAnalytics } from "../src/lib/employeeAnalytics.ts";
import { logisticsReport } from "../src/lib/logisticsReport.ts";
import { postedExpenseTotal } from "../src/lib/spending.ts";

test("partial payroll reports only the settled group's payment and keeps advances visible", () => {
  const cycles = [
    {
      month: "2026-10",
      status: "Partially Paid",
      paidGroups: {
        gangA: { reference: "receipt-A", amount: 500, paidAt: "2026-10-30" },
      },
      staff: [
        {
          labourId: "w1",
          name: "Ravi",
          gangId: "gangA",
          gangName: "Masonry",
          gross: 1000,
          deductions: 200,
          advanceRecovery: 200,
          dailyPaid: 300,
          net: 500,
        },
        {
          labourId: "w2",
          name: "Sam",
          gangId: "gangB",
          gangName: "Steel",
          gross: 800,
          deductions: 0,
          net: 800,
        },
        { labourId: "s1", name: "Staff", salary: { basic: 900 }, gross: 900, net: 900 },
      ],
    },
  ];
  const report = payrollItems(cycles, "2026-10");
  assert.equal(report[0].advanceRecovery, 200);
  assert.equal(report[0].remaining, 0);
  assert.equal(report[0].reference, "receipt-A");
  assert.equal(report[1].remaining, 800);
  assert.equal(report[1].status, "Pending");
  assert.equal(report[2].groupKey, "staff");
  const analytics = employeeAnalytics([], cycles, "2026-10");
  assert.equal(analytics[0].paid, 800);
  assert.equal(analytics[0].outstanding, 0);
  assert.equal(analytics[1].paid, 0);
  assert.equal(analytics[1].outstanding, 800);
});

test("transport export includes dated fuel, mileage and rentals only from the selected project/month", () => {
  const records = [
    { tripId: "a", projectId: "p1", date: "2026-10-01", tripType: "fuel", liters: 10, rate: 95 },
    {
      tripId: "b",
      projectId: "p1",
      date: "2026-10-02",
      tripType: "rental",
      rate: 400,
      helper: 100,
    },
    {
      tripId: "c",
      projectId: "p1",
      date: "2026-10-02",
      tripType: "vehicle",
      startKm: 100,
      endKm: 140,
    },
    { projectId: "p1", date: "2026-09-01", tripType: "fuel", liters: 2, rate: 95 },
    { projectId: "p2", date: "2026-10-01", tripType: "fuel", liters: 2, rate: 95 },
    { projectId: "p1", tripType: "vehicle_registration" },
  ];
  const rows = logisticsReport(records, "p1", "2026-10");
  assert.equal(rows.length, 3);
  assert.equal(rows[0]["Fuel cost (INR)"], 950);
  assert.equal(rows[1]["Transport cost (INR)"], 500);
  assert.equal(rows[2]["Distance km"], 40);
  assert.equal(logisticsReport(records, "p1", "all").length, 4);
  assert.equal(logisticsReport(records, "p1", "2026-11").length, 0);
});

test("spending includes actual advances and approved subcontractor payments, excluding activity and reversals", () => {
  assert.equal(
    postedExpenseTotal([
      { source: "Worker Advance", status: "Paid", amount: 200 },
      { source: "Subcontractor Payment", status: "Approved", amount: 500 },
      { source: "Subcontractor Payment", status: "Reversed", amount: 500 },
      { source: "Subcontractor Payment", status: "Pending", amount: 500 },
      { source: "Labour Advance", status: "Activity", amount: 200 },
      { source: "Payroll Settlement", status: "Paid", amount: 600 },
    ]),
    1300,
  );
});
