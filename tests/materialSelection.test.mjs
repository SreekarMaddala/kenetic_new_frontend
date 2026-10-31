import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { materialSelectionFields } from "../src/lib/materialSelection.ts";

function readForm() {
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
    require: () => ({}),
    FormData,
    Number,
    String,
    Error,
  });
  return module.exports.readLedgerForm;
}

test("material selection rejects a material from another category or an inactive material", () => {
  const fields = materialSelectionFields([
    { itemId: "cement", name: "Cement", category: "Binding", unit: "Bags", status: "Active" },
    { itemId: "steel", name: "Steel", category: "Reinforcement", unit: "Kg", status: "Active" },
    { itemId: "old", name: "Old cement", category: "Binding", unit: "Bags", status: "Inactive" },
  ]);
  const read = readForm();
  const form = new FormData();
  form.set("category", "Binding");
  form.set("itemId", "cement");
  assert.equal(read(fields, form).itemId, "cement");
  for (const invalid of ["steel", "old", "missing", ""]) {
    form.set("itemId", invalid);
    assert.throws(() => read(fields, form), /Material is required|Select a valid material/);
  }
  form.set("category", "");
  assert.throws(() => read(fields, form), /Material category is required/);
});
