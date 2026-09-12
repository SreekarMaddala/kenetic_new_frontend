import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function harness(patch = async () => ({})) {
  const module = { exports: {} };
  const source = ts.transpileModule(
    readFileSync(new URL("../src/components/WorkflowLedger.tsx", import.meta.url), "utf8"),
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
    require: (name) => (name === "../lib/api" ? { api: { patch } } : {}),
    FormData,
    Number,
    String,
    Error,
    encodeURIComponent,
  });
  return module.exports;
}
test("approval action keeps the project scope and safely encodes the record ID", async () => {
  const calls = [];
  const { reviewActions } = harness(async (...args) => calls.push(args));
  const approve = reviewActions(
    "/supervisor/materials/indents?projectId=project%2F1",
    "materialId",
    true,
  )[0];
  assert.equal(approve.visible({ status: "pending" }), true);
  assert.equal(approve.visible({ status: "approved" }), false);
  await approve.run({ materialId: "request/1#x" });
  assert.equal(calls[0][0], "/supervisor/materials/indents/request%2F1%23x?projectId=project%2F1");
  assert.equal(calls[0][1].status, "approved");
});
test("failed approval remains a rejected operation for the error UI", async () => {
  const { reviewActions } = harness(async () => {
    throw new Error("Not authorized");
  });
  await assert.rejects(
    reviewActions("/payments", "paymentId")[0].run({ paymentId: "p1" }),
    /Not authorized/,
  );
});
test("ledger form retains scope and zero while validating positive amounts", () => {
  const { readLedgerForm } = harness();
  const form = new FormData();
  form.set("amount", "15.5");
  form.set("rate", "0");
  form.set("name", "  Cement  ");
  const fields = [
    { key: "amount", label: "Amount", type: "number", min: 0.01, required: true },
    { key: "rate", label: "Rate", type: "number" },
    { key: "name", label: "Name", required: true },
  ];
  const result = readLedgerForm(fields, form, { projectId: "P1", requestId: "req1" });
  assert.equal(result.amount, 15.5);
  assert.equal(result.rate, 0);
  assert.equal(result.projectId, "P1");
  assert.equal(result.requestId, "req1");
  assert.equal(result.name, "Cement");
  for (const value of ["", "0", "-1", "Infinity", "NaN"]) {
    form.set("amount", value);
    assert.throws(() => readLedgerForm(fields, form));
  }
});
