import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { confirmSignUp, signUp } from "../lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Kinetic ERP" },
      { name: "description", content: "Sign in to your Kinetic Construction ERP account." },
    ],
  }),
  component: LoginPage,
});

type Screen = "login" | "signup" | "confirm";

function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupEmail, setSignupEmail] = useState(""); // for confirm screen

  // Already authenticated → go to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      setSignupEmail(email.trim());
      setScreen("confirm");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmSignUp(signupEmail, code.trim());
      setEmail(signupEmail);
      setCode("");
      setScreen("login");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[hsl(22,90%,48%)] focus:bg-white/8 transition-colors";
  const labelCls = "block text-[11px] font-mono text-white/40 uppercase tracking-widest mb-1.5";
  const btnCls =
    "w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(22,90%,52%)] to-[hsl(22,90%,38%)] text-white font-semibold text-sm shadow-[0_0_32px_rgba(245,120,30,0.25)] hover:shadow-[0_0_48px_rgba(245,120,30,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080809] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[hsl(22,90%,48%)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080809] text-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,120,30,0.07) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 80% 80%, rgba(22,130,230,0.05) 0%, transparent 60%)",
        }}
      />
      {/* Animated grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            className="size-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(140deg, hsl(22 92% 54%), hsl(22 90% 36%))",
              boxShadow: "0 4px 20px hsl(22 90% 48% / 0.4)",
            }}
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none">
              <rect x="2.5" y="11" width="8" height="10" rx="0.8" fill="white" opacity="0.95" />
              <rect x="4.5" y="7" width="5" height="4.5" rx="0.6" fill="white" opacity="0.7" />
              <rect x="15" y="4" width="2.2" height="17" rx="0.6" fill="white" opacity="0.9" />
              <rect x="8" y="4" width="10" height="2" rx="0.5" fill="white" opacity="0.75" />
            </svg>
          </div>
          <div className="leading-none">
            <div className="font-bold text-lg tracking-tight" style={{ letterSpacing: "-0.025em" }}>
              KINETIC
            </div>
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-white/30">
              Construction ERP
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/8 p-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* ── Login ── */}
          {screen === "login" && (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-sm text-white/40 mt-1">Sign in to your Kinetic account</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className={inputCls}
                  />
                </div>
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <button id="login-submit" type="submit" disabled={loading} className={btnCls}>
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign In →"
                  )}
                </button>
              </form>
              <p className="text-center text-xs text-white/30 mt-5">
                Need access? Ask your organization administrator for an invitation.
              </p>
            </>
          )}

          {/* ── Sign Up ── */}
          {screen === "signup" && (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
                <p className="text-sm text-white/40 mt-1">Register your Kinetic ERP access</p>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rajesh Kumar"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Work Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className={inputCls}
                  />
                </div>
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <button id="signup-submit" type="submit" disabled={loading} className={btnCls}>
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create Account →"
                  )}
                </button>
              </form>
              <p className="text-center text-xs text-white/30 mt-5">
                Already have an account?{" "}
                <button
                  onClick={() => { setScreen("login"); setError(""); }}
                  className="text-[hsl(22,90%,58%)] hover:text-[hsl(22,90%,68%)] font-semibold transition-colors"
                >
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* ── Confirm OTP ── */}
          {screen === "confirm" && (
            <>
              <div className="mb-7">
                <div className="size-12 rounded-full bg-[hsl(22,90%,48%)]/10 border border-[hsl(22,90%,48%)]/20 flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" className="size-6 text-[hsl(22,90%,58%)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
                <p className="text-sm text-white/40 mt-1">
                  We sent a 6-digit code to <span className="text-white/60 font-medium">{signupEmail}</span>
                </p>
              </div>
              <form onSubmit={handleConfirm} className="space-y-4">
                <div>
                  <label className={labelCls}>Confirmation Code</label>
                  <input
                    id="confirm-code"
                    type="text"
                    required
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className={`${inputCls} tracking-[0.3em] text-center text-lg`}
                  />
                </div>
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <button id="confirm-submit" type="submit" disabled={loading} className={btnCls}>
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Confirming…
                    </>
                  ) : (
                    "Confirm Account →"
                  )}
                </button>
              </form>
              <p className="text-center text-xs text-white/30 mt-5">
                Wrong email?{" "}
                <button
                  onClick={() => { setScreen("signup"); setError(""); }}
                  className="text-[hsl(22,90%,58%)] font-semibold transition-colors"
                >
                  Go back
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-white/20 mt-6 font-mono">
          © {new Date().getFullYear()} Kinetic Construction ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
