import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";
import { parseIdentity, type AppRole } from "./permissions";

const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string;
export const userPool =
  poolId && clientId ? new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId }) : null;
let pendingUser: CognitoUser | null = null;

export interface AuthUser {
  email: string;
  name: string;
  sub: string;
  orgId: string;
  role: AppRole;
}
export class NewPasswordRequiredError extends Error {
  constructor() {
    super("Choose a permanent password to activate your invitation.");
  }
}
function pool() {
  if (!userPool) throw new Error("Authentication is not configured. Contact your administrator.");
  return userPool;
}
async function userFromSession(session: CognitoUserSession): Promise<AuthUser> {
  const payload = session.getIdToken().decodePayload();
  const identity = parseIdentity(payload);
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/auth/me`, {
    headers: { Authorization: `Bearer ${session.getIdToken().getJwtToken()}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body?.error?.message ?? "Your account cannot access this workspace.");
  if (
    body.data.sub !== identity.sub ||
    body.data.orgId !== identity.orgId ||
    body.data.role !== identity.role
  ) {
    throw new Error("Your account permissions changed. Sign in again.");
  }
  return {
    ...identity,
    email: String(payload.email ?? ""),
    name: String(payload.name ?? payload.email ?? ""),
  };
}
function sessionFor(user: CognitoUser): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("Session refresh timed out. Please try again.")),
      10_000,
    );
    user.getSession((error: Error | null, session: CognitoUserSession) => {
      window.clearTimeout(timeout);
      if (error || !session?.isValid()) reject(error ?? new Error("Your session expired."));
      else resolve(session);
    });
  });
}
export async function getCurrentUser(): Promise<AuthUser | null> {
  const user = userPool?.getCurrentUser();
  if (!user) return null;
  try {
    return await userFromSession(await sessionFor(user));
  } catch (error) {
    user.signOut();
    throw error;
  }
}
function authenticate(
  run: (callbacks: Parameters<CognitoUser["authenticateUser"]>[1]) => void,
): Promise<AuthUser> {
  return new Promise((resolve, reject) =>
    run({
      onSuccess: (session) => {
        pendingUser = null;
        userFromSession(session)
          .then(resolve)
          .catch((error) => {
            clearTokens();
            reject(error);
          });
      },
      onFailure: (error) =>
        reject(
          new Error(
            error.code === "NotAuthorizedException" || error.code === "UserNotFoundException"
              ? "Incorrect email or password."
              : (error.message ?? "Sign in failed."),
          ),
        ),
      newPasswordRequired: () => reject(new NewPasswordRequiredError()),
      mfaRequired: () =>
        reject(
          new Error(
            "This account requires MFA. Contact your administrator for the configured sign-in method.",
          ),
        ),
      totpRequired: () =>
        reject(
          new Error(
            "This account requires MFA. Contact your administrator for the configured sign-in method.",
          ),
        ),
    }),
  );
}
export function signIn(email: string, password: string): Promise<AuthUser> {
  const user = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool() });
  pendingUser = user;
  return authenticate((callbacks) =>
    user.authenticateUser(
      new AuthenticationDetails({ Username: user.getUsername(), Password: password }),
      callbacks,
    ),
  );
}
export function completeNewPassword(password: string): Promise<AuthUser> {
  const user = pendingUser;
  if (!user)
    return Promise.reject(
      new Error("Your invitation session expired. Sign in with your temporary password again."),
    );
  return authenticate((callbacks) => user.completeNewPasswordChallenge(password, {}, callbacks));
}
export function clearTokens(): void {
  pendingUser = null;
  userPool?.getCurrentUser()?.signOut();
}
export const signOut = clearTokens;
export async function refreshSession(): Promise<string | null> {
  const user = userPool?.getCurrentUser();
  if (!user) return null;
  try {
    return (await sessionFor(user)).getIdToken().getJwtToken();
  } catch {
    clearTokens();
    return null;
  }
}
export function forgotPassword(email: string): Promise<void> {
  const user = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool() });
  return new Promise((resolve, reject) =>
    user.forgotPassword({
      onSuccess: () => resolve(),
      inputVerificationCode: () => resolve(),
      onFailure: reject,
    }),
  );
}
export function resetPassword(email: string, code: string, password: string): Promise<void> {
  const user = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool() });
  return new Promise((resolve, reject) =>
    user.confirmPassword(code, password, { onSuccess: () => resolve(), onFailure: reject }),
  );
}
