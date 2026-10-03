import test from "node:test";
import assert from "node:assert/strict";
import {
  allocationEnd,
  localDate,
  nextDate,
  projectBudgets,
  validDate,
} from "../src/lib/projectForm.ts";

test("budgets preserve spent amounts and convert crores to rupees", () => {
  assert.deepEqual(projectBudgets("82.40", "51.10"), { budget: 824000000, spent: 511000000 });
  assert.deepEqual(projectBudgets("1", ""), { budget: 10000000, spent: 0 });
});

test("budgets reject letters, partial numbers, negative and excessive amounts", () => {
  for (const budget of ["i", "12abc", "-1", "0", "Infinity", "1e3", ""]) {
    assert.throws(() => projectBudgets(budget, ""));
  }
  for (const spent of ["i", "-1", "2", "NaN"]) {
    assert.throws(() => projectBudgets("1", spent));
  }
});

test("calendar validation handles leap days and local date boundaries", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("Nov 2026"), false);
  assert.equal(nextDate("2024-02-28"), "2024-02-29");
  assert.equal(nextDate("2026-12-31"), "2027-01-01");
  assert.equal(localDate(new Date(2026, 9, 2, 0, 1)), "2026-10-02");
});

test("allocations require start before end and respect the project deadline", () => {
  assert.throws(() => allocationEnd("2026-10-30", "2026-10-22", false, "2026-12-31"));
  assert.throws(() => allocationEnd("2026-10-22", "2026-10-22", false, "2026-12-31"));
  assert.throws(() => allocationEnd("2026-10-22", "2027-01-01", false, "2026-12-31"));
  assert.equal(allocationEnd("2026-10-22", "2026-10-30", false, "2026-12-31"), "2026-10-30");
});

test("until project end uses the deadline and rejects missing or legacy text deadlines", () => {
  assert.equal(allocationEnd("2026-10-22", "", true, "2026-12-31"), "2026-12-31");
  assert.equal(allocationEnd("2026-10-22", "2026-10-01", true, "2026-12-31"), "2026-12-31");
  assert.throws(() => allocationEnd("2026-10-22", "", true, ""));
  assert.throws(() => allocationEnd("2026-10-22", "", true, "Dec 2026"));
  assert.throws(() => allocationEnd("2026-12-31", "", true, "2026-12-31"));
});
