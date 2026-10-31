import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createGangOnboardingRequest } from "../src/lib/gangOnboarding.ts";
import { localDate } from "../src/lib/projectForm.ts";

function workforce(gangResponse = []) {
  const module = { exports: {} };
  const states = [];
  const gangs = [];
  const workers = [];
  const calls = [];
  const queries = new Map();
  let pending = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const source =
    readFileSync(new URL("../src/routes/workers.tsx", import.meta.url), "utf8") +
    "\nexport { WorkersPage };";
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
      Number,
      String,
      Date,
      require(name) {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name === "react")
          return {
            useState(initial) {
              const index = cursor++;
              if (!(index in states))
                states[index] = typeof initial === "function" ? initial() : initial;
              return [
                states[index],
                (value) => {
                  states[index] = value;
                },
              ];
            },
            useRef(initial) {
              const index = cursor++;
              if (!(index in states)) states[index] = { current: initial };
              return states[index];
            },
          };
        if (name === "../lib/gangOnboarding") return { createGangOnboardingRequest };
        if (name === "../lib/projectForm") return { localDate };
        if (name === "../components/GangHeadcount")
          return { GangManagement: "GangManagement", gangMoney: (value) => String(value) };
        if (name === "@tanstack/react-router") return { createFileRoute: () => () => ({}) };
        if (name === "../contexts/AuthContext")
          return { useAuth: () => ({ user: { role: "operations_admin" } }) };
        if (name === "sonner") return { toast: { success() {} } };
        if (name === "../lib/api")
          return {
            api: {
              async get() {
                return gangResponse;
              },
              async post(path, body) {
                calls.push({ path, body });
                if (body.operation === "gang_create") {
                  const gang = { gangId: "gng_1", ...body };
                  gangs.push(gang);
                  return gang;
                }
                const worker = {
                  workerId: "wor_1",
                  labourAttendanceId: "wor_1",
                  ...body,
                  gangName: gangs.find((gang) => gang.gangId === body.gangId)?.name,
                };
                workers.push(worker);
                return worker;
              },
            },
          };
        if (name === "@tanstack/react-query")
          return {
            useQueryClient: () => ({ invalidateQueries: async () => {} }),
            useQuery: ({ queryKey, queryFn }) => {
              queries.set(queryKey[0], queryFn);
              return {
                data: queryKey[0] === "worker-gangs" ? gangs : workers,
                isSuccess: true,
              };
            },
            useMutation: (options) => ({
              isPending: false,
              mutate: () => {
                const promise = options.mutationFn().then((result) => options.onSuccess(result));
                pending.push(promise);
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
    visit(module.exports.WorkersPage());
    return nodes;
  }
  return {
    render,
    calls,
    async loadGangs() {
      const response = await queries.get("worker-gangs")();
      gangs.splice(0, gangs.length, ...response);
    },
    async flush() {
      await Promise.all(pending);
      pending = [];
    },
  };
}

test("existing gangs open setup and account management without requiring named labourers", async () => {
  const app = workforce([{ gangId: "gng_saved", name: "Saved gang", status: "Active" }]);
  let screen = app.render();
  await app.loadGangs();
  screen.find((node) => node.type === "button" && node.props.children === "Gangs").props.onClick();
  screen = app.render();
  screen.find((node) => node.props?.className === "workers-gang-card").props.onClick();
  screen = app.render();
  assert.equal(
    screen.find((node) => node.type === "GangManagement").props.gang.gangId,
    "gng_saved",
  );
  assert.equal(
    screen.some((node) => node.props?.placeholder === "e.g. Ravi Kumar"),
    false,
  );
});

test("worker responses are rejected even when workers belong to a gang", async () => {
  for (const response of [
    [{ workerId: "wor_1", name: "Individual worker" }],
    [{ workerId: "wor_1", gangId: "gng_saved", name: "Gang member" }],
    [{ gangId: "gng_saved" }],
  ]) {
    const app = workforce(response);
    app.render();
    await assert.rejects(app.loadGangs(), /unexpected response/);
  }
});

test("create a gang with size and one rate, while individual registration remains separate", async () => {
  const app = workforce();
  let screen = app.render();
  screen
    .find(
      (node) =>
        node.type === "button" &&
        Array.isArray(node.props.children) &&
        node.props.children.includes("New gang"),
    )
    .props.onClick();
  for (const [label, value] of [
    ["Gang name", "Masonry gang"],
    ["Gang size", "10"],
    ["Gang daily rate", "800"],
  ]) {
    screen = app.render();
    screen
      .find((node) => node.props?.["aria-label"] === label)
      .props.onChange({ target: { value } });
  }
  screen = app.render();
  screen
    .find((node) => node.type === "form" && node.props.className.includes("workers-gang-create"))
    .props.onSubmit({ preventDefault() {} });
  await app.flush();
  assert.equal(app.calls.length, 1);
  const body = app.calls[0].body;
  assert.equal(body.operation, "gang_create");
  assert.equal(body.attendanceMode, "headcount");
  assert.equal(body.size, 10);
  assert.equal(body.rate, 800);
  assert.match(body.headcountFrom, /^\d{4}-\d{2}-\d{2}$/);
  screen = app.render();
  assert.equal(screen.find((node) => node.type === "GangManagement").props.gang.gangId, "gng_1");
  assert.equal(
    screen.some((node) => node.props?.placeholder === "e.g. Ravi Kumar"),
    false,
  );
  screen
    .find((node) => node.type === "button" && node.props.children === "Individual workers")
    .props.onClick();
  screen = app.render();
  screen
    .find((node) => node.props?.placeholder === "e.g. Ravi Kumar")
    .props.onChange({ target: { value: "Independent worker" } });
  screen = app.render();
  screen
    .find((node) => node.type === "form" && node.props.className === "workers-register")
    .props.onSubmit({ preventDefault() {} });
  await app.flush();
  assert.equal(app.calls[1].body.name, "Independent worker");
  assert.equal("gangId" in app.calls[1].body, false);
});
