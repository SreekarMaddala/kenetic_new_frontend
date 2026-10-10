import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("CSV download escapes formulas and CSV syntax while preserving numeric amounts", async () => {
  const module = { exports: {} };
  let downloaded;
  let clicks = 0;
  const anchor = { click: () => clicks++ };
  const source = readFileSync(new URL("../src/lib/excel.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(js, {
    module,
    exports: module.exports,
    Blob,
    console: { warn() {} },
    URL: {
      createObjectURL: (blob) => {
        downloaded = blob;
        return "blob:test";
      },
      revokeObjectURL() {},
    },
    document: { createElement: () => anchor, body: { appendChild() {}, removeChild() {} } },
  });
  module.exports.exportToExcel(
    [
      { name: "=SUM(1,2)", amount: -12.5 },
      { name: " +cmd", amount: 0 },
      { name: "@formula", amount: 1 },
      { name: "\tformula", amount: 2 },
      { name: 'a,"b"\nc', amount: 3 },
    ],
    "report.xlsx",
  );
  const csv = await downloaded.text();
  assert.ok(csv.includes('"\'=SUM(1,2)",-12.5'));
  assert.ok(csv.includes("' +cmd,0"));
  assert.ok(csv.includes("'@formula,1"));
  assert.ok(csv.includes("'\tformula,2"));
  assert.ok(csv.includes('"a,""b""\nc",3'));
  assert.equal(anchor.download, "report.csv");
  assert.equal(clicks, 1);
  module.exports.exportToExcel([], "empty.csv");
  assert.equal(clicks, 1);
});
