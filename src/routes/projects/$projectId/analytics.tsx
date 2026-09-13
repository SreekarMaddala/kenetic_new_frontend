import { createFileRoute } from "@tanstack/react-router";
import { EmployeeAnalytics } from "../../../components/EmployeeAnalytics";

export const Route = createFileRoute("/projects/$projectId/analytics")({ component: Page });
function Page() {
  return <EmployeeAnalytics projectId={Route.useParams().projectId} />;
}
