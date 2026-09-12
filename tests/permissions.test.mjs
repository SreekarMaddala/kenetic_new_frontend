import test from "node:test";
import assert from "node:assert/strict";
import { parseIdentity, canAccessRoute, homeForRole } from "../src/lib/permissions.ts";

test("Cognito groups are the only source of the application role", () => {
  const user = parseIdentity({
    sub: "u1",
    "custom:org_id": "org1",
    "cognito:groups": ["supervisor"],
    role: "super_admin",
  });
  assert.equal(user.role, "supervisor");
  assert.equal(homeForRole(user.role), "/projects");
});
test("missing, unknown and multiple roles fail closed", () => {
  for (const groups of [undefined, [], ["admin"], ["super_admin", "supervisor"], "super_admin"]) {
    assert.throws(() =>
      parseIdentity({ sub: "u1", "custom:org_id": "org1", "cognito:groups": groups }),
    );
  }
  assert.throws(() => parseIdentity({ sub: "u1", "cognito:groups": ["operations_admin"] }));
});
test("supervisors cannot navigate to administration or finance", () => {
  for (const path of [
    "/organizations",
    "/employees",
    "/payments",
    "/settings",
    "/projects/p1/payroll",
    "/projects/p1/bills",
  ]) {
    assert.equal(canAccessRoute("supervisor", path), false, path);
  }
  assert.equal(canAccessRoute("supervisor", "/projects/p1/supervisors"), true);
});
test("each role gets its own landing page", () => {
  assert.equal(homeForRole("super_admin"), "/organizations");
  assert.equal(homeForRole("operations_admin"), "/dashboard");
  assert.equal(canAccessRoute("operations_admin", "/organizations"), false);
  assert.equal(canAccessRoute("super_admin", "/employees"), true);
});
