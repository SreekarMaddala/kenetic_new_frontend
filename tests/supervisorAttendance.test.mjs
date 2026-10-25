import test from "node:test";
import assert from "node:assert/strict";
import { attendanceCalendarDate, monthlyAttendanceRows } from "../src/lib/supervisorAttendance.ts";

test("monthly attendance includes missing days and keeps saved shifts on their dates", () => {
  const shift = { date: "2026-10-11", checkIn: "2026-10-11T03:00:00Z" };
  const rows = monthlyAttendanceRows([shift, { date: "2026-09-30" }], "2026-10");
  assert.equal(rows.length, 31);
  assert.equal(rows[0].date, "2026-10-01");
  assert.equal(rows[30].date, "2026-10-31");
  assert.equal(rows[10].record, shift);
  assert.equal(rows[9].record, undefined);
});

test("empty months still show every day including leap-year February", () => {
  assert.equal(monthlyAttendanceRows([], "2024-02").length, 29);
  assert.equal(monthlyAttendanceRows([], "2026-02").length, 28);
  assert.equal(monthlyAttendanceRows([], "2026-04").length, 30);
});

test("all dates mode shows only saved records newest first", () => {
  const rows = monthlyAttendanceRows([{ date: "2026-09-01" }, { date: "2026-10-11" }], "");
  assert.deepEqual(
    rows.map((row) => row.date),
    ["2026-10-11", "2026-09-01"],
  );
});

test("calendar uses the IST day and month at UTC midnight boundaries", () => {
  assert.equal(attendanceCalendarDate(new Date("2026-09-30T20:00:00Z")), "2026-10-01");
});
