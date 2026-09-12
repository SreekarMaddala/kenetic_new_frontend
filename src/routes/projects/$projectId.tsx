import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { useProject } from "../../lib/ProjectContext";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectLayout,
});

function ProjectLayout() {
  const { project, isLoading } = useProject();

  if (isLoading && !project) {
    return (
      <div className="p-8 text-center py-20 text-muted-foreground font-mono text-xs animate-pulse">
        Loading project workspace...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/projects"
            className="size-8 rounded-full border border-border bg-background grid place-items-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <span className="text-xs text-muted-foreground font-mono uppercase">
            Back to Portfolio
          </span>
        </div>
        <div className="text-center py-20 text-muted-foreground">Project not found</div>
      </div>
    );
  }

  // We only show the "Back to Portfolio" and Project Header if we are NOT on the index page
  // Actually, we can just render the Outlet and let the children define their headers,
  // or we can put a sticky header here. For now, let's just render the Outlet.
  // The AppShell sidebar will handle the project context.

  return (
    <div className="w-full">
      <Outlet />
    </div>
  );
}
