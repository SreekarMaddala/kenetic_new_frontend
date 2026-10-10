import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function harness(responses) {
  const calls = [];
  const module = { exports: {} };
  const source = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8").replaceAll(
    "import.meta.env",
    "({ DEV: true })",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, {
    module,
    exports: module.exports,
    URL,
    URLSearchParams,
    AbortSignal,
    Error,
    window: { location: {} },
    require: () => ({ refreshSession: async () => "signed-token" }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return {
        ok: (response.status ?? 200) < 300,
        status: response.status ?? 200,
        json: async () => response.body,
      };
    },
  });
  return {
    api: module.exports.api,
    governanceApi: module.exports.governanceApi,
    reportsApi: module.exports.reportsApi,
    calls,
  };
}

test("collection page preserves filters and fetches only the requested page", async () => {
  const { api, calls } = harness([
    { body: { data: [{ id: "one" }], pagination: { nextCursor: "next/token" } } },
  ]);
  const result = await api.page("/expenses?projectId=pro_one", "prior/token");
  assert.equal(result.items.length, 1);
  assert.equal(result.nextCursor, "next/token");
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url, "https://example.com");
  assert.equal(url.searchParams.get("projectId"), "pro_one");
  assert.equal(url.searchParams.get("cursor"), "prior/token");
  assert.equal(url.searchParams.get("limit"), "50");
  assert.equal(calls[0].options.headers.Authorization, "Bearer signed-token");
});

test("selectors collect all pages including an empty filtered page", async () => {
  const { api, calls } = harness([
    { body: { data: [{ id: "one" }], pagination: { nextCursor: "two" } } },
    { body: { data: [], pagination: { nextCursor: "three" } } },
    { body: { data: [{ id: "three" }], pagination: { nextCursor: null } } },
  ]);
  const result = await api.get("/vendors?orgId=org_one");
  assert.equal(JSON.stringify(result), '[{"id":"one"},{"id":"three"}]');
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.url.includes("orgId=org_one")));
});

test("failed continuation never returns an incomplete export or selector", async () => {
  const { api } = harness([
    { body: { data: [{ id: "one" }], pagination: { nextCursor: "two" } } },
    { status: 502, body: { error: { message: "Read failed" } } },
  ]);
  await assert.rejects(api.get("/expenses"), /Read failed/);
});

test("payroll generation returns the cycle in one request", async () => {
  const { governanceApi, calls } = harness([
    { body: { data: { cycleId: "cycle_one", staff: [] } } },
  ]);
  assert.equal(
    (await governanceApi.generatePayroll("project_one", "2026-10")).cycleId,
    "cycle_one",
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/projects/project_one/payroll");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.body, JSON.stringify({ month: "2026-10" }));
});

test("payroll failure is returned without automatic resubmission", async () => {
  const { governanceApi, calls } = harness([
    { status: 400, body: { error: { message: "Invalid month" } } },
  ]);
  await assert.rejects(governanceApi.generatePayroll("project_one", "bad"), /Invalid month/);
  assert.equal(calls.length, 1);
});

test("executive report fetches the selected period directly", async () => {
  const { reportsApi, calls } = harness([{ body: { data: { projectSummaries: [] } } }]);
  const result = await reportsApi.executive({ startDate: "2026-10-01", endDate: "2026-10-31" });
  assert.equal(result.projectSummaries.length, 0);
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url, "https://example.com");
  assert.equal(url.pathname, "/api/reports/executive");
  assert.equal(url.searchParams.get("startDate"), "2026-10-01");
  assert.equal(url.searchParams.get("endDate"), "2026-10-31");
});
