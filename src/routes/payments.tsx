import { createFileRoute } from "@tanstack/react-router";
import { PaymentLedger } from "../components/FinanceLedgers";
export const Route = createFileRoute("/payments")({ component: PaymentLedger });
