import test from "node:test";
import assert from "node:assert/strict";
import { reportRange, inReportRange } from "../src/lib/reportDates.ts";

test("this month uses local calendar boundaries, including leap years", () => {
  assert.deepEqual(reportRange("month", "", "", new Date(2024, 1, 15)), {
    startDate: "2024-02-01",
    endDate: "2024-02-29",
  });
});
test("overall includes records without dates", () => {
  assert.equal(reportRange("overall", "", ""), undefined);
  assert.equal(inReportRange(undefined), true);
});
test("custom ranges include both end dates and exclude undated records", () => {
  const range = reportRange("custom", "2026-09-01", "2026-09-13");
  assert.equal(inReportRange("2026-09-13T23:59:59Z", range), true);
  assert.equal(inReportRange("2026-09-01T00:00:00Z", range), true);
  assert.equal(inReportRange("2026-08-31", range), false);
  assert.equal(inReportRange(undefined, range), false);
  assert.throws(() => reportRange("custom", "2026-09-13", "2026-09-01"));
  assert.throws(() => reportRange("custom", "2026-02-30", "2026-03-01"));
  assert.throws(() => reportRange("custom", "", ""));
});
