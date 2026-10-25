import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function workforce() {
  const module = { exports: {} };
  const states = [];
  const gangs = [];
  const workers = [];
  const calls = [];
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
      require(name) {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name === "react")
          return {
            useState(initial) {
              const index = cursor++;
              if (!(index in states)) states[index] = initial;
              return [
                states[index],
                (value) => {
                  states[index] = value;
                },
              ];
            },
          };
        if (name === "@tanstack/react-router") return { createFileRoute: () => () => ({}) };
        if (name === "../contexts/AuthContext")
          return { useAuth: () => ({ user: { role: "operations_admin" } }) };
        if (name === "sonner") return { toast: { success() {} } };
        if (name === "../lib/api")
          return {
            api: {
              async post(path, body) {
                calls.push({ path, body });
                if (body.operation === "gang_create") {
                  const gang = { gangId: "gng_1", name: body.name };
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
            useQuery: ({ queryKey }) => ({
              data: queryKey[0] === "worker-gangs" ? gangs : workers,
              isSuccess: true,
            }),
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
    async flush() {
      await Promise.all(pending);
      pending = [];
    },
  };
}

test("create a gang first, then register workers directly inside it", async () => {
  const app = workforce();
  let screen = app.render();
  assert.ok(screen.some((node) => node.props?.title === "Individual workers"));
  screen.find((node) => node.type === "button" && node.props.children === "Gangs").props.onClick();
  screen = app.render();
  assert.equal(
    screen.some((node) => node.type === "form" && node.props.className === "workers-register"),
    false,
  );
  screen
    .find((node) => node.props?.["aria-label"] === "Gang name")
    .props.onChange({ target: { value: "Masonry gang" } });
  screen = app.render();
  screen
    .find((node) => node.type === "form" && node.props.className === "workers-gang-create")
    .props.onSubmit({ preventDefault() {} });
  await app.flush();
  screen = app.render();
  const table = screen.find((node) => node.props?.title === "Masonry gang — Members");
  assert.equal(table.props.rows.length, 0);
  assert.equal(app.calls[0].body.operation, "gang_create");
  assert.equal(app.calls[0].body.name, "Masonry gang");
  screen
    .find((node) => node.props?.placeholder === "e.g. Ravi Kumar")
    .props.onChange({ target: { value: "Ravi" } });
  screen = app.render();
  screen
    .find((node) => node.type === "form" && node.props.className === "workers-register")
    .props.onSubmit({ preventDefault() {} });
  await app.flush();
  assert.equal(app.calls[1].body.operation, "register");
  assert.equal(app.calls[1].body.gangId, "gng_1");
  assert.equal(app.calls[1].body.name, "Ravi");
  screen = app.render();
  const members = screen.find((node) => node.props?.title === "Masonry gang — Members").props.rows;
  assert.equal(members.length, 1);
  assert.equal(members[0].gangName, "Masonry gang");
  screen
    .find((node) => node.type === "button" && node.props.children === "Individual workers")
    .props.onClick();
  screen = app.render();
  assert.equal(
    screen.some((node) => node.type === "form" && node.props.className === "workers-register"),
    true,
  );
  assert.equal(
    screen.find((node) => node.props?.title === "Individual workers").props.rows.length,
    0,
  );
  screen
    .find((node) => node.props?.placeholder === "e.g. Ravi Kumar")
    .props.onChange({ target: { value: "Independent worker" } });
  screen = app.render();
  screen
    .find((node) => node.type === "form" && node.props.className === "workers-register")
    .props.onSubmit({ preventDefault() {} });
  await app.flush();
  assert.equal(app.calls[2].body.name, "Independent worker");
  assert.equal("gangId" in app.calls[2].body, false);
  screen = app.render();
  assert.equal(
    screen.find((node) => node.props?.title === "Individual workers").props.rows.length,
    1,
  );
});
