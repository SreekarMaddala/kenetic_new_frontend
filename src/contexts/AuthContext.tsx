/**
 * src/contexts/AuthContext.tsx
 * React context for Cognito auth state.
 * Provides: user, isAuthenticated, isLoading, login(), logout()
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { signIn, signOut, getCurrentUser, completeNewPassword, type AuthUser } from "../lib/auth";
import { useQueryClient } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  completeInvitation: (password: string) => Promise<void>;
  error: string | null;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const authUser = await signIn(email, password);
      queryClient.clear();
      setError(null);
      setUser(authUser);
    },
    [queryClient],
  );

  const completeInvitation = useCallback(
    async (password: string) => {
      const authUser = await completeNewPassword(password);
      queryClient.clear();
      setError(null);
      setUser(authUser);
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    signOut();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        completeInvitation,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
