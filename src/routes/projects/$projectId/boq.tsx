import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId/boq")({ component: Page });

function Page() {
  const { projectId } = Route.useParams();
  return <Navigate to="/projects/$projectId/subcontractors" params={{ projectId }} replace />;
}

