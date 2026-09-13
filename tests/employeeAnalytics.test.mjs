import test from "node:test";
import assert from "node:assert/strict";
import { employeeAnalytics } from "../src/lib/employeeAnalytics.ts";

test("daily attendance payments immediately reduce wages owed without a payroll cycle", () => {
  const workers = [
    {
      labourAttendanceId: "w",
      name: "Worker",
      rate: 800,
      daysPresent: 3,
      grossWages: 2400,
      dailyPaid: 800,
      advanceDeductions: 0,
    },
  ];
  const [row] = employeeAnalytics(workers, [], "2026-09");
  assert.equal(row.paid, 800);
  assert.equal(row.outstanding, 1600);
  assert.equal(row.status, "Partly paid");
});

test("payroll settlement adds only the remaining balance to daily payments", () => {
  const [row] = employeeAnalytics(
    [],
    [
      {
        month: "2026-09",
        status: "Paid",
        staff: [
          {
            labourId: "w",
            name: "Worker",
            daysPresent: 3,
            gross: 2400,
            deductions: 0,
            dailyPaid: 800,
            net: 1600,
          },
        ],
      },
    ],
    "2026-09",
  );
  assert.equal(row.paid, 2400);
  assert.equal(row.outstanding, 0);
});

const workers = [
  {
    labourAttendanceId: "w1",
    name: "Worker",
    rate: 800,
    daysPresent: 2.5,
    nightShifts: 1,
    advanceDeductions: 300,
  },
];
const staff = [
  {
    labourId: "w1",
    name: "Worker",
    daysPresent: 2.5,
    nightShifts: 1,
    gross: 2800,
    deductions: 300,
    net: 2500,
  },
];
test("attendance estimates include half days and night shifts without claiming payment", () => {
  const [row] = employeeAnalytics(workers, [], "2026-09");
  assert.equal(row.gross, 2800);
  assert.equal(row.outstanding, 2500);
  assert.equal(row.paid, 0);
});
test("only paid cycles for the selected month count as payments", () => {
  const cycles = [
    { month: "2026-08", status: "Paid", staff },
    { month: "2026-09", status: "Pending", staff },
  ];
  assert.equal(employeeAnalytics(workers, cycles, "2026-09")[0].paid, 0);
  cycles[1].status = "Paid";
  cycles[1].paymentReference = "receipt-123";
  const [row] = employeeAnalytics([{ ...workers[0], rate: 1000 }], cycles, "2026-09");
  assert.equal(row.paid, 2500);
  assert.equal(row.gross, 2800);
  assert.equal(row.outstanding, 0);
  assert.equal(row.reference, "receipt-123");
});
test("payroll staff without labour attendance retain their payment and unknown attendance", () => {
  const [row] = employeeAnalytics(
    [],
    [
      {
        month: "2026-09",
        status: "Paid",
        staff: [{ labourId: "s1", name: "Supervisor", gross: 10000, deductions: 1000, net: 9000 }],
      },
    ],
    "2026-09",
  );
  assert.equal(row.days, null);
  assert.equal(row.paid, 9000);
});
