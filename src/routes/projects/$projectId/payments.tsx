import { createFileRoute } from "@tanstack/react-router";
import { PaymentLedger } from "../../../components/FinanceLedgers";
export const Route = createFileRoute("/projects/$projectId/payments")({ component: PaymentLedger });
