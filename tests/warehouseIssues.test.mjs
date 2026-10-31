import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { materialSelectionFields } from "../src/lib/materialSelection.ts";

function component(path, modules) {
  const module = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require: (name) => (name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : (modules[name] ?? {})),
  });
  return module.exports;
}

function warehouse(projectId = "project-a", amount = 10) {
  const calls = [];
  const stock = [
    {
      itemId: "cement",
      name: "Cement",
      category: "Binding",
      unit: "Bags",
      centralStock: amount,
      projectBalances: [{ projectId: "project-a", quantity: 3 }],
    },
  ];
  const { WarehouseIssues } = component("../src/components/WarehouseIssues.tsx", {
    "./WorkflowLedger": { WorkflowLedger: "ledger" },
    "../lib/api": { api: { post: (...args) => calls.push(args) } },
    "../lib/ProjectContext": {
      useProject: () => ({
        projectId,
        project: { name: "Site A" },
        projects: [{ projectId: "project-a", name: "Site A" }],
      }),
    },
    "@tanstack/react-query": { useQuery: () => ({ data: stock }) },
    "../lib/materialSelection": { materialSelectionFields },
  });
  return { props: WarehouseIssues({}).props, calls };
}

function projectMaterials(role = "operations_admin", amount = 10) {
  const calls = [];
  const { Route } = component("../src/routes/projects/$projectId/materials.tsx", {
    "@tanstack/react-router": { createFileRoute: () => (config) => ({ ...config, useParams: () => ({ projectId: "project-a" }) }) },
    "../../../components/WorkflowLedger": { WorkflowLedger: "ledger" },
    "../../../lib/api": { api: { post: (...args) => calls.push(args) } },
    "../../../lib/ProjectContext": { useProject: () => ({ project: { name: "Site A" } }) },
    "../../../contexts/AuthContext": { useAuth: () => ({ user: { role } }) },
    "../../../lib/materialSelection": { materialSelectionFields },
    "@tanstack/react-query": { useQuery: () => ({ data: [{ itemId: "cement", name: "Cement", category: "Binding", unit: "Bags", centralStock: amount, status: "Active" }] }) },
  });
  return { view: Route.component(), calls };
}

test("project materials is one table with allocation directly to the current project", () => {
  const { view, calls } = projectMaterials();
  assert.equal(view.type, "ledger");
  assert.equal(view.props.title, "Project Materials");
  assert.equal(view.props.createLabel, "Allocate to this project");
  assert.equal(view.props.fields.some((f) => f.key === "targetProjectId" || f.key === "movementType"), false);
  assert.deepEqual(Array.from(view.props.columns, (c) => c.label), ["Category", "Material", "Received", "Used", "Returned", "Remaining", "Unit"]);
  view.props.onCreate({ category: "Binding", itemId: "cement", qty: 2, targetProjectId: "other-project", requestId: "allocation-001" });
  assert.equal(calls[0][0], "/warehouse/issue-vouchers");
  assert.equal(calls[0][1].targetProjectId, "project-a");
  assert.equal(calls[0][1].movementType, "issue");
  assert.equal(calls[0][1].qty, 2);
});

test("project allocation respects available warehouse stock and administrator permissions", () => {
  const { view, calls } = projectMaterials("operations_admin", 0);
  assert.throws(() => view.props.onCreate({ category: "Binding", itemId: "cement", qty: 9 }), /0 Bags available/);
  assert.equal(calls.length, 0);
  const supervisor = projectMaterials("supervisor");
  assert.equal(supervisor.view.props.fields, undefined);
  assert.throws(() => supervisor.view.props.onCreate({}), /Only administrators/);
});

test("project movements inherit the active project without any project selector", () => {
  const { props, calls } = warehouse();
  assert.equal(
    props.fields.some((f) => f.key === "targetProjectId"),
    false,
  );
  assert.equal(props.defaults.targetProjectId, "project-a");
  props.onCreate({
    category: "Binding",
    itemId: "cement",
    qty: 2,
    targetProjectId: "other-project",
    movementType: "issue",
  });
  assert.equal(calls[0][1].targetProjectId, "project-a");
  assert.match(props.description, /Site A/);
});

test("global movements require a project selection", () => {
  const global = warehouse(null);
  assert.equal(
    global.props.fields.some((f) => f.key === "targetProjectId"),
    true,
  );
  assert.throws(
    () => global.props.onCreate({ category: "Binding", itemId: "cement", qty: 2 }),
    /Select the destination project/,
  );
  assert.equal(global.calls.length, 0);
});

test("zero stock explains receipt requirements and prevents an invalid API submission", () => {
  const { props, calls } = warehouse("project-a", 0);
  const field = props.fields.find((f) => f.key === "itemId");
  assert.match(
    field.helperText({ itemId: "cement", movementType: "issue" }),
    /No stock.*Record a warehouse receipt/,
  );
  assert.throws(
    () => props.onCreate({ category: "Binding", itemId: "cement", qty: 9 }),
    /0 Bags available; you entered 9.*Record a warehouse receipt/,
  );
  assert.equal(calls.length, 0);
});

test("usage and returns are limited by the current project's remaining material", () => {
  const { props, calls } = warehouse();
  for (const movementType of ["usage", "return"]) {
    assert.throws(
      () => props.onCreate({ category: "Binding", itemId: "cement", qty: 4, movementType }),
      /This project has 3 Bags/,
    );
  }
  assert.equal(calls.length, 0);
});

test("project provider resolves child project params from above the route outlet", () => {
  let state = {
    location: { pathname: "/projects/project-a/materials" },
    matches: [{ params: {} }, { params: { projectId: "project-a" } }],
  };
  const { ProjectProvider } = component("../src/lib/ProjectContext.tsx", {
    react: { createContext: () => ({ Provider: "provider" }) },
    "@tanstack/react-router": {
      useRouterState: ({ select }) => select(state),
      useNavigate: () => () => {},
    },
    "@tanstack/react-query": {
      useQuery: () => ({ data: [{ projectId: "project-a", name: "Site A" }] }),
    },
    "../contexts/AuthContext": { useAuth: () => ({ user: { role: "operations_admin" } }) },
  });
  assert.equal(ProjectProvider({}).props.value.projectId, "project-a");
  assert.equal(ProjectProvider({}).props.value.project.name, "Site A");
  state = { location: { pathname: "/inventory" }, matches: [{ params: {} }] };
  assert.equal(ProjectProvider({}).props.value.projectId, undefined);
});
