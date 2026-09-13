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
  const baseUrl = ((import.meta.env.VITE_API_BASE_URL as string) ?? "").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/auth/me`, {
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
      onFailure: (error: any) => {
        const errCode = error?.code || "";
        const errMsg = error?.message || "";
        if (errCode === "NotAuthorizedException") {
          if (errMsg.toLowerCase().includes("temporary password has expired") || errMsg.toLowerCase().includes("expired")) {
            reject(new Error("Your temporary password has expired. Please ask your administrator to issue a new temporary password."));
          } else if (errMsg.toLowerCase().includes("password reset required")) {
            reject(new Error("Password reset required. Please click 'Forgot your password?' below to set a new password."));
          } else {
            reject(new Error("Incorrect email or password."));
          }
        } else if (errCode === "UserNotFoundException") {
          reject(new Error("Incorrect email or password."));
        } else if (errCode === "InvalidPasswordException") {
          reject(new Error("Password does not meet security requirements (use 12+ characters with uppercase, lowercase, number, and symbol)."));
        } else if (errCode === "LimitExceededException") {
          reject(new Error("Too many attempts. Please wait a few minutes before trying again."));
        } else if (errCode === "UserNotConfirmedException") {
          reject(new Error("Account is not confirmed. Please check your email for confirmation instructions."));
        } else {
          reject(new Error(errMsg || "Sign in failed. Please check your credentials."));
        }
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        // Keep pendingUser intact for challenge completion
        reject(new NewPasswordRequiredError());
      },
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
      new Error("Your invitation session expired. Please sign in with your temporary password again."),
    );
  const challengeAttrs = (user as any).challengeParam?.requiredAttributes || [];
  const userAttributes: Record<string, string> = {};
  return authenticate((callbacks) => user.completeNewPasswordChallenge(password, userAttributes, callbacks));
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
  if (!email.trim()) {
    return Promise.reject(new Error("Please enter your work email address."));
  }
  const user = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool() });
  return new Promise((resolve, reject) =>
    user.forgotPassword({
      onSuccess: () => resolve(),
      inputVerificationCode: () => resolve(),
      onFailure: (err: any) => {
        const errCode = err?.code || "";
        const errMsg = err?.message || "";
        if (errCode === "UserNotFoundException") {
          // Resolve silently to prevent email enumeration, standard security practice
          resolve();
        } else if (errCode === "LimitExceededException") {
          reject(new Error("Too many reset attempts. Please wait a few minutes before trying again."));
        } else {
          reject(new Error(errMsg || "Unable to request password reset code."));
        }
      },
    }),
  );
}
export function resetPassword(email: string, code: string, password: string): Promise<void> {
  if (!email.trim()) {
    return Promise.reject(new Error("Please enter your work email address."));
  }
  const user = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool() });
  return new Promise((resolve, reject) =>
    user.confirmPassword(code.trim(), password, {
      onSuccess: () => resolve(),
      onFailure: (err: any) => {
        const errCode = err?.code || "";
        const errMsg = err?.message || "";
        if (errCode === "CodeMismatchException") {
          reject(
            new Error(
              "Invalid verification code. Note: If you received a temporary password from an admin, please use the main Sign In screen with your temporary password instead.",
            ),
          );
        } else if (errCode === "ExpiredCodeException") {
          reject(new Error("Verification code has expired. Please request a new code."));
        } else if (errCode === "InvalidPasswordException") {
          reject(
            new Error(
              "New password does not meet security requirements (use 12+ characters with uppercase, lowercase, number, and symbol).",
            ),
          );
        } else {
          reject(new Error(errMsg || "Unable to reset password. Please check your inputs."));
        }
      },
    }),
  );
}
