import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { gangAttendancePlan, gangSummaries } from "../src/lib/gangAttendance.ts";
import { saveWorkerBatch } from "../src/lib/workerAttendance.ts";

const member = (id, fields = {}) => ({
  workerId: id,
  labourAttendanceId: id,
  name: id,
  gangId: "g1",
  gangName: "Masonry",
  allocatedProjectId: "p1",
  allocationConfirmed: true,
  rate: 800,
  attendanceRecorded: true,
  attendanceVersion: 2,
  status: "Present",
  nightShift: false,
  paymentStatus: "Not paid",
  dailyWage: 800,
  ...fields,
});
const options = (action, fields = {}) => ({
  action,
  projectId: "p1",
  day: "2026-10-25",
  ...fields,
});

test("gang summaries use saved member wages, half days and payment status for the selected site", () => {
  const rows = [
    member("a", { dailyWage: 800, paymentStatus: "Paid" }),
    member("b", { status: "Half Day", rate: 600, dailyWage: 300 }),
    member("c", { status: "Absent", dailyWage: 0 }),
    member("d", { allocatedProjectId: "p2", dailyWage: 2000 }),
    member("e", { attendanceRecorded: false, dailyWage: 0 }),
    member("f", { gangId: undefined }),
    member("g", { gangId: "g2", dailyWage: 100.01 }),
  ];
  const groups = gangSummaries(rows, "p1");
  assert.equal(groups.length, 2);
  assert.equal(groups[0].members.length, 5);
  assert.equal(groups[0].assigned, 4);
  assert.equal(groups[0].recorded, 3);
  assert.equal(groups[0].wages, 1100);
  assert.equal(groups[0].paid, 800);
  assert.equal(groups[0].unpaid, 300);
  assert.equal(groups[0].present, 1);
  assert.equal(groups[0].halfDays, 1);
  assert.equal(groups[0].absent, 1);
});

test("one gang attendance action covers every member and sends no client-computed wage", () => {
  const rows = [member("a", { rate: 800, attendanceVersion: 4 }), member("b", { rate: 650 })];
  const plan = gangAttendancePlan(
    rows,
    options("attendance", { status: "Half Day", nightShift: true }),
  );
  assert.equal(plan.length, 2);
  assert.deepEqual(
    plan.map(({ payload }) => payload.workerId),
    ["a", "b"],
  );
  assert.equal(plan[0].payload.expectedVersion, 4);
  assert.equal(plan[1].payload.expectedVersion, 2);
  for (const { payload } of plan) {
    assert.equal(payload.status, "Half Day");
    assert.equal(payload.nightShift, true);
    assert.equal(payload.paymentStatus, "Not paid");
    assert.equal("wage" in payload, false);
    assert.equal("rate" in payload, false);
  }
});

test("paying a gang preserves each saved attendance and skips absent or already paid members", () => {
  const rows = [
    member("a", { status: "Half Day", nightShift: true }),
    member("b", { paymentStatus: "Paid" }),
    member("c", { status: "Absent", dailyWage: 0 }),
  ];
  const plan = gangAttendancePlan(rows, options("pay"));
  assert.equal(plan.length, 1);
  assert.equal(plan[0].payload.workerId, "a");
  assert.equal(plan[0].payload.status, "Half Day");
  assert.equal(plan[0].payload.nightShift, true);
  assert.equal(plan[0].payload.paymentStatus, "Paid");
  rows[0].paymentStatus = "Paid";
  assert.deepEqual(gangAttendancePlan(rows, options("pay")), []);
});

test("a gang cannot silently skip an unconfirmed, foreign-site or unmarked member", () => {
  for (const changes of [{ allocationConfirmed: false }, { allocatedProjectId: "p2" }]) {
    assert.throws(
      () =>
        gangAttendancePlan(
          [member("a"), member("b", changes)],
          options("attendance", { status: "Present" }),
        ),
      /confirm/,
    );
  }
  assert.throws(
    () =>
      gangAttendancePlan([member("a"), member("b", { attendanceRecorded: false })], options("pay")),
    /save attendance/,
  );
  assert.throws(
    () => gangAttendancePlan([member("a"), member("b", { gangId: "g2" })], options("pay")),
    /one gang/,
  );
  assert.throws(() => gangAttendancePlan([], options("pay")), /one gang/);
});

test("gang attendance preserves paid wages and requires a reason to correct them", () => {
  const rows = [member("a", { paymentStatus: "Paid" })];
  assert.equal(
    gangAttendancePlan(rows, options("attendance", { status: "Present" }))[0].payload.paymentStatus,
    "Paid",
  );
  assert.throws(
    () => gangAttendancePlan(rows, options("attendance", { status: "Absent" })),
    /correction reason/,
  );
  const plan = gangAttendancePlan(
    rows,
    options("attendance", {
      status: "Absent",
      nightShift: true,
      correctionReason: "  Wrong attendance  ",
    }),
  );
  assert.equal(plan[0].payload.paymentStatus, "Not paid");
  assert.equal(plan[0].payload.nightShift, false);
  assert.equal(plan[0].payload.correctionReason, "Wrong attendance");
});

test("gang allocation retains confirmed members and refuses to move started attendance", () => {
  const plan = gangAttendancePlan(
    [member("a"), member("b", { allocationConfirmed: false, allocationVersion: 3 })],
    options("allocate"),
  );
  assert.equal(plan.length, 1);
  assert.equal(plan[0].payload.targetProjectId, "p1");
  assert.equal(plan[0].payload.expectedVersion, 3);
  assert.throws(
    () =>
      gangAttendancePlan(
        [member("a"), member("b", { allocatedProjectId: "p2", allocationStarted: true })],
        options("allocate"),
      ),
    /cannot be moved/,
  );
});

