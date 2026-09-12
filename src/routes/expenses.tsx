import { createFileRoute } from "@tanstack/react-router";
import { GlobalExpenseLedger } from "../components/FinanceLedgers";
export const Route = createFileRoute("/expenses")({ component: GlobalExpenseLedger });
