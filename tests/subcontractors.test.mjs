import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useInfiniteQuery,
} from "@tanstack/react-query";

test("project subcontractor selectors coexist with cached paginated ledgers", () => {
  const endpoint = "/projects/pro_one/subcontractors";
  const company = {
    subcontractorId: "sub_one",
    name: "ABC Works",
    trade: "Electrical",
    status: "Active",
  };
  const assignment = {
    subcontractorId: "sub_assignment",
    registryId: "sub_one",
    name: "ABC Works",
    status: "Active",
    type: "Contractor",
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const page = (items) => ({ pages: [{ items, nextCursor: null }], pageParams: [null] });
  client.setQueryData(["ledger", "/subcontractors"], page([company]));
  client.setQueryData(["ledger", endpoint], page([assignment]));
  client.setQueryData(["subcontractor-options", "/subcontractors"], [company]);
  client.setQueryData(["subcontractor-options", endpoint], [assignment]);

  const ledgers = [];
  function Ledger(props) {
    const query = useInfiniteQuery({
      queryKey: ["ledger", props.endpoint],
      initialPageParam: null,
      queryFn: async () => ({ items: [], nextCursor: null }),
      getNextPageParam: () => undefined,
    });
    const rows = props.transform(query.data.pages.flatMap((p) => p.items));
    ledgers.push({ ...props, rows });
    return React.createElement("div", null, props.title);
  }
  let Page;
  const exports = {};
  const source = readFileSync(
    new URL("../src/routes/projects/$projectId/subcontractors.tsx", import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(output, {
    exports,
    require: (name) => {
      if (name === "react/jsx-runtime") return jsx;
      if (name === "@tanstack/react-query") return { useQuery };
      if (name === "@tanstack/react-router")
        return {
          createFileRoute: () => (options) => {
            Page = options.component;
            return { useParams: () => ({ projectId: "pro_one" }) };
          },
          Link: ({ children }) => React.createElement("a", null, children),
        };
      if (name.endsWith("WorkflowLedger"))
        return { WorkflowLedger: Ledger, reviewActions: () => [], recordUrl: () => "" };
      if (name.endsWith("lib/api")) return { api: { get: async () => [] } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  try {
    const render = () =>
      renderToString(
        React.createElement(QueryClientProvider, { client }, React.createElement(Page)),
      );
    assert.match(render(), /Assigned Subcontractors/);
    assert.equal(ledgers[0].rows.length, 1);
    assert.equal(ledgers[0].fields[0].options.length, 0);
    assert.equal(ledgers[1].fields[1].options[0].value, "sub_assignment");

    // With no assignments, the active company is available for assignment
    // and procurement has no contractor choices.
    client.setQueryData(["subcontractor-options", endpoint], []);
    ledgers.length = 0;
    render();
    assert.equal(ledgers[0].fields[0].options[0].value, "sub_one");
    assert.equal(ledgers[1].fields[1].options.length, 0);
  } finally {
    client.clear();
  }
});
