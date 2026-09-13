import { createFileRoute } from "@tanstack/react-router";
import { EmployeeAnalytics } from "../components/EmployeeAnalytics";

export const Route = createFileRoute("/analytics")({ component: EmployeeAnalytics });
