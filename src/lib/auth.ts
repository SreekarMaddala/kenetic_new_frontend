/**
 * src/lib/auth.ts
 * Cognito authentication helpers using amazon-cognito-identity-js.
 * All tokens are stored in localStorage and auto-refreshed by the SDK.
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type ISignUpResult,
} from "amazon-cognito-identity-js";

// ── Pool configuration ────────────────────────────────────────────────────────

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
};

export const userPool = new CognitoUserPool(poolData);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  email: string;
  name: string;
  sub: string;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getIdToken(): string | null {
  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) return null;
  // Token is stored in localStorage by the SDK as:
  // CognitoIdentityServiceProvider.<clientId>.<username>.idToken
  const key = `CognitoIdentityServiceProvider.${poolData.ClientId}.${cognitoUser.getUsername()}.idToken`;
  return localStorage.getItem(key);
}

export function clearTokens(): void {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) cognitoUser.signOut();
}

// ── getCurrentUser ────────────────────────────────────────────────────────────

export function getCurrentUser(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return resolve(null);

    cognitoUser.getSession((err: Error | null, session: { isValid: () => boolean }) => {
      if (err || !session?.isValid()) return resolve(null);

      cognitoUser.getUserAttributes((attrErr, attributes) => {
        if (attrErr || !attributes) return resolve(null);
        const get = (name: string) => attributes.find((a) => a.getName() === name)?.getValue() ?? "";
        resolve({ email: get("email"), name: get("name"), sub: get("sub") });
      });
    });
  });
}

// ── signIn ────────────────────────────────────────────────────────────────────

export function signIn(email: string, password: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const payload = session.getIdToken().decodePayload();
        resolve({
          email: payload["email"] as string,
          name: (payload["name"] as string) ?? (payload["email"] as string),
          sub: payload["sub"] as string,
        });
      },
      onFailure: (err) => {
        if (err.code === "NotAuthorizedException") {
          reject(new Error("Incorrect email or password."));
        } else if (err.code === "UserNotConfirmedException") {
          reject(new Error("Please confirm your email address before logging in."));
        } else if (err.code === "UserNotFoundException") {
          reject(new Error("No account found with this email address."));
        } else {
          reject(new Error(err.message ?? "Sign in failed."));
        }
      },
      newPasswordRequired: () => {
        reject(new Error("A new password is required. Please contact your administrator."));
      },
    });
  });
}

// ── signOut ───────────────────────────────────────────────────────────────────

export function signOut(): void {
  clearTokens();
}

// ── signUp ────────────────────────────────────────────────────────────────────

export function signUp(email: string, password: string, name: string): Promise<ISignUpResult> {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
      new CognitoUserAttribute({ Name: "name", Value: name }),
    ];
    userPool.signUp(email, password, attributes, [], (err, result) => {
      if (err || !result) return reject(new Error(err?.message ?? "Sign-up failed."));
      resolve(result);
    });
  });
}

// ── confirmSignUp ─────────────────────────────────────────────────────────────

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) return reject(new Error(err.message ?? "Confirmation failed."));
      resolve();
    });
  });
}

// ── refreshSession ────────────────────────────────────────────────────────────

export function refreshSession(): Promise<string | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return resolve(null);
    cognitoUser.getSession((err: Error | null, session: { isValid: () => boolean; getIdToken: () => { getJwtToken: () => string } }) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}
