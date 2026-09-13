import test from "node:test";
import assert from "node:assert/strict";
import { logisticsPeriod } from "../src/lib/logisticsPeriod.ts";

test("logistics month switches at midnight in India", () => {
  assert.equal(logisticsPeriod(new Date("2026-08-31T18:29:59Z")).month, "2026-08");
  assert.deepEqual(logisticsPeriod(new Date("2026-08-31T18:30:00Z")), {
    month: "2026-09",
    today: "2026-09-01",
    start: "2026-09-01",
    end: "2026-09-30",
  });
});
test("date bounds handle leap years", () => {
  assert.equal(logisticsPeriod(new Date("2024-02-10T00:00:00Z")).end, "2024-02-29");
});
