import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { NewPasswordRequiredError, forgotPassword, resetPassword, clearTokens } from "../lib/auth";
import { homeForRole } from "../lib/permissions";
import { ArrowRight, Eye, EyeOff, Info, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import siteImage from "../assets/image.png";
import "../styles/login.css";

export const Route = createFileRoute("/login")({ component: LoginPage });
type Screen = "invite" | "login" | "new-password" | "forgot" | "reset";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useEffect(() => { setFieldErrors({}); }, [screen]);
  function fieldFeedback(id: string) {
    return fieldErrors[id] ? (
      <span id={`${id}-error`} className="login-field-error" role="alert">
        <Info size={14} aria-hidden="true" /> {fieldErrors[id]}
      </span>
    ) : null;
  }
  function validationProps(id: string) {
    return {
      id,
      "aria-invalid": Boolean(fieldErrors[id]),
      "aria-describedby": fieldErrors[id] ? `${id}-error` : undefined,
      onInput: () => setFieldErrors((current) => ({ ...current, [id]: "" })),
    };
  }
  useEffect(() => {
    if (user) navigate({ to: homeForRole(user.role), replace: true });
  }, [user, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || isLoading) return;
    const errors: Record<string, string> = {};
    const inputs = Array.from(event.currentTarget.querySelectorAll("input"));
    for (const input of inputs) {
      if (input.validity.valueMissing || (input.id === "login-code" && !input.value.trim())) {
        errors[input.id] = {
          "login-email": "Enter your work email to continue.",
          "login-password": "Enter your password to continue.",
          "login-code": "Enter the verification code from your email.",
          "login-confirmation": "Re-enter your new password.",
        }[input.id] || "Complete this field.";
      } else if (input.validity.typeMismatch) {
        errors[input.id] = "Use a valid email, like you@company.com.";
      }
    }
    if (screen === "new-password" || screen === "reset") {
      if (password && password.length < 12)
        errors["login-password"] = "Use at least 12 characters for your new password.";
      if (confirmation && password !== confirmation)
        errors["login-confirmation"] = "Passwords do not match. Try again.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      inputs.find((input) => errors[input.id])?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if ((screen === "new-password" || screen === "reset") && password !== confirmation)
        throw new Error("Passwords do not match.");
      if (screen === "login" || screen === "invite") await login(email, password);
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
    invite: "Activate your account.",
    login: "Sign In",
    "new-password": "Set your password",
    forgot: "Reset your password",
    reset: "Choose a new password",
  }[screen];
  const description = {
    invite:
      "Use the temporary password from your latest invitation email.",
    login: "Sign in to your workspace.",
    "new-password": "Set a permanent password to activate your invited account.",
    forgot: "Enter your work email and we'll send a password reset code.",
    reset: "Enter the code from your email and choose a new password.",
  }[screen];
  const action = {
    invite: "Continue to set password",
    login: "Sign in",
    "new-password": "Activate account",
    forgot: "Send reset code",
    reset: "Reset password",
  }[screen];
  return (
    <main className="kinetic-login">
      <section className="login-story" aria-label="Kenetic construction workspace">
        <a href="/" className="login-brand" aria-label="Kenetic home">
          <img src="/logo.png" alt="" />
          <span>
            Kenetic<span className="login-brand-sub">Construction management</span>
          </span>
        </a>
        <div className="login-story-content">
          <h2>
            Every working day,
            <br />
            in one place.
          </h2>
          <p>
            Your projects, site records and team, together.
          </p>
        </div>
        <img
          src={siteImage}
          alt="Cranes above an active construction site"
          className="login-site-image"
        />
        <div className="login-story-footer">Kenetic - Construction operations</div>
      </section>

      <section className="login-access" aria-labelledby="login-title">
        <div className="login-access-top">
          <span className="login-workspace-tag">
            <span /> Workspace access
          </span>
          <span className="login-index" aria-hidden="true"></span>
        </div>
        <div className="login-form-wrap">
          <header className="login-form-header">
            <h1 id="login-title">{title}</h1>
            {screen !== "login" && <p className="login-description">{description}</p>}
          </header>
          <form onSubmit={submit} className="login-form" noValidate>
            {(screen === "login" ||
              screen === "invite" ||
              screen === "forgot" ||
              screen === "reset") && (
              <label className="login-field">
                Work email
                <div className="login-input-wrap">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    type="email"
                    {...validationProps("login-email")}
                    autoComplete="username"
                    placeholder="you@company.com"
                    required
                    value={email}
                    disabled={busy}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                {fieldFeedback("login-email")}
              </label>
            )}
            {screen === "reset" && (
              <label className="login-field">
                Verification code
                <div className="login-input-wrap">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    autoComplete="one-time-code"
                    {...validationProps("login-code")}
                    placeholder="Enter your email verification code"
                    required
                    value={code}
                    disabled={busy}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </div>
                {fieldFeedback("login-code")}
              </label>
            )}
            {screen !== "forgot" && (
              <div className="login-field">
                <label htmlFor="login-password">
                  {choosePassword
                    ? "New password"
                    : screen === "invite"
                      ? "Temporary password"
                      : "Password"}
                </label>
                <div className="login-input-wrap">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    {...validationProps("login-password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete={choosePassword ? "new-password" : "current-password"}
                    placeholder={
                      choosePassword
                        ? "Create a strong password"
                        : screen === "invite"
                          ? "Enter your invitation password"
                          : "Enter your password"
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
                {fieldFeedback("login-password")}
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
                      {...validationProps("login-confirmation")}
                      placeholder="Enter your password again"
                      required
                      value={confirmation}
                      disabled={busy}
                      onChange={(event) => setConfirmation(event.target.value)}
                    />
                  </div>
                  {fieldFeedback("login-confirmation")}
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
                  <LoaderCircle className="login-spinner" size={19} /> Please wait…
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
            {screen === "login" ? "Forgot your password?" : "Back to sign in"}
          </button>
          <div className="login-invitation">
            {(screen === "login" || screen === "invite") && (
              <button
                type="button"
                disabled={busy || isLoading}
                className="login-recovery"
                onClick={() => {
                  clearTokens();
                  setScreen(screen === "invite" ? "login" : "invite");
                  setPassword("");
                  setConfirmation("");
                  setError("");
                  setNotice("");
                  setShowPassword(false);
                }}
              >
                {screen === "invite"
                  ? "Sign in instead"
                  : "Activate account"}
              </button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="login-info">
                  <Info size={16} aria-hidden="true" /> Access help
                </button>
              </PopoverTrigger>
              <PopoverContent className="login-help-popover" side="top" align="end" sideOffset={10}>
                <h2>Need an invitation?</h2>
                <p>Ask your organization administrator to invite you, then select Activate account.</p>
                <h2>Temporary password not working?</h2>
                <p>Ask your administrator to resend the invitation and use the latest email.</p>
              </PopoverContent>
            </Popover>
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
