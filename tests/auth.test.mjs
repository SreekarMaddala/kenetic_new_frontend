import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as permissions from "../src/lib/permissions.ts";

function harness({ challenge = false, serverStatus = 200, role = "operations_admin" } = {}) {
  const calls = [];
  const payload = {
    sub: "u1",
    "custom:org_id": "org1",
    "cognito:groups": [role],
    email: "user@example.com",
    name: "User",
  };
  const session = {
    isValid: () => true,
    getIdToken: () => ({ decodePayload: () => payload, getJwtToken: () => "signed-token" }),
  };
  let current = null;
  class User {
    constructor({ Username }) {
      this.username = Username;
    }
    getUsername() {
      return this.username;
    }
    authenticateUser(details, callbacks) {
      current = this;
      if (challenge) callbacks.newPasswordRequired({}, []);
      else callbacks.onSuccess(session);
    }
    completeNewPasswordChallenge(password, attributes, callbacks) {
      calls.push({ password, attributes });
      callbacks.onSuccess(session);
    }
    getSession(callback) {
      callback(null, session);
    }
    signOut() {
      calls.push("signOut");
      current = null;
    }
  }
  const source = readFileSync(new URL("../src/lib/auth.ts", import.meta.url), "utf8").replaceAll(
    "import.meta.env",
    "__env",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const context = vm.createContext({
    exports,
    __env: {
      VITE_COGNITO_USER_POOL_ID: "pool",
      VITE_COGNITO_CLIENT_ID: "client",
      VITE_API_BASE_URL: "https://api.example.test",
    },
    require: (name) =>
      name === "./permissions"
        ? permissions
        : {
            CognitoUser: User,
            AuthenticationDetails: class {},
            CognitoUserPool: class {
              getCurrentUser() {
                return current;
              }
            },
          },
    window: { setTimeout, clearTimeout },
    AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: serverStatus === 200,
        json: async () => ({
          data: { sub: "u1", orgId: "org1", role },
          error: { message: "Account disabled" },
        }),
      };
    },
  });
  vm.runInContext(output, context);
  return { auth: exports, calls };
}

test("login validates the backend account and includes its signed token", async () => {
  const { auth, calls } = harness();
  const user = await auth.signIn("User@Example.com", "unused-test-password");
  assert.equal(user.role, "operations_admin");
  assert.equal(user.orgId, "org1");
  assert.equal(calls[0].url, "https://api.example.test/auth/me");
  assert.equal(calls[0].options.headers.Authorization, "Bearer signed-token");
});
test("temporary-password invitations complete the Cognito challenge", async () => {
  const { auth, calls } = harness({ challenge: true });
  await assert.rejects(auth.signIn("user@example.com", "temporary"), auth.NewPasswordRequiredError);
  assert.equal(calls.length, 0);
  const user = await auth.completeNewPassword("New-password-123!");
  assert.equal(user.sub, "u1");
  assert.equal(calls[0].password, "New-password-123!");
  await assert.rejects(auth.completeNewPassword("Another-password-123!"), /expired/);
});
test("disabled backend account cannot become a frontend session", async () => {
  const { auth, calls } = harness({ serverStatus: 403 });
  await assert.rejects(auth.signIn("user@example.com", "password"), /Account disabled/);
  assert.ok(calls.includes("signOut"));
  assert.equal(await auth.getCurrentUser(), null);
});
test("logout cancels a pending invitation challenge", async () => {
  const { auth } = harness({ challenge: true });
  await assert.rejects(auth.signIn("user@example.com", "temporary"));
  auth.clearTokens();
  await assert.rejects(auth.completeNewPassword("New-password-123!"), /expired/);
});
