import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "../components/AppShell";
import { ProjectProvider } from "../lib/ProjectContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { canAccessRoute, homeForRole } from "../lib/permissions";
import { Toaster } from "sonner";

// Routes that never need authentication
const PUBLIC_PATHS = ["/", "/login"];

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-2 text-4xl font-display font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The screen you're looking for doesn't exist in this workspace.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-zinc-800 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          System Error
        </p>
        <h1 className="mt-2 text-2xl font-display font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try again, or head back to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/** Redirects to /login when unauthenticated on a protected route */
function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const permitted = !!user && canAccessRoute(user.role, pathname.replace(/\/$/, ""));

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isPublic) {
      navigate({ to: "/login" });
    } else if (user && !isPublic && !permitted) {
      navigate({ to: homeForRole(user.role), replace: true });
    }
  }, [isAuthenticated, isLoading, pathname, navigate, user, isPublic, permitted]);

  // Marketing and login routes must never be held hostage by a stale Cognito
  // session or a temporarily unreachable identity provider.
  if (isPublic) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
    );
  }

  return isAuthenticated && permitted ? <>{children}</> : null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = PUBLIC_PATHS.includes(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors />
      <AuthProvider>
        <AuthGuard>
          {isPublic ? (
            <Outlet />
          ) : (
            <ProjectProvider>
              <AppShell>
                <Outlet />
              </AppShell>
            </ProjectProvider>
          )}
        </AuthGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}
