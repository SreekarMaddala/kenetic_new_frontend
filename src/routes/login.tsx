import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { NewPasswordRequiredError, forgotPassword, resetPassword, clearTokens } from "../lib/auth";
import { homeForRole } from "../lib/permissions";
import {
  ArrowUpRight,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  HardHat,
  Layers3,
  UsersRound,
} from "lucide-react";
import siteImage from "../assets/site-cranes.jpg";
import "../styles/login.css";

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
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (user) navigate({ to: homeForRole(user.role), replace: true });
  }, [user, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || isLoading) return;
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
  const title = {
    login: "Welcome back.",
    "new-password": "Make it yours.",
    forgot: "Let?s get you back.",
    reset: "A fresh start.",
  }[screen];
  const description = {
    login: "Your projects, people, and progress. All in one place.",
    "new-password": "Set a permanent password to activate your invited account.",
    forgot: "Enter your work email and we?ll send a password reset code.",
    reset: "Enter the code from your email and choose a new password.",
  }[screen];
  const action = {
    login: "Sign in to workspace",
    "new-password": "Activate account",
    forgot: "Send reset code",
    reset: "Reset password",
  }[screen];
  return (
    <main className="kinetic-login">
      <section className="login-story" aria-label="Kenetic construction workspace">
        <img
          src={siteImage}
          alt="Tower cranes above a building under construction"
          className="login-site-image"
        />
        <div className="login-image-shade" />
        <div className="login-blueprint" aria-hidden="true" />
        <a href="/" className="login-brand" aria-label="Kenetic ERP home">
          <img src="/logo.png" alt="" />
          <span>
            KENETIC<span className="login-brand-sub">CONSTRUCTION ERP</span>
          </span>
        </a>
        <div className="login-story-content">
          <div className="login-eyebrow">
            <span /> BUILT FOR THE BUILDERS
          </div>
          <h2>
            Big plans.
            <br />
            Real progress<span className="login-orange">.</span>
          </h2>
          <p>
            From the first blueprint to the final brick.
            <br className="hidden sm:block" /> Bring every part of your project together.
          </p>
          <div className="login-story-line" aria-hidden="true">
            <span />
            <ArrowUpRight size={26} />
          </div>
        </div>
        <div className="login-story-footer">
          <div className="login-capabilities">
            <span>
              <Layers3 size={16} /> Projects
            </span>
            <span>
              <UsersRound size={16} /> People
            </span>
            <span>
              <HardHat size={16} /> Site operations
            </span>
          </div>
          <span className="login-edition">ONE CONNECTED WORKSPACE</span>
        </div>
        <div className="login-corner-mark" aria-hidden="true">
          +
        </div>
      </section>

      <section className="login-access" aria-labelledby="login-title">
        <div className="login-access-top">
          <span className="login-workspace-tag">
            <span /> ORGANIZATION ACCESS
          </span>
          <span className="login-index" aria-hidden="true">
            01 / WORKSPACE
          </span>
        </div>
        <div className="login-form-wrap">
          <div className="login-welcome-icon" aria-hidden="true">
            <ArrowUpRight size={28} strokeWidth={1.6} />
          </div>
          <p className="login-form-eyebrow">LET?S BUILD SOMETHING GREAT</p>
          <h1 id="login-title">{title}</h1>
          <p className="login-description">{description}</p>
          <form onSubmit={submit} className="login-form">
            {(screen === "login" || screen === "forgot") && (
              <label className="login-field">
                Work email
                <div className="login-input-wrap">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    type="email"
                    autoComplete="username"
                    placeholder="you@company.com"
                    required
                    value={email}
                    disabled={busy}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>
            )}
            {screen === "reset" && (
              <label className="login-field">
                Verification code
                <div className="login-input-wrap">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    autoComplete="one-time-code"
                    placeholder="Enter your email code"
                    required
                    value={code}
                    disabled={busy}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </div>
              </label>
            )}
            {screen !== "forgot" && (
              <div className="login-field">
                <label htmlFor="login-password">
                  {choosePassword ? "New password" : "Password"}
                </label>
                <div className="login-input-wrap">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={choosePassword ? "new-password" : "current-password"}
                    placeholder={
                      choosePassword ? "Create a strong password" : "Enter your password"
                    }
                    required
                    minLength={choosePassword ? 12 : undefined}
                    value={password}
                    disabled={busy}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="login-reveal"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}
            {choosePassword && (
              <>
                <p className="login-password-help">
                  Use at least 12 characters with uppercase, lowercase, a number and a symbol.
                </p>
                <label className="login-field">
                  Confirm password
                  <div className="login-input-wrap">
                    <LockKeyhole size={18} aria-hidden="true" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter your password again"
                      required
                      value={confirmation}
                      disabled={busy}
                      onChange={(event) => setConfirmation(event.target.value)}
                    />
                  </div>
                </label>
              </>
            )}
            {(error || sessionError) && (
              <p role="alert" className="login-alert">
                {error || sessionError}
              </p>
            )}
            {notice && (
              <p role="status" className="login-notice">
                {notice}
              </p>
            )}
            <button disabled={busy || isLoading} className="login-submit">
              {busy ? (
                <>
                  <LoaderCircle className="login-spinner" size={19} /> Please wait?
                </>
              ) : (
                <>
                  {action}
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>
          <button
            type="button"
            disabled={busy}
            className="login-recovery"
            onClick={() => {
              clearTokens();
              setScreen(screen === "login" ? "forgot" : "login");
              setError("");
              setNotice("");
              setPassword("");
              setConfirmation("");
              setShowPassword(false);
            }}
          >
            {screen === "login" ? "Forgot your password?" : "? Back to sign in"}
          </button>
          <div className="login-invitation">
            <span>New to the team?</span>
            <p>Ask your organization administrator for an invitation to your workspace.</p>
          </div>
        </div>
        <footer className="login-access-footer">
          <span>
            <LockKeyhole size={13} /> Your organization. Your workspace.
          </span>
          <span>KENETIC ERP</span>
        </footer>
      </section>
    </main>
  );
}
