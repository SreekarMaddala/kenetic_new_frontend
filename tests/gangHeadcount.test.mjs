import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { headcountPreview } from "../src/lib/gangHeadcount.ts";
import { localDate } from "../src/lib/projectForm.ts";

test("headcount preview uses a common rate and matches half-up currency rounding", () => {
  assert.deepEqual(headcountPreview(10, 800, "8", "1", "2"), {
    present: 8,
    halfDay: 1,
    nightCount: 2,
    absent: 1,
    wage: 8400,
  });
  assert.equal(headcountPreview(10, 1.15, "0", "1").wage, 0.58);
  for (const counts of [[""], ["-1"], ["1.5"], ["11"], ["8", "3"], ["8", "0", "9"]])
    assert.equal(headcountPreview(10, 800, ...counts), null);
  assert.equal(headcountPreview(10, 800, "0").wage, 0);
});

const gang = {
  gangId: "g1",
  name: "Masonry",
  attendanceMode: "headcount",
  headcountFrom: "2026-10-01",
  size: 10,
  rate: 800,
  allocation: { projectId: "p1", size: 10, rate: 800, date: "2026-10-04", version: 1 },
  account: {
    earned: 6400,
    advancesGiven: 2000,
    advancesReturned: 0,
    advancesRecovered: 0,
    advanceBalance: 2000,
    reservedAdvances: 0,
    paid: 0,
    balanceToPay: 4400,
    carryForward: 0,
  },
  history: [],
};

function screenHarness(component, props, failFirst = false) {
  const module = { exports: {} };
  const states = [];
  const calls = [];
  let cursor = 0;
  let pending = [];
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL("../src/components/GangHeadcount.tsx", import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      module,
      exports: module.exports,
      Intl,
      Math,
      Number,
      String,
      crypto: { randomUUID },
      require(name) {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
        if (name === "react")
          return {
            useState(initial) {
              const index = cursor++;
              if (!(index in states))
                states[index] = typeof initial === "function" ? initial() : initial;
              return [
                states[index],
                (value) => {
                  states[index] = typeof value === "function" ? value(states[index]) : value;
                },
              ];
            },
            useRef(initial) {
              const index = cursor++;
              if (!(index in states)) states[index] = { current: initial };
              return states[index];
            },
          };
        if (name === "@tanstack/react-router") return { Link: "link" };
        if (name === "../lib/gangHeadcount") return { headcountPreview };
        if (name === "../lib/projectForm") return { localDate };
        if (name === "../lib/api")
          return {
            api: {
              async post(path, body) {
                calls.push(structuredClone(body));
                if (failFirst && calls.length === 1) throw new Error("Connection interrupted");
                return {};
              },
            },
          };
        if (name === "@tanstack/react-query")
          return {
            useQueryClient: () => ({ invalidateQueries: async () => {} }),
            useMutation: (options) => ({
              isPending: false,
              reset() {},
              mutate() {
                options.onMutate?.();
                pending.push(
                  Promise.resolve()
                    .then(options.mutationFn)
                    .then(options.onSuccess)
                    .catch(() => {})
                    .finally(options.onSettled),
                );
              },
            }),
          };
        return {};
      },
    },
  );
  function render() {
    cursor = 0;
    const nodes = [];
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(visit);
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(module.exports[component](props));
    return nodes;
  }
  return {
    render,
    calls,
    async flush() {
      await Promise.all(pending);
      pending = [];
    },
  };
}

test("supervisor saves one gang headcount without naming workers or sending a computed wage", async () => {
  let refreshed = 0;
  const app = screenHarness("GangHeadcountCard", {
    gang,
    projectId: "p1",
    day: "2026-10-04",
    admin: false,
    canRecordAttendance: true,
    blocked: false,
    setBusy() {},
    refresh: async () => {
      refreshed++;
    },
  });
  let screen = app.render();
  screen
    .find((node) => node.props?.["aria-label"] === "People present in Masonry")
    .props.onChange({ target: { value: "8" } });
  screen = app.render();
  assert.ok(screen.some((node) => node.type === "strong" && node.props.children === "₹6,400.00"));
  screen.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  await app.flush();
  assert.equal(refreshed, 1);
  assert.equal(app.calls[0].operation, "gang_attendance");
  assert.equal(app.calls[0].gangId, "g1");
  assert.equal(app.calls[0].present, 8);
  assert.equal(app.calls[0].expectedVersion, 0);
  assert.equal("workerId" in app.calls[0], false);
  assert.equal("wage" in app.calls[0], false);
  assert.equal("rate" in app.calls[0], false);
});

test("admin sees saved headcounts with allocation and payroll links, without attendance inputs", () => {
  const app = screenHarness("GangHeadcountCard", {
    gang: {
      ...gang,
      attendance: { present: 8, halfDay: 0, nightCount: 0, absent: 2, wage: 6400, version: 1 },
    },
    projectId: "p1",
    day: "2026-10-04",
    admin: true,
    canRecordAttendance: false,
    blocked: false,
    setBusy() {},
    refresh: async () => {},
  });
  const screen = app.render();
  assert.equal(
    screen.some((node) => node.type === "input"),
    false,
  );
  assert.ok(
    screen.some((node) => node.type === "link" && node.props.to === "/projects/$projectId/payroll"),
  );
});

test("saved headcounts require a correction reason before a changed attendance is sent", async () => {
  const app = screenHarness("GangHeadcountCard", {
    gang: {
      ...gang,
      attendance: { present: 8, halfDay: 0, nightCount: 0, absent: 2, wage: 6400, version: 3 },
    },
    projectId: "p1",
    day: "2026-10-04",
    admin: false,
    canRecordAttendance: true,
    blocked: false,
    setBusy() {},
    refresh: async () => {},
  });
  let screen = app.render();
  screen
    .find((node) => node.props?.["aria-label"] === "People present in Masonry")
    .props.onChange({ target: { value: "7" } });
  screen = app.render();
  screen.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  await app.flush();
  assert.equal(app.calls.length, 0);
  screen
    .find((node) => node.props?.placeholder === "What changed?")
    .props.onChange({ target: { value: "One worker did not attend" } });
  screen = app.render();
  screen.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  await app.flush();
  assert.equal(app.calls[0].expectedVersion, 3);
  assert.equal(app.calls[0].correctionReason, "One worker did not attend");
});

test("gang advance retries keep the same request ID after an uncertain response", async () => {
  const app = screenHarness(
    "GangAccountPanel",
    { gang, projectId: "p1", projects: [{ projectId: "p1", name: "Site" }] },
    true,
  );
  let screen = app.render();
  screen
    .find(
      (node) =>
        node.type === "button" &&
        Array.isArray(node.props.children) &&
        node.props.children.includes(" Give advance"),
    )
    .props.onClick();
  screen = app.render();
  screen
    .find((node) => node.type === "input" && node.props.type === "number")
    .props.onChange({ target: { value: "2000" } });
  screen
    .find((node) => node.type === "input" && node.props.type === "date")
    .props.onChange({ target: { value: "2026-10-04" } });
  screen
    .find((node) => node.props?.placeholder?.startsWith("e.g. Cash"))
    .props.onChange({ target: { value: "Cash to gang leader" } });
  for (let retry = 0; retry < 2; retry++) {
    screen = app.render();
    screen.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    await app.flush();
  }
  assert.equal(app.calls.length, 2);
  assert.equal(app.calls[0].requestId, app.calls[1].requestId);
  assert.equal(app.calls[0].gangId, "g1");
  assert.equal(app.calls[0].operation, "gang_advance");
  assert.equal("workerId" in app.calls[0], false);
});