test("sequential gang saves do not overlap shared monthly total transactions", async () => {
  let active = 0;
  let peak = 0;
  const result = await saveWorkerBatch(
    [1, 2, 3, 4, 5],
    async () => {
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active--;
    },
    1,
  );
  assert.equal(peak, 1);
  assert.equal(result.succeeded.length, 5);
});

function gangScreen(role, rows, failingId) {
  const module = { exports: {} };
  const states = [];
  const calls = [];
  let cursor = 0;
  let refreshCount = 0;
  const jsx = (type, props) => ({ type, props });
  const source = readFileSync(
    new URL("../src/components/GangAttendancePanel.tsx", import.meta.url),
    "utf8",
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      Intl,
      require(name) {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
        if (name === "react")
          return {
            useState(initial) {
              const index = cursor++;
              if (!(index in states)) states[index] = initial;
              return [
                states[index],
                (value) => {
                  states[index] = typeof value === "function" ? value(states[index]) : value;
                },
              ];
            },
          };
        if (name === "../lib/gangAttendance") return { gangAttendancePlan, gangSummaries };
        if (name === "../lib/workerAttendance") return { saveWorkerBatch };
        if (name === "sonner") return { toast: { success() {} } };
        if (name === "../lib/api")
          return {
            api: {
              async post(path, payload) {
                calls.push(payload);
                if (payload.workerId === failingId)
                  throw new Error("Attendance is locked by payroll");
                const row = rows.find((row) => row.workerId === payload.workerId);
                Object.assign(row, {
                  status: payload.status,
                  paymentStatus: payload.paymentStatus,
                  nightShift: payload.nightShift,
                  attendanceRecorded: true,
                  attendanceVersion: Number(row.attendanceVersion) + 1,
                });
                row.dailyWage =
                  row.rate *
                  (payload.status === "Half Day" ? 0.5 : payload.status === "Absent" ? 0 : 1) *
                  (payload.nightShift ? 2 : 1);
              },
            },
          };
        return {};
      },
    },
  );
  function render() {
    cursor = 0;
    const nodes = [];
    const root = module.exports.GangAttendanceCard({
      group: gangSummaries(rows, "p1")[0],
      projectId: "p1",
      day: "2026-10-25",
      admin: role === "operations_admin",
      canRecordAttendance: role === "supervisor",
      blocked: false,
      setBusy() {},
      refresh: async () => {
        refreshCount++;
      },
    });
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(visit);
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(root);
    return nodes;
  }
  return {
    render,
    calls,
    get refreshCount() {
      return refreshCount;
    },
    async click(node) {
      await node.props.onClick();
    },
  };
}

test("gang screen saves attendance and wages for every member through the existing API", async () => {
  const rows = [
    member("a", { attendanceRecorded: false }),
    member("b", { rate: 600, attendanceRecorded: false }),
  ];
  const screen = gangScreen("supervisor", rows);
  await screen.click(
    screen
      .render()
      .find((node) => node.type === "button" && node.props.children === "Save gang attendance"),
  );
  assert.equal(screen.calls.length, 2);
  assert.ok(rows.every((row) => row.attendanceRecorded && row.paymentStatus === "Not paid"));
  await screen.click(
    screen
      .render()
      .find(
        (node) =>
          node.type === "button" &&
          Array.isArray(node.props.children) &&
          String(node.props.children[0]).startsWith("Mark gang wages paid"),
      ),
  );
  assert.equal(screen.calls.length, 4);
  assert.ok(rows.every((row) => row.paymentStatus === "Paid"));
  assert.equal(screen.refreshCount, 2);
  const paidButton = screen
    .render()
    .find(
      (node) =>
        node.type === "button" &&
        Array.isArray(node.props.children) &&
        String(node.props.children[0]).startsWith("Mark gang wages paid"),
    );
  assert.equal(paidButton.props.disabled, true);
});

test("gang action surfaces failed member names and refreshes successful members", async () => {
  const screen = gangScreen("supervisor", [member("a"), member("b")], "b");
  await screen.click(
    screen
      .render()
      .find((node) => node.type === "button" && node.props.children === "Save gang attendance"),
  );
  const nodes = screen.render();
  assert.ok(
    nodes.some(
      (node) => node.type === "li" && node.props.children === "b: Attendance is locked by payroll",
    ),
  );
  assert.ok(
    nodes.some(
      (node) => node.props?.role === "status" && String(node.props.children).includes("1 of 2"),
    ),
  );
  assert.equal(screen.refreshCount, 1);
});

test("administrators allocate gangs without attendance or payment controls", () => {
  const screen = gangScreen("operations_admin", [member("a", { allocationConfirmed: false })]);
  const nodes = screen.render();
  assert.ok(
    nodes.some(
      (node) => node.type === "button" && String(node.props.children).startsWith("Allocate all"),
    ),
  );
  assert.ok(
    !nodes.some((node) => node.type === "button" && node.props.children === "Save gang attendance"),
  );
});

test("retrying a partially paid gang sends only members still unpaid", async () => {
  const rows = [member("a"), member("b")];
  const screen = gangScreen("supervisor", rows, "b");
  const payButton = () =>
    screen
      .render()
      .find(
        (node) =>
          node.type === "button" &&
          Array.isArray(node.props.children) &&
          String(node.props.children[0]).startsWith("Mark gang wages paid"),
      );
  await screen.click(payButton());
  assert.equal(rows[0].paymentStatus, "Paid");
  assert.equal(rows[1].paymentStatus, "Not paid");
  await screen.click(payButton());
  assert.equal(screen.calls.filter((payload) => payload.workerId === "a").length, 1);
  assert.equal(screen.calls.filter((payload) => payload.workerId === "b").length, 2);
});
