import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep existing bookmarks working after consolidating warehouse operations.
export const Route = createFileRoute("/projects/$projectId/warehouse")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/projects/$projectId/materials", params });
  },
});
