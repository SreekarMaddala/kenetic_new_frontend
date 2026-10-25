import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function attendanceScreen(role, workerOverrides = {}) {
  const module = { exports: {} };
  const worker = {
    workerId: "w1",
    labourAttendanceId: "w1",
    name: "Worker",
    rate: 800,
    allocatedProjectId: "p1",
    allocationConfirmed: true,
    allocationDate: "2026-10-11",
    attendanceRecorded: true,
    status: "Present",
    paymentStatus: "Not paid",
    dailyWage: 800,
    ...workerOverrides,
  };
  const source =
    readFileSync(new URL("../src/routes/projects/$projectId/labour.tsx", import.meta.url), "utf8") +
    "\nexport { AttendanceDay };";
  const jsx = (type, props) => ({ type, props });
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
      require(name) {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
        if (name === "react") return { useState: (initial) => [initial, () => {}] };
        if (name === "@tanstack/react-router")
          return { createFileRoute: () => () => ({}), Link: "a" };
        if (name === "../../../contexts/AuthContext")
          return { useAuth: () => ({ user: { role } }) };
        if (name === "../../../lib/api") return { projectApi: { list: () => [] } };
        if (name === "@tanstack/react-query")
          return {
            useQueryClient: () => ({}),
            useQuery: () => ({ data: [{ projectId: "p1", name: "Site" }] }),
            useInfiniteQuery: () => ({ data: { pages: [{ items: [worker] }] } }),
            useMutation: () => ({ isPending: false }),
          };
        if (name === "../../../lib/workerAttendance") return { workerId: (item) => item.workerId };
        return {};
      },
      Intl,
      Date,
      Number,
      String,
      Set,
    },
  );
  const elements = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node.type === "function") return visit(node.type(node.props));
    elements.push(node);
    visit(node.props?.children);
  }
  visit(module.exports.AttendanceDay({ projectId: "p1", day: "2026-10-11" }));
  const text = (node) =>
    typeof node === "string" || typeof node === "number"
      ? String(node)
      : Array.isArray(node)
        ? node.map(text).join("")
        : text(node?.props?.children ?? "");
  return elements.map((node) => ({ type: node.type, text: text(node), props: node.props }));
}

test("operations admin allocates workers and sees attendance without editing it", () => {
  const screen = attendanceScreen("operations_admin");
  const buttons = screen.filter((node) => node.type === "button").map((node) => node.text);
  assert.ok(!buttons.includes("Assign"));
  assert.ok(screen.some((node) => node.props?.role === "status" && node.text === "Assigned"));
  assert.ok(buttons.includes("Allocate workers / copy yesterday"));
  assert.ok(
    !buttons.some(
      (label) => label === "Save" || label.startsWith("Save selected") || label === "Present",
    ),
  );
  assert.ok(!screen.some((node) => node.type === "input" && node.props.type === "checkbox"));
  assert.ok(
    !screen.some(
      (node) => node.type === "select" && node.props["aria-label"] === "Payment for Worker",
    ),
  );
  assert.ok(screen.some((node) => node.type === "span" && node.text === "Present"));
});

test("supervisor retains attendance controls and cannot assign workers", () => {
  const screen = attendanceScreen("supervisor");
  const buttons = screen.filter((node) => node.type === "button").map((node) => node.text);
  assert.ok(buttons.includes("Save"));
  assert.ok(buttons.includes("Present"));
  assert.ok(buttons.some((label) => label.startsWith("Save selected")));
  assert.ok(!buttons.includes("Assign"));
  assert.ok(!buttons.includes("Allocate workers / copy yesterday"));
});

test("workers without today's confirmation still show Assign", () => {
  const screen = attendanceScreen("operations_admin", {
    allocationConfirmed: false,
    allocationDate: "2026-10-10",
    attendanceRecorded: false,
  });
  assert.ok(screen.some((node) => node.type === "button" && node.text === "Assign"));
  assert.ok(!screen.some((node) => node.props?.role === "status" && node.text === "Assigned"));
});

test("confirmed workers show Assigned after attendance starts and cannot change projects", () => {
  const screen = attendanceScreen("operations_admin", { allocationStarted: true });
  assert.ok(screen.some((node) => node.props?.role === "status" && node.text === "Assigned"));
  assert.ok(
    !screen.some((node) => node.type === "button" && ["Assign", "Reassign"].includes(node.text)),
  );
  assert.equal(
    screen.find(
      (node) => node.type === "select" && node.props["aria-label"] === "Project for Worker",
    ).props.disabled,
    true,
  );
});
