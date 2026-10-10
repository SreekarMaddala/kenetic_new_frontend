import test from "node:test";
import assert from "node:assert/strict";
import { createAdvanceRequest } from "../src/lib/workerAdvance.ts";

const details = {
  workerId: "worker-one",
  projectId: "site-one",
  date: "2026-10-10",
  amount: 2000,
  description: " Personal advance ",
};
test("retrying an advance, including after edits are reverted, preserves its idempotency key", () => {
  const request = createAdvanceRequest();
  const first = request(details);
  assert.equal(first.operation, "advance");
  assert.equal(first.description, "Personal advance");
  assert.equal(request(details).requestId, first.requestId);
  assert.notEqual(request({ ...details, amount: 1000 }).requestId, first.requestId);
  assert.notEqual(request({ ...details, projectId: "site-two" }).requestId, first.requestId);
  assert.equal(request(details).requestId, first.requestId);
  assert.notEqual(createAdvanceRequest()(details).requestId, first.requestId);
});
test("invalid advances cannot be submitted", () => {
  const request = createAdvanceRequest();
  for (const amount of [0, -10, NaN, Infinity, 1e13])
    assert.throws(() => request({ ...details, amount }));
  for (const fields of [
    { workerId: "" },
    { projectId: "" },
    { date: "" },
    { description: "  " },
    { description: "x".repeat(4001) },
  ])
    assert.throws(() => request({ ...details, ...fields }));
});
