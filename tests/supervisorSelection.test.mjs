import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { attendanceCalendarDate, monthlyAttendanceRows } from "../src/lib/supervisorAttendance.ts";

test("organization supervisors appear before attendance and a click opens the selected report", () => {
  const module = { exports: {} };
  const states = [];
  let user = { role: "operations_admin" };
  let attendance = [];
  let stateIndex = 0;
  const jsx = (type, props) => ({ type, props });
  const employees = [
    { employeeId: "s1", name: "Assigned Supervisor", role: "supervisor", orgId: "o1" },
    { employeeId: "s2", name: "New Supervisor", role: "supervisor", orgId: "o1" },
    { employeeId: "s3", name: "Other Organization", role: "supervisor", orgId: "o2" },
    { employeeId: "a1", name: "Admin", role: "operations_admin", orgId: "o1" },
  ];
  const source = readFileSync(
    new URL("../src/routes/projects/$projectId/supervisors.tsx", import.meta.url),
    "utf8",
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      module,
      exports: module.exports,
      require(name) {
        if (name.endsWith("/lib/api"))
          return { employeeApi: { list() {} }, projectApi: {}, api: {} };
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
        if (name === "react")
          return {
            useState(initial) {
              const index = stateIndex++;
              if (!(index in states))
                states[index] = typeof initial === "function" ? initial() : initial;
              return [
                states[index],
                (value) => {
                  states[index] = value;
                },
              ];
            },
          };
        if (name === "@tanstack/react-router")
          return {
            createFileRoute: () => (config) => ({
              ...config,
              useParams: () => ({ projectId: "p1" }),
            }),
          };
        if (name.endsWith("AuthContext")) return { useAuth: () => ({ user }) };
        if (name.endsWith("supervisorAttendance"))
          return { attendanceCalendarDate, monthlyAttendanceRows };
        if (name === "@tanstack/react-query")
          return {
            useQueryClient: () => ({}),
            useMutation: () => ({}),
            useQuery: ({ queryKey }) => ({
              data:
                queryKey[0] === "project"
                  ? { name: "Site", orgId: "o1", supervisorIds: ["s1"] }
                  : queryKey[0] === "employees"
                    ? employees
                    : attendance,
            }),
          };
        return {};
      },
    },
  );
  function render() {
    stateIndex = 0;
    const nodes = [];
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(module.exports.Route.component());
    return nodes;
  }
  function content(node) {
    if (Array.isArray(node)) return node.map(content).join("");
    if (node && typeof node === "object") return content(node.props?.children);
    return node == null ? "" : String(node);
  }
  const initial = render();
  const choices = initial.filter((node) => node.type === "button" && "aria-pressed" in node.props);
  assert.equal(choices.length, 2);
  assert.ok(choices.every((node) => node.props["aria-pressed"] === false));
  assert.ok(initial.some((node) => content(node).includes("Click a supervisor from the list")));
  choices.find((node) => content(node).includes("New Supervisor")).props.onClick();
  const selected = render();
  assert.ok(
    selected.some((node) => node.type === "h2" && content(node).includes("New Supervisor")),
  );
  assert.equal(
    selected.filter((node) => node.type === "tbody")[0].props.children.length,
    monthlyAttendanceRows([], attendanceCalendarDate().slice(0, 7)).length,
  );
  user = {
    role: "supervisor",
    sub: "cognito-login-id",
    employeeId: "s1",
    name: "Assigned Supervisor",
  };
  attendance = [
    {
      supervisorId: "s1",
      date: new Date().toISOString().slice(0, 10),
      checkIn: new Date().toISOString(),
    },
  ];
  states.length = 0;
  const ownReport = render();
  assert.ok(ownReport.some((node) => node.type === "td" && content(node) === "Checked in"));
  assert.equal(
    ownReport.find((node) => node.type === "button" && content(node) === "Check In").props.disabled,
    true,
  );
  assert.equal(
    ownReport.find((node) => node.type === "button" && content(node) === "Check Out").props
      .disabled,
    false,
  );
});
