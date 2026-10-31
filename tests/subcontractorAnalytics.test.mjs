import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

test("subcontractor analysis renders every project, advances, and classified payment history", () => {
  const module = { exports: {} };
  const source = ts.transpileModule(
    readFileSync(new URL("../src/components/SubcontractorAnalytics.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require: (name) =>
      name === "react" ? React : name === "react/jsx-runtime" ? jsx : { exportToExcel() {} },
  });
  const zero = {
    contractValue: 1000,
    advancesPaid: 100,
    workPayments: 50,
    unclassifiedPaid: 0,
    totalPaid: 150,
    pendingPayments: 20,
  };
  const report = {
    subcontractorId: "rajesh",
    name: "Rajesh Shuttering",
    contactPerson: "Rajesh",
    trade: "Shuttering",
    projects: [
      {
        ...zero,
        projectId: "site-a",
        projectName: "Site A",
        scopeOfWork: "Slab A",
        assignmentStatus: "Active",
        payments: [
          {
            paymentId: "p1",
            date: "2026-10-31",
            paymentType: "Advance",
            amount: 100,
            status: "Approved",
            mode: "Cash",
          },
        ],
      },
      {
        ...zero,
        projectId: "site-b",
        projectName: "Site B",
        scopeOfWork: "Slab B",
        assignmentStatus: "Inactive",
        payments: [
          {
            paymentId: "p2",
            date: "2026-10-30",
            paymentType: "",
            amount: 50,
            status: "Reversed",
            mode: "Cash",
          },
        ],
      },
    ],
  };
  const html = renderToStaticMarkup(
    React.createElement(module.exports.SubcontractorAnalytics, { report }),
  );
  assert.match(html, /Rajesh Shuttering/);
  assert.match(html, /Site A/);
  assert.match(html, /Site B/);
  assert.match(html, /Advances paid/);
  assert.match(html, /Unclassified/);
  assert.match(html, /Reversed/);
  assert.match(html, /\/projects\/site-a\/subcontractors/);
  assert.match(html, /\/projects\/site-b\/subcontractors/);
});
