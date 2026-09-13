import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { NewPasswordRequiredError, forgotPassword, resetPassword, clearTokens } from "../lib/auth";
import { homeForRole } from "../lib/permissions";

export const Route = createFileRoute("/login")({ component: LoginPage });
type Screen = "login" | "new-password" | "forgot" | "reset";

function LoginPage() {
  const { user, login, completeInvitation, isLoading, error: sessionError } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) navigate({ to: homeForRole(user.role), replace: true });
  }, [user, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if ((screen === "new-password" || screen === "reset") && password !== confirmation)
        throw new Error("Passwords do not match.");
      if (screen === "login") await login(email, password);
      else if (screen === "new-password") await completeInvitation(password);
      else if (screen === "forgot") {
        await forgotPassword(email);
        setScreen("reset");
        setPassword("");
        setNotice(
          "If this account can be recovered, a verification code has been sent to its email address.",
        );
      } else {
        await resetPassword(email, code.trim(), password);
        setScreen("login");
        setPassword("");
        setNotice("Password updated. Sign in with your new password.");
      }
    } catch (err) {
      if (err instanceof NewPasswordRequiredError) {
        setScreen("new-password");
        setPassword("");
        setConfirmation("");
      } else setError(err instanceof Error ? err.message : "Unable to complete this request.");
    } finally {
      setBusy(false);
    }
  }
  const choosePassword = screen === "new-password" || screen === "reset";
  const input =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500";
  const title = {
    login: "Sign in",
    "new-password": "Activate your account",
    forgot: "Forgot password",
    reset: "Reset password",
  }[screen];
  return (
    <main className="min-h-screen bg-[#080809] text-white grid place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center gap-3 mb-8">
          <img
            src="/logo.png"
            alt="Kenetic Logo"
            className="size-16 rounded-2xl object-cover shadow-2xl border border-white/20"
          />
          <p className="text-orange-500 font-bold tracking-[0.25em] text-center">KENETIC ERP</p>
        </div>
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <p className="text-sm text-white/50 mb-6">
            {screen === "new-password"
              ? "Set your permanent password to finish accepting your invitation."
              : "Use your organization account to access your workspace."}
          </p>
          <form onSubmit={submit} className="space-y-4">
            {(screen === "login" || screen === "forgot") && (
              <label className="block text-sm space-y-2">
                Email
                <input
                  className={input}
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {screen === "reset" && (
              <label className="block text-sm space-y-2">
                Verification code
                <input
                  className={input}
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            )}
            {screen !== "forgot" && (
              <label className="block text-sm space-y-2">
                {choosePassword ? "New password" : "Password"}
                <input
                  className={input}
                  type="password"
                  autoComplete={choosePassword ? "new-password" : "current-password"}
                  required
                  minLength={choosePassword ? 12 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            {choosePassword && (
              <>
                <p className="text-xs text-white/50">
                  Use at least 12 characters with uppercase, lowercase, a number and a symbol.
                </p>
                <label className="block text-sm space-y-2">
                  Confirm password
                  <input
                    className={input}
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
              </>
            )}
            {(error || sessionError) && (
              <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                {error || sessionError}
              </p>
            )}
            {notice && (
              <p role="status" className="text-sm text-green-300">
                {notice}
              </p>
            )}
            <button
              disabled={busy || isLoading}
              className="w-full rounded-xl bg-orange-600 py-3 font-semibold disabled:opacity-50"
            >
              {busy ? "Please wait…" : title}
            </button>
          </form>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              clearTokens();
              setScreen(screen === "login" ? "forgot" : "login");
              setError("");
              setPassword("");
            }}
            className="mt-5 text-sm text-orange-400"
          >
            {screen === "login" ? "Forgot password?" : "Back to sign in"}
          </button>
          <p className="text-xs text-white/40 mt-6">
            Need access? Ask your organization administrator for an invitation.
          </p>
        </section>
      </div>
    </main>
  );
}
